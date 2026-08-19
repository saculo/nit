import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { createAjv } from "../src/ajv";
import { resolveSchema } from "../src/schema-resolver";

const ROOT = dirname(dirname(dirname(import.meta.path)));
const INIT_SKILL = join(ROOT, ".claude", "skills", "init", "SKILL.md");

/** Extract a fenced JSON block that follows a heading in a skill file. */
function templateAfter(heading: string): unknown {
  const text = readFileSync(INIT_SKILL, "utf8");
  const start = text.indexOf(heading);
  if (start === -1) throw new Error(`heading not found: ${heading}`);
  const open = text.indexOf("```json", start);
  const body = text.slice(open + 7, text.indexOf("```", open + 7));
  return JSON.parse(body);
}

function validate(schemaName: string, data: unknown): { valid: boolean; errors: string } {
  const ajv = createAjv();
  const compiled = ajv.compile(require(resolveSchema(schemaName)!));
  return { valid: compiled(data) as boolean, errors: ajv.errorsText(compiled.errors) };
}

const RETIRED = ["DESIGN.md", "STEPS.md", "IMPLEMENTATION.md", "REVIEW.md", "CLARIFICATIONS.md"];

// TASK-026 — nit:init is the only v1 remnant whose blast radius reached beyond
// this repository: its templates are copied into every project scaffolded from
// here, so a stale artifact type propagates rather than merely misleading.
describe("nit:init scaffolds only v2 artifacts", () => {
  // AC-1
  test("artifact-types declares nothing the v2 pipeline does not write", () => {
    const types = templateAfter("### 5d — artifact-types.json") as { types: { id: string; filePattern?: string }[] };
    const patterns = types.types.map((t) => t.filePattern ?? "").join(" ");
    for (const retired of RETIRED) {
      expect(patterns).not.toContain(retired);
    }
  });

  test("the nit-owned artifact types point at the files the pipeline writes", () => {
    const types = templateAfter("### 5d — artifact-types.json") as { types: { id: string; filePattern?: string }[] };
    const byId = Object.fromEntries(types.types.map((t) => [t.id, t.filePattern]));
    expect(byId["step-output"]).toContain("output.json");
    expect(byId["step-input"]).toContain("input.json");
    expect(byId["task-state"]).toContain("state.json");
    expect(byId["approval"]).toContain("approval.json");
    expect(byId["task"]).toContain("task.json");
    expect(byId["phase"]).toContain("phase.json");
  });

  // AC-2 — ADR-0003 requires every generated file to validate at write time
  test.each([
    ["### 5d — artifact-types.json", "artifact-types"],
    ["### 5a — task-types.json", "task-types"],
    ["### 5b — roles.json", "roles"],
    ["### 4d — role-routing.json", "role-routing"],
  ])("the template at %s validates against %s", (heading, schema) => {
    const { valid, errors } = validate(schema, templateAfter(heading));
    expect(errors).toBe("No errors");
    expect(valid).toBe(true);
  });
});

// AC-1/AC-2 — a declared artifact type whose directory init never creates is the
// same defect as one pointing at a file the pipeline never writes: the scaffold
// and the registry disagree about the workspace.
describe("init creates every .nit directory its own templates reference", () => {
  test("each nit-owned artifact pattern lands in a directory init makes", () => {
    const text = readFileSync(INIT_SKILL, "utf8");
    const made = new Set(
      [...text.matchAll(/mkdir -p \.nit\/([a-z-]+)/g)].map((m) => m[1]!)
    );
    const types = templateAfter("### 5d — artifact-types.json") as {
      types: { id: string; filePattern?: string }[];
    };
    const missing = types.types
      .map((t) => t.filePattern ?? "")
      .filter((p) => p.startsWith(".nit/"))
      .map((p) => p.split("/")[1]!)
      .filter((dir) => !made.has(dir));
    expect([...new Set(missing)]).toEqual([]);
  });
});

// AC-3 — a hook that validates arguments for a supervisor-dispatched skill has
// nothing to validate. Five of ten were orphaned by the migration.
describe("every hook is wired to a skill that exists", () => {
  const HOOKS_DIR = join(ROOT, ".claude", "hooks");
  const SKILLS_DIR = join(ROOT, ".claude", "skills");

  function skillTexts(): string {
    return readdirSync(SKILLS_DIR)
      .map((d) => join(SKILLS_DIR, d, "SKILL.md"))
      .filter(existsSync)
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
  }

  test("no hook script is orphaned", () => {
    const wired = skillTexts();
    const orphaned = readdirSync(HOOKS_DIR)
      .filter((f) => f.endsWith(".sh"))
      .filter((f) => !wired.includes(f));
    expect(orphaned).toEqual([]);
  });

  test("no skill references a hook script that is gone", () => {
    const referenced = [...skillTexts().matchAll(/hooks\/([a-z-]+\.sh)/g)].map((m) => m[1]!);
    const missing = [...new Set(referenced)].filter((f) => !existsSync(join(HOOKS_DIR, f)));
    expect(missing).toEqual([]);
  });
});

// AC-4 — ADR-0006: .claude/ is the shipped tree, .nit/ is project state. This is
// the ADR's stated confirmation.
describe("ADR-0006 — .nit/ holds project state only", () => {
  const NIT = join(ROOT, ".nit");

  test.each(["skills", "hooks", "agents"])("no %s tree exists under .nit/", (dir) => {
    expect(existsSync(join(NIT, dir))).toBe(false);
  });

  test("the decision is recorded as an ADR", () => {
    const adrs = readdirSync(join(NIT, "adr"));
    expect(adrs.some((f) => f.startsWith("0006-"))).toBe(true);
  });
});

// TASK-031 — a context field nothing reads is the defect pattern this phase kept
// finding. reworkFrom is only useful if the steps reachable by rejection routing
// know to read it, so pin that rather than trusting the prose stays in step.
describe("every step skill reads both reopen causes", () => {
  const SKILLS = ["analyze", "design", "implement", "review", "qa"];

  test.each(SKILLS)("%s documents context.repairErrors", (skill) => {
    const text = readFileSync(join(ROOT, ".claude", "skills", skill, "SKILL.md"), "utf8");
    expect(text).toContain("context.repairErrors");
  });

  test.each(SKILLS)("%s documents context.reworkFrom", (skill) => {
    const text = readFileSync(join(ROOT, ".claude", "skills", skill, "SKILL.md"), "utf8");
    expect(text).toContain("context.reworkFrom");
  });

  test("nit:continue documents both reopen causes", () => {
    const text = readFileSync(join(ROOT, ".claude", "skills", "continue", "SKILL.md"), "utf8");
    expect(text).toContain("repairErrors");
    expect(text).toContain("reworkFrom");
  });

  test("nit:reject no longer promises rework context it cannot deliver", () => {
    const text = readFileSync(join(ROOT, ".claude", "skills", "reject", "SKILL.md"), "utf8");
    expect(text).toContain("reworkFrom");
  });
});

// TASK-030 — the field is only useful if the producer writes it and the consumer
// reads it. Shipping a schema field with neither is the pattern this phase kept
// finding, so pin both ends.
describe("phase success criteria have a producer and a consumer", () => {
  function skill(name: string): string {
    return readFileSync(join(ROOT, ".claude", "skills", name, "SKILL.md"), "utf8");
  }

  test("nit:phases persists successCriteria", () => {
    const text = skill("phase-plan");
    expect(text).toContain("successCriteria");
    // and no longer says they are discarded
    expect(text).not.toContain("success criteria are worked out interactively and then materialised");
  });

  test("its documented phase.json template carries them", () => {
    const text = skill("phase-plan");
    const open = text.indexOf("```json", text.indexOf("### phase.json Format"));
    const body = text.slice(open + 7, text.indexOf("```", open + 7));
    const phase = JSON.parse(body);
    expect(Array.isArray(phase.successCriteria)).toBe(true);
    expect(phase.successCriteria.length).toBeGreaterThan(0);
  });

  test("nit:phase-summary reads them and no longer derives from the milestone", () => {
    const text = skill("phase-summary");
    expect(text).toContain("phase.json.successCriteria");
    expect(text).not.toContain("derive one\n   criterion per distinct outcome named in `milestone`");
  });
});
