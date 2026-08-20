import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { moduleForPath, changedPaths, checkBoundaries, isOwnRecord } from "../src/boundary-check";
import { loadDependencyRules } from "../src/dependency-rules";
import { ingest, type TaskState } from "../src/supervisor";
import { resolveArchetype, type ArchetypeStep } from "../src/archetype-resolver";
import type { ModuleEntry } from "../src/routing-resolver";

const NOW = "2026-08-20T00:00:00.000Z";
const MODULES = [
  { name: "api", path: "src/api", languageId: "typescript", allowedDependencies: ["core"] },
  { name: "core", path: "src/core", languageId: "typescript", allowedDependencies: [] },
  { name: "web", path: "web", languageId: "typescript", allowedDependencies: [] },
] as unknown as ModuleEntry[];
const RULES = loadDependencyRules(
  { rules: [{ from: "api", to: "web", allowed: false, reason: "the api must not reach into the UI." }] },
  MODULES
);

function implOutput(paths: string[]): unknown {
  return {
    taskId: "T", stepId: "implement", stepType: "implement",
    result: { resultType: "implementation", filesChanged: paths.map((p) => ({ path: p, action: "modified" })) },
  };
}

// TASK-035 — a schema-valid step output can still break a module boundary. That
// is a policy failure, not a malformed artifact, and validation-result has
// carried both flags since PHASE-2 with nothing ever setting policyValid false.
describe("mapping files to modules", () => {
  test.each([
    ["src/api/handler.ts", "api"],
    ["src/core/thing.ts", "core"],
    ["web/page.tsx", "web"],
    ["./src/api/handler.ts", "api"],
    ["README.md", undefined],
    ["src/other/x.ts", undefined],
  ])("%s belongs to %s", (path, expected) => {
    expect(moduleForPath(path, MODULES)).toBe(expected as any);
  });

  test("the longest matching path wins, so a nested module is not shadowed", () => {
    const nested = [...MODULES, { name: "api-v2", path: "src/api/v2", languageId: "ts" }] as ModuleEntry[];
    expect(moduleForPath("src/api/v2/handler.ts", nested)).toBe("api-v2");
    expect(moduleForPath("src/api/handler.ts", nested)).toBe("api");
  });

  test("only an implementation result carries changed paths", () => {
    expect(changedPaths(implOutput(["src/api/x.ts"]))).toEqual(["src/api/x.ts"]);
    expect(changedPaths({ result: { resultType: "design", summary: "s", decisions: [] } })).toEqual([]);
  });
});

describe("checking boundaries", () => {
  // AC-1
  test("a change reaching a forbidden module is a violation", () => {
    const v = checkBoundaries(implOutput(["src/api/h.ts", "web/page.tsx"]), "api", MODULES, RULES);
    expect(v).toHaveLength(1);
    expect(v[0]!.to).toBe("web");
    expect(v[0]!.reason).toContain("must not reach into the UI");
  });

  // AC-3
  test("a change within the task's own module is never a violation", () => {
    expect(checkBoundaries(implOutput(["src/api/a.ts", "src/api/b.ts"]), "api", MODULES, RULES)).toEqual([]);
  });

  test("a change reaching a permitted module is not a violation", () => {
    expect(checkBoundaries(implOutput(["src/core/x.ts"]), "api", MODULES, RULES)).toEqual([]);
  });

  test("a file no module owns is ignored rather than flagged", () => {
    expect(checkBoundaries(implOutput(["README.md"]), "api", MODULES, RULES)).toEqual([]);
  });

  test("each offending file is reported once", () => {
    const v = checkBoundaries(implOutput(["web/a.tsx", "web/a.tsx", "web/b.tsx"]), "api", MODULES, RULES);
    expect(v.map((x) => x.path)).toEqual(["web/a.tsx", "web/b.tsx"]);
  });

  // The systematic false positive: every task writes its own record, so counting
  // it would flag every task and the rule would be switched off.
  test("a task's own process record is not a dependency", () => {
    const own = ".nit/phases/PHASE-4/tasks/TASK-035/REVIEW.md";
    expect(isOwnRecord(own, "TASK-035")).toBe(true);
    expect(isOwnRecord(".nit/phases/PHASE-4/tasks/TASK-030/task.json", "TASK-035")).toBe(false);

    const mods = [...MODULES, { name: "ws", path: ".nit", languageId: "md" }] as ModuleEntry[];
    expect(checkBoundaries(implOutput([own]), "api", mods, RULES, "TASK-035")).toEqual([]);
    // another task's record is still a crossing
    expect(
      checkBoundaries(implOutput([".nit/phases/PHASE-4/tasks/TASK-030/task.json"]), "api", mods, RULES, "TASK-035")
    ).toHaveLength(1);
  });
});

// ADR-0007 in its documentation form: enforcement the specialist is never told
// about is a rule that can only be obeyed by accident.
describe("the engineer is told what a boundary error means", () => {
  const skill = readFileSync(
    join(import.meta.dir, "..", "..", ".claude", "skills", "implement", "SKILL.md"),
    "utf8"
  );

  test("nit:implement explains the boundary: prefix and the policyValid distinction", () => {
    expect(skill).toContain("boundary:");
    expect(skill).toContain("policyValid");
  });

  test("it routes a genuinely cross-module task to needs-splitting, not another attempt", () => {
    expect(skill).toContain("needs-splitting");
    expect(skill).toContain("reopen budget");
  });
});

describe("boundary enforcement through ingest", () => {
  let steps: ArchetypeStep[];
  const setup = async (paths: string[]) => {
    steps = (await resolveArchetype("backend-feature")).steps as ArchetypeStep[];
    const dir = mkdtempSync(join(tmpdir(), "nit-bound-"));
    writeFileSync(join(dir, "task.json"), JSON.stringify({
      id: "T", phase: "PHASE-4", title: "t", type: "backend", targetModule: "api", status: "draft" }));
    writeFileSync(join(dir, "state.json"), JSON.stringify({
      taskId: "T", currentStepId: "implement",
      stepOrder: ["analyze", "design", "implement", "review", "qa"],
      status: "in-progress", reopenCount: 0,
      timestamps: { createdAt: NOW, updatedAt: NOW } }));
    mkdirSync(join(dir, "STEP-003-implement"), { recursive: true });
    writeFileSync(join(dir, "STEP-003-implement", "output.json"), JSON.stringify(implOutput(paths)));
    return dir;
  };
  const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));

  // AC-1
  test("a violating output does not pass validation", async () => {
    const dir = await setup(["web/page.tsx"]);
    const r = (await ingest({ taskDir: dir, taskId: "T", steps, now: NOW, modules: MODULES, dependencyRules: RULES })) as any;
    expect(r.valid).toBe(false);
    expect(r.errors[0].message).toContain("may not depend on");
  });

  // AC-2 — the distinction a reader needs
  test("validation.json marks it a policy failure, not a schema failure", async () => {
    const dir = await setup(["web/page.tsx"]);
    await ingest({ taskDir: dir, taskId: "T", steps, now: NOW, modules: MODULES, dependencyRules: RULES });
    const v = read(join(dir, "STEP-003-implement", "validation.json"));
    expect(v.schemaValid).toBe(true);
    expect(v.policyValid).toBe(false);
  });

  test("a malformed output is still a schema failure", async () => {
    const dir = await setup(["src/api/x.ts"]);
    writeFileSync(join(dir, "STEP-003-implement", "output.json"), JSON.stringify({ taskId: "T" }));
    await ingest({ taskDir: dir, taskId: "T", steps, now: NOW, modules: MODULES, dependencyRules: RULES });
    const v = read(join(dir, "STEP-003-implement", "validation.json"));
    expect(v.schemaValid).toBe(false);
    expect(v.policyValid).toBe(true);
  });

  // AC-3
  test("a compliant output proceeds exactly as before", async () => {
    const dir = await setup(["src/api/x.ts", "src/core/y.ts"]);
    const r = (await ingest({ taskDir: dir, taskId: "T", steps, now: NOW, modules: MODULES, dependencyRules: RULES })) as any;
    expect(r.valid).toBe(true);
    expect(existsSync(join(dir, "STEP-003-implement", "validation.json"))).toBe(false);
  });

  // AC-4 — additive for projects that have not configured boundaries
  test("with no rules supplied, checking is skipped", async () => {
    const dir = await setup(["web/page.tsx"]);
    const r = (await ingest({ taskDir: dir, taskId: "T", steps, now: NOW })) as any;
    expect(r.valid).toBe(true);
  });

  test("a violation reopens the step with the boundary errors as repair context", async () => {
    const dir = await setup(["web/page.tsx"]);
    await ingest({ taskDir: dir, taskId: "T", steps, now: NOW, modules: MODULES, dependencyRules: RULES });
    const input = read(join(dir, "STEP-003-implement", "input.json"));
    expect(input.context.repairErrors[0].message).toContain("boundary:");
    expect(read(join(dir, "state.json")).reopenCount).toBe(1);
  });
});
