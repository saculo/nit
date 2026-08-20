import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
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
