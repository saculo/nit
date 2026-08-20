import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import {
  loadDependencyRules,
  resolveDependency,
  type DependencyRules,
} from "../src/dependency-rules";
import type { ModuleEntry } from "../src/routing-resolver";

const ROOT = dirname(dirname(dirname(import.meta.path)));

const MODULES: ModuleEntry[] = [
  { name: "api", languageId: "typescript", allowedDependencies: ["core"] } as ModuleEntry,
  { name: "core", languageId: "typescript", allowedDependencies: [] } as ModuleEntry,
  // declares no allowlist at all — a module that has not opted in
  { name: "legacy", languageId: "typescript" } as ModuleEntry,
];

// TASK-034 — dependency-rules.json is the second source of truth about module
// boundaries, alongside each module's own allowedDependencies. The schema can
// describe its shape; only code can check it agrees with the module registry.
describe("dependency rules — loading", () => {
  // AC-1
  test("a well-formed rule set naming known modules loads", () => {
    const rules = loadDependencyRules(
      { rules: [{ from: "api", to: "core", allowed: true, reason: "the api layers on core" }] },
      MODULES
    );
    expect(rules.rules).toHaveLength(1);
  });

  // AC-1 — the check JSON Schema structurally cannot make
  test.each([
    ["from", { from: "nope", to: "core", allowed: true }],
    ["to", { from: "api", to: "nope", allowed: true }],
  ])("a rule whose %s names a module the registry does not declare is rejected", (_f, rule) => {
    expect(() => loadDependencyRules({ rules: [rule] }, MODULES)).toThrow(
      /names modules the registry does not declare/
    );
  });

  test("the failure names the offending module and the known set", () => {
    try {
      loadDependencyRules({ rules: [{ from: "ghost", to: "core", allowed: true }] }, MODULES);
      throw new Error("expected a throw");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('"ghost" is not a module');
      expect(msg).toContain("api, core, legacy");
    }
  });

  // AC-2 — a rule that does not say what it governs, or what it permits
  test.each([
    ["from", { to: "core", allowed: true }],
    ["to", { from: "api", allowed: true }],
    ["allowed", { from: "api", to: "core" }],
  ])("a rule missing %s fails validation naming the field", (field, rule) => {
    expect(() => loadDependencyRules({ rules: [rule] }, MODULES)).toThrow(
      new RegExp(`dependency-rules validation failed[\\s\\S]*${field}`)
    );
  });

  // A rule can be well-formed, name real modules, and still never fire. Both
  // shapes below resolve without complaint, which is the same silent-no-op the
  // unknown-module check exists to prevent.
  test("two rules governing the same pair are rejected, naming both", () => {
    expect(() =>
      loadDependencyRules(
        {
          rules: [
            { from: "api", to: "core", allowed: true },
            { from: "api", to: "core", allowed: false },
          ],
        },
        MODULES
      )
    ).toThrow(/rules\[1\][\s\S]*already governed by rules\[0\]/);
  });

  test("a rule governing a module and itself is rejected", () => {
    expect(() =>
      loadDependencyRules({ rules: [{ from: "api", to: "api", allowed: false }] }, MODULES)
    ).toThrow(/to itself/);
  });

  test("the same pair in opposite directions is fine — they are different rules", () => {
    const rules = loadDependencyRules(
      {
        rules: [
          { from: "api", to: "core", allowed: true },
          { from: "core", to: "api", allowed: false },
        ],
      },
      MODULES
    );
    expect(rules.rules).toHaveLength(2);
  });

  test("an unknown top-level field is rejected", () => {
    expect(() => loadDependencyRules({ rules: [], mode: "strict" }, MODULES)).toThrow(
      /validation failed/
    );
  });
});

// AC-4 — every field the schema declares is read, and the precedence between
// the two sources is fixed rather than incidental
describe("dependency rules — resolution", () => {
  const rules: DependencyRules = {
    rules: [
      { from: "api", to: "legacy", allowed: true, reason: "a temporary shim, tracked as debt" },
      { from: "api", to: "core", allowed: false, reason: "core is being split; do not add callers" },
    ],
  };

  test("an explicit rule wins over the module's own allowlist", () => {
    // api's allowedDependencies permits core, but a rule forbids it
    const v = resolveDependency("api", "core", MODULES, rules);
    expect(v.allowed).toBe(false);
    expect(v.source).toBe("rule");
    expect(v.reason).toContain("core is being split");
  });

  test("a rule can permit what the allowlist omits", () => {
    const v = resolveDependency("api", "legacy", MODULES, rules);
    expect(v.allowed).toBe(true);
    expect(v.source).toBe("rule");
  });

  test("with no rule, the module's allowlist decides", () => {
    const v = resolveDependency("api", "core", MODULES);
    expect(v.allowed).toBe(true);
    expect(v.source).toBe("module-allowlist");
  });

  test("an empty allowlist forbids everything, and says so", () => {
    const v = resolveDependency("core", "api", MODULES);
    expect(v.allowed).toBe(false);
    expect(v.source).toBe("module-allowlist");
    expect(v.reason).toContain("it declares none");
  });

  test("a module with no allowlist and no rule is unconstrained", () => {
    const v = resolveDependency("legacy", "core", MODULES);
    expect(v.allowed).toBe(true);
    expect(v.source).toBe("default");
  });

  test("a module may always depend on itself", () => {
    expect(resolveDependency("api", "api", MODULES, rules).allowed).toBe(true);
  });

  // AC-4 — `reason` is the field most at risk of being declared and unread
  test("every verdict carries a reason, whatever its source", () => {
    const cases = [
      resolveDependency("api", "core", MODULES, rules), // rule
      resolveDependency("core", "api", MODULES), // module-allowlist
      resolveDependency("legacy", "core", MODULES), // default
      resolveDependency("api", "api", MODULES), // self
    ];
    for (const v of cases) {
      expect(v.source).toBeTruthy();
      expect(v.reason && v.reason.length > 0).toBe(true);
    }
  });
});

// AC-3 — this repository's own rules encode the direction ADR-0006 states
describe("this repository's dependency rules", () => {
  const modules: ModuleEntry[] = JSON.parse(
    readFileSync(join(ROOT, ".nit", "boundaries", "modules.json"), "utf8")
  ).modules;
  const rules = loadDependencyRules(
    JSON.parse(readFileSync(join(ROOT, ".nit", "boundaries", "dependency-rules.json"), "utf8")),
    modules
  );

  test("the rule set loads against the real module registry", () => {
    expect(rules.rules.length).toBeGreaterThan(0);
  });

  test("skills may depend on the cli, and nothing may depend on either skills or the workspace", () => {
    expect(resolveDependency("@nit/skills", "@nit/cli", modules, rules).allowed).toBe(true);
    expect(resolveDependency("@nit/cli", "@nit/skills", modules, rules).allowed).toBe(false);
    expect(resolveDependency("@nit/cli", "@nit/workspace", modules, rules).allowed).toBe(false);
    expect(resolveDependency("@nit/skills", "@nit/workspace", modules, rules).allowed).toBe(false);
    expect(resolveDependency("@nit/workspace", "@nit/cli", modules, rules).allowed).toBe(false);
    expect(resolveDependency("@nit/workspace", "@nit/skills", modules, rules).allowed).toBe(false);
  });

  test("every rule explains itself, so a violation can say what to do", () => {
    const unexplained = rules.rules.filter((r) => !r.reason).map((r) => `${r.from} -> ${r.to}`);
    expect(unexplained).toEqual([]);
  });
});
