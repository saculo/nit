import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import {
  resolveArchetype,
  engineerRoleForTaskType,
  ENGINEER_ROLE_FOR_TASK_TYPE,
  type ArchetypeStep,
} from "../src/archetype-resolver";
import { createAjv } from "../src/ajv";
import { resolveSchema } from "../src/schema-resolver";

const ROOT = dirname(dirname(import.meta.dir));

interface TaskType {
  id: string;
  label: string;
  description?: string;
  defaultArchetype: string;
}

const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");
const registry = (): TaskType[] => JSON.parse(read(".nit/registry/task-types.json")).types;
const taskTypeEnum = (): string[] =>
  JSON.parse(read("cli/schemas/task.schema.json")).properties.type.enum;

/** The archetypes a project can actually be given. */
const shippedArchetypes = (): string[] =>
  readdirSync(join(ROOT, "cli/archetypes"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .filter((name) => !JSON.parse(read(`cli/archetypes/${name}.json`)).abstract);

/** The template nit:init writes, extracted from the skill that writes it. */
function initTemplate(): { types: TaskType[] } {
  const skill = read(".claude/skills/init/SKILL.md");
  const after = skill.slice(skill.indexOf("### 5a — task-types.json"));
  const fence = after.match(/```json\n([\s\S]*?)\n```/);
  return JSON.parse(fence![1]!);
}

// AC-1 — the lookup nit:tasks performs is by task type. Keyed by archetype id,
// as it was, every lookup missed and the Archetype Proposal silently had no
// default to start from.
describe("the registry is keyed by task type", () => {
  test("every task type the schema allows has an entry", () => {
    expect(registry().map((t) => t.id).sort()).toEqual([...taskTypeEnum()].sort());
  });

  test("no entry is keyed by an archetype id", () => {
    const archetypes = shippedArchetypes();
    for (const type of registry()) {
      expect(archetypes).not.toContain(type.id);
    }
  });

  test("each entry carries a defaultArchetype", () => {
    for (const type of registry()) expect(type.defaultArchetype).toBeTruthy();
  });

  test("every defaultArchetype names a shipped, non-abstract archetype", () => {
    const archetypes = shippedArchetypes();
    for (const type of registry()) expect(archetypes).toContain(type.defaultArchetype);
  });

  test("the registry validates", () => {
    const validate = createAjv().compile(require(resolveSchema("task-types")!));
    expect(validate(JSON.parse(read(".nit/registry/task-types.json")))).toBe(true);
  });

  // Without this the field is optional, and an entry can exist while giving the
  // Archetype Proposal nothing to start from — the same failure, one level down.
  test("the schema requires a defaultArchetype rather than hoping for one", () => {
    const schema = JSON.parse(read("cli/schemas/task-types.schema.json"));
    expect(schema.properties.types.items.required).toContain("defaultArchetype");
  });

  test("an entry with no defaultArchetype is rejected", () => {
    const validate = createAjv().compile(require(resolveSchema("task-types")!));
    expect(validate({ types: [{ id: "backend", label: "Backend" }] })).toBe(false);
  });
});

// AC-3 — the point of the default: a task of each type reaches the engineer its
// type implies. A default archetype that dispatched to the wrong specialist
// would be worse than none, because nothing downstream would question it.
describe("each type's default archetype reaches that type's engineer", () => {
  test.each(taskTypeEnum())("a %s task's default archetype implements with its own engineer", async (type) => {
    const entry = registry().find((t) => t.id === type)!;
    const resolved = await resolveArchetype(entry.defaultArchetype);
    const implement = (resolved.steps as ArchetypeStep[]).find((s) => s.id === "implement")!;
    // A fixed role must already be the right one; `$detect` resolves from the
    // task's type, which is the same answer by a different route.
    const role = implement.role === "$detect" ? engineerRoleForTaskType(type, "implement") : implement.role;
    expect(role).toBe(ENGINEER_ROLE_FOR_TASK_TYPE[type]!);
  });

  // The gap TASK-033 names. `infra-change` hardcoded `infra-engineer`, so a qa
  // task routed there was implemented by the infrastructure engineer and the qa
  // agent was never reachable from any archetype.
  test("a qa task reaches the qa engineer", async () => {
    const entry = registry().find((t) => t.id === "qa")!;
    const resolved = await resolveArchetype(entry.defaultArchetype);
    const implement = (resolved.steps as ArchetypeStep[]).find((s) => s.id === "implement")!;
    expect(implement.role).toBe("$detect");
    expect(engineerRoleForTaskType("qa", "implement")).toBe("qa");
  });

  test("a devops task still reaches the infrastructure engineer", async () => {
    expect(engineerRoleForTaskType("devops", "implement")).toBe("infra-engineer");
  });

  test("every engineer role the resolver knows is reachable from some archetype", async () => {
    const reachable = new Set<string>();
    for (const name of shippedArchetypes()) {
      const resolved = await resolveArchetype(name);
      for (const step of resolved.steps as ArchetypeStep[]) {
        if (step.id !== "implement") continue;
        if (step.role === "$detect") {
          for (const role of Object.values(ENGINEER_ROLE_FOR_TASK_TYPE)) reachable.add(role);
        } else {
          reachable.add(step.role);
        }
      }
    }
    for (const role of Object.values(ENGINEER_ROLE_FOR_TASK_TYPE)) {
      expect([...reachable]).toContain(role);
    }
  });
});

// AC-2 — a template that disagrees with the shipped registry ships the defect
// into every new workspace, which is what TASK-026 exists to prevent.
describe("nit:init writes the same registry", () => {
  test("its template matches the workspace registry", () => {
    expect(initTemplate()).toEqual({ types: registry() });
  });

  test("its template validates", () => {
    const validate = createAjv().compile(require(resolveSchema("task-types")!));
    expect(validate(initTemplate())).toBe(true);
  });

  test("it says the ids are task types, not archetype ids", () => {
    const skill = read(".claude/skills/init/SKILL.md");
    const section = skill.slice(skill.indexOf("### 5a — task-types.json"), skill.indexOf("### 5b"));
    expect(section).toMatch(/task types/i);
    expect(section).toContain("task.schema.json");
  });
});

describe("the skills that read it agree", () => {
  test("nit:tasks looks up the task's type", () => {
    expect(read(".claude/skills/create-tasks/SKILL.md")).toContain(
      "Look up the task's `type` in `.nit/registry/task-types.json`"
    );
  });

  test("every task type nit:tasks documents is a type the schema allows", () => {
    const skill = read(".claude/skills/create-tasks/SKILL.md");
    for (const type of taskTypeEnum()) {
      expect(skill).toContain(`**${type}**`);
    }
  });

  test("nit:analyze reads the same registry for the same reason", () => {
    expect(read(".claude/skills/analyze/SKILL.md")).toContain("task-types.json");
  });
});

// RV-1 — making a role *reachable* is not the same as making it dispatchable.
// The qa engineer was unreachable from every archetype, so nothing had ever
// exercised the rest of its path: an agent definition, a roles entry, and a
// routing rule. Reaching it without those would fail at dispatch instead of at
// proposal, which is later and harder to read.
describe("every engineer a task type implies is dispatchable", () => {
  const roles = (): string[] => JSON.parse(read(".nit/registry/roles.json")).roles.map((r: { id: string }) => r.id);
  const routed = (): string[] => JSON.parse(read(".nit/config/role-routing.json")).rules.map((r: { role: string }) => r.role);

  test.each(Object.entries(ENGINEER_ROLE_FOR_TASK_TYPE))("a %s task's engineer (%s) has an agent definition", (_type, role) => {
    expect(existsSync(join(ROOT, ".claude/agents", `${role}.md`))).toBe(true);
  });

  test.each(Object.values(ENGINEER_ROLE_FOR_TASK_TYPE))("%s is a registered role", (role) => {
    expect(roles()).toContain(role);
  });

  test.each(Object.values(ENGINEER_ROLE_FOR_TASK_TYPE))("%s has a routing rule that includes the implement skill", (role) => {
    expect(routed()).toContain(role);
    const rule = JSON.parse(read(".nit/config/role-routing.json")).rules.find(
      (r: { role: string }) => r.role === role
    );
    expect(rule.skills).toContain("implement");
  });
});
