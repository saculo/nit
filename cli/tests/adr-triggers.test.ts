import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { loadTriggers, evaluateTriggers, TRIGGER_KINDS, type AdrTrigger } from "../src/adr-triggers";
import { loadDependencyRules } from "../src/dependency-rules";
import type { ModuleEntry } from "../src/routing-resolver";

const ROOT = dirname(dirname(dirname(import.meta.path)));
const MODULES = [
  { name: "api", path: "src/api", languageId: "ts", allowedDependencies: ["core"] },
  { name: "core", path: "src/core", languageId: "ts", allowedDependencies: [] },
  { name: "web", path: "web", languageId: "ts", allowedDependencies: ["core"] },
] as unknown as ModuleEntry[];
const RULES = loadDependencyRules({ rules: [] }, MODULES);
const CTX = { targetModule: "api", modules: MODULES, rules: RULES };

const trigger = (kind: string, id = kind): AdrTrigger => ({
  id, condition: `prose for ${kind}`, when: { kind }, template: "madr", enabled: true,
});

function impl(files: [string, string][]): unknown {
  return { result: { resultType: "implementation", filesChanged: files.map(([path, action]) => ({ path, action })) } };
}

// TASK-037 — the config declared its conditions as English prose, which nothing
// can decide. A trigger that cannot be evaluated is indistinguishable at runtime
// from one that simply did not match.
describe("loading triggers", () => {
  test("a trigger set with computable conditions loads", () => {
    expect(loadTriggers({ triggers: [trigger("multi-module-change")] }).triggers).toHaveLength(1);
  });

  // AC-3
  test("a condition the evaluator does not decide is rejected, naming it", () => {
    expect(() => loadTriggers({ triggers: [trigger("vibes")] })).toThrow(
      /"vibes" is not a condition the evaluator decides/
    );
  });

  test("the failure lists the kinds it does decide", () => {
    try {
      loadTriggers({ triggers: [trigger("vibes")] });
      throw new Error("expected a throw");
    } catch (e) {
      for (const k of TRIGGER_KINDS) expect((e as Error).message).toContain(k);
    }
  });

  test("a trigger with no `when` at all is rejected by the schema", () => {
    expect(() => loadTriggers({ triggers: [{ id: "x", condition: "prose" }] })).toThrow(
      /validation failed/
    );
  });
});

describe("evaluating triggers", () => {
  // AC-1 — the two SC-3 names explicitly
  test("a change spanning two modules matches multi-module-change", () => {
    const m = evaluateTriggers(
      impl([["src/api/a.ts", "modified"], ["src/core/b.ts", "modified"]]),
      [trigger("multi-module-change")], CTX
    );
    expect(m).toHaveLength(1);
    expect(m[0]!.evidence.sort()).toEqual(["api", "core"]);
  });

  test("a new file in a module others may depend on matches new-shared-component", () => {
    const m = evaluateTriggers(
      impl([["src/core/shared.ts", "created"]]), [trigger("new-shared-component")], CTX
    );
    expect(m).toHaveLength(1);
    expect(m[0]!.evidence).toEqual(["src/core/shared.ts"]);
  });

  test("a modified file in a shared module does not match — only new surface counts", () => {
    expect(evaluateTriggers(
      impl([["src/core/shared.ts", "modified"]]), [trigger("new-shared-component")], CTX
    )).toEqual([]);
  });

  test.each([
    ["cross-module-dependency", [["web/page.tsx", "modified"]]],
    ["boundary-change", [[".nit/boundaries/modules.json", "modified"]]],
    ["public-api-change", [["cli/schemas/task.schema.json", "modified"]]],
    ["new-infra-capability", [["package.json", "modified"]]],
  ])("%s matches its condition", (kind, files) => {
    const m = evaluateTriggers(impl(files as [string, string][]), [trigger(kind)], CTX);
    expect(m).toHaveLength(1);
    expect(m[0]!.kind).toBe(kind);
  });

  // AC-2
  test("a step matching nothing reports nothing", () => {
    const all = TRIGGER_KINDS.map((k) => trigger(k));
    expect(evaluateTriggers(impl([["src/api/a.ts", "modified"]]), all, CTX)).toEqual([]);
  });

  test("a non-implementation result is never evaluated", () => {
    const design = { result: { resultType: "design", summary: "s", decisions: [] } };
    expect(evaluateTriggers(design, TRIGGER_KINDS.map((k) => trigger(k)), CTX)).toEqual([]);
  });

  // AC-4 — every declared field is read
  test("a disabled trigger does not fire", () => {
    const off = { ...trigger("multi-module-change"), enabled: false };
    expect(evaluateTriggers(impl([["src/api/a.ts", "modified"], ["src/core/b.ts", "modified"]]), [off], CTX)).toEqual([]);
  });

  test("a match carries the configured condition and template forward", () => {
    const m = evaluateTriggers(
      impl([["src/api/a.ts", "modified"], ["src/core/b.ts", "modified"]]),
      [trigger("multi-module-change")], CTX
    );
    expect(m[0]!.condition).toBe("prose for multi-module-change");
    expect(m[0]!.template).toBe("madr");
    expect(m[0]!.id).toBe("multi-module-change");
  });

  test("several triggers can match one change", () => {
    const m = evaluateTriggers(
      impl([["src/api/a.ts", "modified"], ["package.json", "modified"], ["src/core/b.ts", "created"]]),
      [trigger("multi-module-change"), trigger("new-infra-capability"), trigger("new-shared-component")],
      CTX
    );
    expect(m.map((x) => x.kind).sort()).toEqual([
      "multi-module-change", "new-infra-capability", "new-shared-component",
    ]);
  });
});

// AC-4 — this repository's own trigger set is evaluable, not prose
describe("this repository's triggers", () => {
  const cfg = loadTriggers(JSON.parse(readFileSync(join(ROOT, ".nit", "config", "adr-triggers.json"), "utf8")));

  test("every configured trigger declares a kind the evaluator decides", () => {
    for (const t of cfg.triggers) expect(TRIGGER_KINDS).toContain(t.when.kind as any);
  });

  test("every kind the evaluator supports is exercised by a configured trigger", () => {
    const configured = new Set(cfg.triggers.map((t) => t.when.kind));
    const unused = TRIGGER_KINDS.filter((k) => !configured.has(k));
    expect(unused).toEqual([]);
  });

  test("every trigger keeps its English condition for whoever reads the candidate", () => {
    const mute = cfg.triggers.filter((t) => !t.condition || t.condition.length < 10).map((t) => t.id);
    expect(mute).toEqual([]);
  });
});

// TASK-037 review — SC-4 needs a specialist to know a trigger fired, but ingest
// evaluates after the output is written. Without a query the specialist can run
// first, TASK-038 has nothing to act on.
describe("nit adr-triggers, the specialist's query", () => {
  const run = (args: string[]) =>
    Bun.spawnSync(["bun", "run", join(import.meta.dir, "..", "src", "cli.ts"), "adr-triggers", ...args], {
      cwd: join(import.meta.dir, "..", ".."),
    });

  const taskDir = (files: [string, string][]) => {
    const dir = mkdtempSync(join(tmpdir(), "nit-adrq-"));
    writeFileSync(join(dir, "task.json"), JSON.stringify({
      id: "TASK-999", phase: "PHASE-4", title: "t", type: "devops",
      targetModule: "@nit/skills", status: "draft" }));
    mkdirSync(join(dir, "STEP-003-implement"), { recursive: true });
    writeFileSync(join(dir, "STEP-003-implement", "output.json"), JSON.stringify(
      impl(files)));
    return dir;
  };

  test("it reports what fired, with exit 1", () => {
    const r = run(["--task-dir", taskDir([[".claude/skills/x/SKILL.md", "modified"], ["cli/src/y.ts", "modified"]])]);
    const out = JSON.parse(r.stdout.toString());
    expect(out.configured).toBe(true);
    expect(out.fired.map((f: any) => f.kind)).toContain("multi-module-change");
    expect(r.exitCode).toBe(1);
  });

  test("a quiet change exits 0 with nothing fired", () => {
    const r = run(["--task-dir", taskDir([[".claude/skills/x/SKILL.md", "modified"]])]);
    expect(JSON.parse(r.stdout.toString()).fired).toEqual([]);
    expect(r.exitCode).toBe(0);
  });

  test("an unconfigured project says so rather than failing", () => {
    const r = run(["--task-dir", taskDir([["cli/src/y.ts", "modified"]]), "--triggers", "/nonexistent.json"]);
    const out = JSON.parse(r.stdout.toString());
    expect(out.configured).toBe(false);
    expect(r.exitCode).toBe(0);
  });
});

// The evaluator's output must reach whoever acts on it.
describe("adrTriggers are documented where they are consumed", () => {
  const skill = readFileSync(
    join(import.meta.dir, "..", "..", ".claude", "skills", "continue", "SKILL.md"), "utf8");

  test("nit:continue explains the adrTriggers it now reports", () => {
    expect(skill).toContain("adrTriggers");
    expect(skill).toContain("adr-triggers --task-dir");
  });
});

// TASK-038 — a trigger nobody is told about fires into the void. SC-4 wants
// candidates to appear without the specialist being prompted, which only works
// if the skills know to ask and what to do with the answer.
describe("specialists are told to emit candidates when a trigger fires", () => {
  const skillDir = join(import.meta.dir, "..", "..", ".claude", "skills");
  const read = (name: string) => readFileSync(join(skillDir, name, "SKILL.md"), "utf8");
  const EMITTERS = ["design", "implement", "boundary-check"];

  // AC-2
  test.each(EMITTERS)("%s documents how to query the triggers", (name) => {
    expect(read(name)).toContain("adr-triggers --task-dir");
  });

  test.each(EMITTERS)("%s names which triggers are likely to fire at its step", (name) => {
    const text = read(name);
    const named = TRIGGER_KINDS.filter((k) => text.includes(k));
    expect(named.length).toBeGreaterThan(0);
  });

  // AC-1 — a candidate carries reasoning, not a restatement of the change
  test.each(EMITTERS)("%s says what belongs in a candidate", (name) => {
    const text = read(name);
    for (const field of ["title", "context", "decision"]) expect(text).toContain(field);
  });

  // AC-3 — promotion stays human
  test.each(EMITTERS)("%s forbids writing into .nit/adr/ itself", (name) => {
    expect(read(name)).toContain(".nit/adr/");
  });

  // the honest second answer: a trigger's shape can match with no decision behind it
  test.each(EMITTERS)("%s permits emitting nothing when no decision was made", (name) => {
    expect(read(name)).toContain("No decision was made");
  });
});

// A design step declares what it will touch; an implement step reports what it
// did. Triggers should see both, but boundary enforcement must not consume a
// plan — a design would then be blocked for a crossing that may never happen.
describe("planned paths feed triggers but not enforcement", () => {
  const design = {
    result: {
      resultType: "design", summary: "s", decisions: [],
      filePlan: [{ path: "src/api/a.ts", action: "created" }, { path: "src/core/b.ts", action: "modified" }],
    },
  };

  test("a design's filePlan fires triggers", () => {
    const m = evaluateTriggers(design, [trigger("multi-module-change")], CTX);
    expect(m).toHaveLength(1);
    expect(m[0]!.evidence.sort()).toEqual(["api", "core"]);
  });

  test("a design's filePlan is invisible to boundary enforcement", async () => {
    const { changedPaths, plannedPaths } = await import("../src/boundary-check");
    expect(changedPaths(design)).toEqual([]);
    expect(plannedPaths(design).map((f) => f.path)).toEqual(["src/api/a.ts", "src/core/b.ts"]);
  });

  test("an implement result still reports what changed, not a plan", async () => {
    const { plannedPaths } = await import("../src/boundary-check");
    expect(plannedPaths(impl([["src/api/a.ts", "modified"]]))).toEqual([]);
  });
});
