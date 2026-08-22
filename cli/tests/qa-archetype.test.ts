import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import {
  resolveArchetype,
  engineerRoleForTaskType,
  ENGINEER_ROLE_FOR_TASK_TYPE,
  assertRejectionRoutingResolvable,
  type ArchetypeStep,
} from "../src/archetype-resolver";

const ROOT = dirname(dirname(import.meta.dir));
const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");
const registry = () => JSON.parse(read(".nit/registry/task-types.json")).types;
const stepIds = (steps: ArchetypeStep[]) => steps.map((s) => s.id);

// AC-1 — the gap this task was filed for: no archetype's implement step reached
// the qa engineer, so a qa task was implemented by whichever specialist its
// archetype happened to name.
describe("a qa task reaches the qa engineer", () => {
  test("qa-setup defers the engineer to the task's type", async () => {
    const resolved = await resolveArchetype("qa-setup");
    const implement = (resolved.steps as ArchetypeStep[]).find((s) => s.id === "implement")!;
    expect(implement.role).toBe("$detect");
  });

  test("which resolves to the qa engineer for a qa task", () => {
    expect(engineerRoleForTaskType("qa", "implement")).toBe("qa");
  });

  test("the qa engineer has an agent definition to dispatch to", () => {
    expect(read(".claude/agents/qa.md")).toContain("qa");
  });
});

// AC-3 — the registry entry a qa task looks up must name this archetype.
describe("the registry points a qa task at it", () => {
  test("qa's defaultArchetype is qa-setup", () => {
    expect(registry().find((t: { id: string }) => t.id === "qa").defaultArchetype).toBe("qa-setup");
  });

  test("nit:init's template says the same", () => {
    const skill = read(".claude/skills/init/SKILL.md");
    const after = skill.slice(skill.indexOf("### 5a — task-types.json"));
    const template = JSON.parse(after.match(/```json\n([\s\S]*?)\n```/)![1]!);
    expect(template).toEqual({ types: registry() });
  });

  test("the skills that propose archetypes know it exists", () => {
    expect(read(".claude/skills/create-tasks/SKILL.md")).toContain("`qa-setup`");
    expect(read(".claude/skills/analyze/SKILL.md")).toContain("`qa-setup`");
  });
});

// AC-2 — the invariant, rather than a check of one type.
describe("every task type's engineer is reachable", () => {
  async function reachableRoles(): Promise<Set<string>> {
    const roles = new Set<string>();
    const names = readdirSync(join(ROOT, "cli/archetypes"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length))
      .filter((name) => !JSON.parse(read(`cli/archetypes/${name}.json`)).abstract);

    for (const name of names) {
      const resolved = await resolveArchetype(name);
      for (const step of resolved.steps as ArchetypeStep[]) {
        if (step.id !== "implement") continue;
        if (step.role === "$detect") {
          for (const role of Object.values(ENGINEER_ROLE_FOR_TASK_TYPE)) roles.add(role);
        } else {
          roles.add(step.role);
        }
      }
    }
    return roles;
  }

  test.each(Object.entries(ENGINEER_ROLE_FOR_TASK_TYPE))(
    "a %s task's engineer (%s) is reachable from some archetype",
    async (_type, role) => {
      expect([...(await reachableRoles())]).toContain(role);
    }
  );

  test("and reachable from the archetype its own type defaults to", async () => {
    for (const entry of registry()) {
      const resolved = await resolveArchetype(entry.defaultArchetype);
      const implement = (resolved.steps as ArchetypeStep[]).find((s) => s.id === "implement")!;
      const role =
        implement.role === "$detect" ? engineerRoleForTaskType(entry.id, "implement") : implement.role;
      expect(role).toBe(ENGINEER_ROLE_FOR_TASK_TYPE[entry.id]!);
    }
  });
});

describe("qa-setup's step sequence", () => {
  // The qa step exists so someone other than the author exercises the criteria.
  // For a qa-type task the implement step is already the qa engineer, so the
  // step would be that agent checking its own work — the independence is what
  // the step is for, and without it the step is ceremony. Review, by the
  // reviewer, remains an independent check.
  test("it stops after review: a qa step here would be self-verification", async () => {
    const resolved = await resolveArchetype("qa-setup");
    expect(stepIds(resolved.steps as ArchetypeStep[])).toEqual([
      "analyze",
      "design",
      "implement",
      "review",
    ]);
  });

  test("the independent check that remains is the reviewer's", async () => {
    const resolved = await resolveArchetype("qa-setup");
    const review = (resolved.steps as ArchetypeStep[]).find((s) => s.id === "review")!;
    expect(review.role).toBe("reviewer");
    expect(review.approval).toBe(true);
  });

  // Removing a step orphans any rejection-routing entry that targeted it, which
  // resolves cleanly and then breaks at reject time (TASK-027).
  test("its rejection routing names only steps it has", async () => {
    const resolved = await resolveArchetype("qa-setup");
    const ids = new Set(stepIds(resolved.steps as ArchetypeStep[]));
    for (const [from, to] of Object.entries(resolved.rejectionRouting ?? {})) {
      expect(ids.has(from)).toBe(true);
      expect(ids.has(to as string)).toBe(true);
    }
  });

  test("rejecting the review step reopens implement", async () => {
    const resolved = await resolveArchetype("qa-setup");
    expect(resolved.rejectionRouting!.review).toBe("implement");
  });

  test("the resolver accepts its routing", async () => {
    const resolved = await resolveArchetype("qa-setup");
    expect(() =>
      assertRejectionRoutingResolvable(
        "qa-setup",
        resolved.rejectionRouting ?? {},
        resolved.steps as ArchetypeStep[]
      )
    ).not.toThrow();
  });
});

// A distinct archetype earns its place by behaving differently, not by being
// named differently. This is the difference.
describe("qa-setup is not infra-change under another name", () => {
  test("infra-change keeps its qa step", async () => {
    const resolved = await resolveArchetype("infra-change");
    expect(stepIds(resolved.steps as ArchetypeStep[])).toContain("qa");
  });

  test("qa-setup does not", async () => {
    const resolved = await resolveArchetype("qa-setup");
    expect(stepIds(resolved.steps as ArchetypeStep[])).not.toContain("qa");
  });

  test("a devops task still defaults to infra-change", () => {
    expect(registry().find((t: { id: string }) => t.id === "devops").defaultArchetype).toBe(
      "infra-change"
    );
  });
});

// Every step qa-setup dispatches needs a skill, or the archetype is proposable
// and undispatchable — the defect TASK-036 closed for the others.
describe("every step qa-setup dispatches has a skill", () => {
  test("each step id resolves to a SKILL.md", async () => {
    const resolved = await resolveArchetype("qa-setup");
    for (const step of resolved.steps as ArchetypeStep[]) {
      expect(() => read(`.claude/skills/${step.id}/SKILL.md`)).not.toThrow();
    }
  });
});
