import { describe, expect, test } from "bun:test";
import { join, dirname } from "path";
import {
  resolveRouting,
  orderedSkillList,
  baseSkillForStep,
  skillFileExists,
  skillFilePath,
  type ModuleEntry,
} from "../src/routing-resolver";
import { resolveArchetype } from "../src/archetype-resolver";
import { resolveSchema } from "../src/schema-resolver";
import { createAjv } from "../src/ajv";

const CLI_PATH = join(dirname(import.meta.path), "..", "src", "cli.ts");

// Skills treated as "present" in the unit tests. `go` is deliberately absent so
// AC-4 exercises graceful dropping of a missing language skill.
const AVAILABLE = new Set([
  "java",
  "typescript",
  "spring-boot",
  "nestjs",
  "ddd",
  "security-checklist",
  "code-conventions",
]);
const skillExists = (name: string) => AVAILABLE.has(name);

const apiModule: ModuleEntry = {
  name: "api",
  languageId: "java",
  customSkills: ["spring-boot", "ddd"],
  stepOverrides: { review: { addSkills: ["security-checklist"] } },
};
const moduleA: ModuleEntry = { name: "a", languageId: "java", customSkills: ["spring-boot"] };
const moduleB: ModuleEntry = { name: "b", languageId: "typescript", customSkills: ["nestjs"] };
const goModule: ModuleEntry = { name: "svc", languageId: "go" };
const registry = { globalCustomSkills: [{ id: "code-conventions" }] };

function routingIsSchemaValid(routing: unknown): boolean {
  const schemaPath = resolveSchema("routing");
  const schema = require(schemaPath!);
  const ajv = createAjv();
  return ajv.compile(schema)(routing);
}

describe("resolveRouting", () => {
  // AC-1
  test("resolves base + language + custom skills in layer order at the implement step", () => {
    const routing = resolveRouting({
      taskId: "TASK-014",
      step: "implement",
      modules: [apiModule],
      skillExists,
    });
    expect(routing.baseSkill).toBe("nit:implement");
    expect(routing.languageSkill).toBe("java");
    expect(routing.customSkills).toEqual(["spring-boot", "ddd"]);
    expect(orderedSkillList(routing)).toEqual(["nit:implement", "java", "spring-boot", "ddd"]);
    expect(routingIsSchemaValid(routing)).toBe(true);
  });

  // AC-2
  test("merges step-override addSkills into the custom layer at the review step", () => {
    const routing = resolveRouting({
      taskId: "TASK-014",
      step: "review",
      modules: [apiModule],
      skillExists,
    });
    expect(routing.baseSkill).toBe("nit:review");
    expect(routing.languageSkill).toBe("java");
    expect(routing.customSkills).toContain("security-checklist");
    expect(routing.customSkills).toEqual(["spring-boot", "ddd", "security-checklist"]);
  });

  // AC-3
  test("unions language and custom skills across modules for a cross-module task", () => {
    const routing = resolveRouting({
      taskId: "TASK-014",
      step: "implement",
      modules: [moduleA, moduleB],
      skillExists,
    });
    expect(routing.baseSkill).toBe("nit:implement");
    expect(routing.languageSkill).toBe("java");
    expect(orderedSkillList(routing)).toEqual([
      "nit:implement",
      "java",
      "typescript",
      "spring-boot",
      "nestjs",
    ]);
  });

  // AC-4
  test("drops a language skill whose SKILL.md is missing without error", () => {
    const routing = resolveRouting({
      taskId: "TASK-014",
      step: "implement",
      modules: [goModule],
      skillExists,
    });
    expect(routing.baseSkill).toBe("nit:implement");
    expect(routing.languageSkill).toBeUndefined();
    expect(orderedSkillList(routing)).toEqual(["nit:implement"]);
    expect(routingIsSchemaValid(routing)).toBe(true);
  });

  // AC-5
  test("includes global custom skills from the registry", () => {
    const routing = resolveRouting({
      taskId: "TASK-014",
      step: "implement",
      modules: [apiModule],
      registry,
      skillExists,
    });
    expect(routing.globalSkills).toEqual(["code-conventions"]);
    expect(orderedSkillList(routing)).toContain("code-conventions");
  });

  test("baseSkillForStep derives nit:<stepId> by convention", () => {
    expect(baseSkillForStep("design")).toBe("nit:design");
    expect(baseSkillForStep("qa")).toBe("nit:qa");
  });

  test("throws when no target module is provided", () => {
    expect(() =>
      resolveRouting({ taskId: "T", step: "implement", modules: [], skillExists })
    ).toThrow("at least one target module");
  });

  test("drops missing custom and global skills too", () => {
    const routing = resolveRouting({
      taskId: "T",
      step: "implement",
      modules: [{ name: "m", languageId: "java", customSkills: ["does-not-exist"] }],
      registry: { globalCustomSkills: [{ id: "also-missing" }] },
      skillExists,
    });
    expect(routing.languageSkill).toBe("java");
    expect(routing.customSkills).toBeUndefined();
    expect(routing.globalSkills).toBeUndefined();
  });

  test("dedupes a custom skill shared across cross-module targets", () => {
    const routing = resolveRouting({
      taskId: "T",
      step: "implement",
      modules: [
        { name: "a", languageId: "java", customSkills: ["ddd"] },
        { name: "b", languageId: "typescript", customSkills: ["ddd"] },
      ],
      skillExists,
    });
    // ddd appears once; typescript folded in as a secondary language
    expect(orderedSkillList(routing)).toEqual(["nit:implement", "java", "typescript", "ddd"]);
  });
});

async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

describe("nit route (command)", () => {
  test("exits 2 when required flags are missing", async () => {
    const { exitCode, stderr } = await runCli(["route", "--task", "TASK-014"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Usage");
  });

  test("exits 1 with an init hint when the module registry is absent", async () => {
    const { exitCode, stderr } = await runCli([
      "route", "--task", "TASK-014", "--step", "implement", "--targets", "api",
      "--modules", join(dirname(import.meta.path), "no-such-modules.json"),
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Module registry not found");
    expect(stderr).toContain("/nit:init");
  });
});

// TASK-021 — the base step skill is resolved from the step id by convention, so
// a skill directory whose name does not match its step id is silently dropped:
// routing treats a missing skill file as normal, not as an error. That is how
// `nit:review` came to resolve to a directory that did not exist. This pins the
// convention against the archetypes actually shipped.
describe("every shipped step id resolves to a skill on disk", () => {
  const SKILLS_DIR = join(dirname(import.meta.path), "..", "..", ".claude", "skills");

  // Steps with no SKILL.md yet, each owned by a named task. Shrinks to empty as
  // the migration lands; the second assertion below stops it going stale.
  const NOT_YET_IMPLEMENTED: Record<string, string> = {
    qa: "TASK-022",
    "boundary-check": "PHASE-3 boundary enforcement",
  };

  const ARCHETYPES = [
    "backend-feature",
    "frontend-feature",
    "infra-change",
    "bugfix",
    "cross-module-change",
    "architecture-decision",
  ];

  test("resolved archetype steps map to existing SKILL.md files", async () => {
    const missing: string[] = [];
    for (const name of ARCHETYPES) {
      const { steps } = await resolveArchetype(name);
      for (const step of steps) {
        if (step.id in NOT_YET_IMPLEMENTED) continue;
        if (!skillFileExists(baseSkillForStep(step.id), SKILLS_DIR)) {
          missing.push(`${name}/${step.id} -> ${skillFilePath(baseSkillForStep(step.id), SKILLS_DIR)}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  test("the not-yet-implemented list contains nothing that now exists", () => {
    const stale = Object.keys(NOT_YET_IMPLEMENTED).filter((step) =>
      skillFileExists(baseSkillForStep(step), SKILLS_DIR)
    );
    expect(stale).toEqual([]);
  });
});
