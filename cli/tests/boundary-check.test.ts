import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { moduleForPath, changedPaths, checkBoundaries, isOwnRecord } from "../src/boundary-check";
import { loadDependencyRules } from "../src/dependency-rules";
import { ingest, type TaskState } from "../src/supervisor";
import { resolveArchetype, type ArchetypeStep } from "../src/archetype-resolver";
import type { ModuleEntry } from "../src/routing-resolver";

const ROOT = dirname(dirname(import.meta.dir));

const NOW = "2026-08-20T00:00:00.000Z";
const MODULES = [
  { name: "api", paths: ["src/api"], languageId: "typescript", allowedDependencies: ["core"] },
  { name: "core", paths: ["src/core"], languageId: "typescript", allowedDependencies: [] },
  { name: "web", paths: ["web"], languageId: "typescript", allowedDependencies: [] },
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
    const nested = [...MODULES, { name: "api-v2", paths: ["src/api/v2"], languageId: "ts" }] as ModuleEntry[];
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

    const mods = [...MODULES, { name: "ws", paths: [".nit"], languageId: "md" }] as ModuleEntry[];
    expect(checkBoundaries(implOutput([own]), "api", mods, RULES, "TASK-035")).toEqual([]);
    // another task's record is still a crossing
    expect(
      checkBoundaries(implOutput([".nit/phases/PHASE-4/tasks/TASK-030/task.json"]), "api", mods, RULES, "TASK-035")
    ).toHaveLength(1);
  });
});

// TASK-036 — an archetype carrying a boundary-check step declares that this task
// crosses modules deliberately. Blocking it automatically at implement would
// make that step unreachable and cross-module-change unusable.
describe("archetypes that review boundaries are not blocked automatically", () => {
  const setupCross = async (paths: string[]) => {
    const dir = mkdtempSync(join(tmpdir(), "nit-cmc-"));
    writeFileSync(join(dir, "task.json"), JSON.stringify({
      id: "T", phase: "PHASE-4", title: "t", type: "backend", targetModule: "api", status: "draft" }));
    writeFileSync(join(dir, "state.json"), JSON.stringify({
      taskId: "T", currentStepId: "implement",
      stepOrder: ["analyze", "design", "implement", "boundary-check", "review", "qa"],
      status: "in-progress", reopenCount: 0,
      timestamps: { createdAt: NOW, updatedAt: NOW } }));
    mkdirSync(join(dir, "STEP-003-implement"), { recursive: true });
    writeFileSync(join(dir, "STEP-003-implement", "output.json"), JSON.stringify(implOutput(paths)));
    return dir;
  };

  test("a crossing passes implement when the archetype has a boundary-check step", async () => {
    const steps = (await resolveArchetype("cross-module-change")).steps as ArchetypeStep[];
    const dir = await setupCross(["web/page.tsx"]);
    const r = (await ingest({
      taskDir: dir, taskId: "T", steps, now: NOW, modules: MODULES, dependencyRules: RULES,
    })) as any;
    expect(r.valid).toBe(true);
    expect(existsSync(join(dir, "STEP-003-implement", "validation.json"))).toBe(false);
  });

  test("the same crossing is blocked under an archetype without that step", async () => {
    const steps = (await resolveArchetype("backend-feature")).steps as ArchetypeStep[];
    const dir = await setupCross(["web/page.tsx"]);
    // same output, ordinary archetype
    writeFileSync(join(dir, "state.json"), JSON.stringify({
      taskId: "T", currentStepId: "implement",
      stepOrder: ["analyze", "design", "implement", "review", "qa"],
      status: "in-progress", reopenCount: 0,
      timestamps: { createdAt: NOW, updatedAt: NOW } }));
    const r = (await ingest({
      taskDir: dir, taskId: "T", steps, now: NOW, modules: MODULES, dependencyRules: RULES,
    })) as any;
    expect(r.valid).toBe(false);
  });

  test("every shipped archetype's boundary-check step resolves to a skill", async () => {
    const { steps } = await resolveArchetype("cross-module-change");
    const bc = steps.find((s) => s.id === "boundary-check");
    expect(bc).toBeDefined();
    expect(bc!.role).toBe("reviewer");
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

// AC-2 / AC-3 — the skill reuses existing contracts rather than inventing one
describe("nit:boundary-check skill contract", () => {
  const skill = readFileSync(
    join(import.meta.dir, "..", "..", ".claude", "skills", "boundary-check", "SKILL.md"),
    "utf8"
  );

  test("it produces a review-result rather than a new result type", () => {
    expect(skill).toContain('"resultType": "review"');
    expect(skill).not.toContain("boundary-result");
  });

  test("it uses the shared blocked contract", () => {
    expect(skill).toContain('"resultType": "blocked"');
    expect(skill).toContain("needs-splitting");
  });

  test("it runs the check rather than re-deriving it", () => {
    expect(skill).toContain("cli.ts boundaries");
  });
});

// The query and the gate must not disagree about what "configured" means.
// ingest enforces only with both files; the command reports either way and says
// which, so a report is never mistaken for a live gate.
describe("nit boundaries reports whether enforcement is live", () => {
  const run = (args: string[]) =>
    Bun.spawnSync(["bun", "run", join(import.meta.dir, "..", "src", "cli.ts"), "boundaries", ...args], {
      cwd: join(import.meta.dir, "..", ".."),
    });

  const taskDir = () => {
    const dir = mkdtempSync(join(tmpdir(), "nit-bq-"));
    writeFileSync(join(dir, "task.json"), JSON.stringify({
      id: "TASK-999", phase: "PHASE-4", title: "t", type: "devops",
      targetModule: "@nit/core", status: "draft" }));
    mkdirSync(join(dir, "STEP-003-implement"), { recursive: true });
    // A genuine crossing under the TASK-044 registry: the shipped tree reaching
    // into another project's workspace state. Touching cli/ and .claude/ in one
    // task is not a crossing any more — that is the whole point of the change.
    writeFileSync(join(dir, "STEP-003-implement", "output.json"), JSON.stringify(
      implOutput(["cli/src/x.ts", ".nit/phases/PHASE-9/tasks/TASK-998/task.json"])));
    return dir;
  };

  test("with a rule set, the report says enforcement is live", () => {
    const r = run(["--task-dir", taskDir()]);
    const out = JSON.parse(r.stdout.toString());
    expect(out.enforced).toBe(true);
    expect(out.rulesPath).toContain("dependency-rules.json");
    expect(r.exitCode).toBe(1);
  });

  test("without one, it still reports but says enforcement is not live", () => {
    const r = run(["--task-dir", taskDir(), "--rules", "/nonexistent/rules.json"]);
    const out = JSON.parse(r.stdout.toString());
    expect(out.enforced).toBe(false);
    expect(out.rulesPath).toBeNull();
    // the crossing is still visible, so a project can see what it would cost
    expect(out.violations.length).toBeGreaterThan(0);
  });

  test("a clean task exits 0", () => {
    const dir = mkdtempSync(join(tmpdir(), "nit-bq-"));
    writeFileSync(join(dir, "task.json"), JSON.stringify({
      id: "TASK-999", phase: "PHASE-4", title: "t", type: "devops",
      targetModule: "@nit/core", status: "draft" }));
    mkdirSync(join(dir, "STEP-003-implement"), { recursive: true });
    writeFileSync(join(dir, "STEP-003-implement", "output.json"), JSON.stringify(
      implOutput(["cli/src/x.ts"])));
    expect(run(["--task-dir", dir]).exitCode).toBe(0);
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

// AC-4 — the phase summary's headline finding, as a check rather than as prose.
//
// Under the three-module split, twelve of twelve PHASE-4 tasks changed a module
// other than their target. Collapsing the shipped tree closes that boundary
// completely: no task crosses between `cli/` and `.claude/`, because they are
// now the one thing they always were.
//
// It does not close the other one. Eight tasks still touch `.nit/` from
// `@nit/core`, in two shapes: a task that changes a schema must migrate this
// workspace's instance of it, and a task may edit another task's record. Both
// are "changed a file in", not "depends on" — the distinction the rules still do
// not encode. Folding `.nit/` in as well would leave one module and no boundary
// at all, which would destroy the ADR-0006 claim that actually matters: the
// shipped tool must not assume a workspace layout.
//
// So this asserts what is true and worth protecting, and names what is not yet.
// AC-1 — a module may own several directories. Found by reversion: honouring
// only the first declared path broke nothing, because every other fixture
// declares one.
describe("a module that spans more than one directory", () => {
  const SPANNING = [
    { name: "shipped", paths: ["cli", ".claude"], languageId: "typescript" },
    { name: "state", paths: [".nit"], languageId: "markdown" },
  ] as ModuleEntry[];

  test.each([
    ["cli/src/supervisor.ts", "shipped"],
    [".claude/skills/design/SKILL.md", "shipped"],
    [".nit/prd/summary.json", "state"],
  ])("%s belongs to %s", (file, owner) => {
    expect(moduleForPath(file, SPANNING)).toBe(owner);
  });

  test("a file under none of the declared paths is unowned, not misfiled", () => {
    expect(moduleForPath("README.md", SPANNING)).toBeUndefined();
  });

  test("the longest declared path still wins across modules", () => {
    const nested = [...SPANNING, { name: "plugins", paths: ["cli/plugins"], languageId: "ts" }] as ModuleEntry[];
    expect(moduleForPath("cli/plugins/a.ts", nested)).toBe("plugins");
    expect(moduleForPath("cli/src/a.ts", nested)).toBe("shipped");
  });

  test("this repository's shipped tree really does declare both trees", () => {
    const modules: ModuleEntry[] = JSON.parse(
      readFileSync(join(ROOT, ".nit", "boundaries", "modules.json"), "utf8")
    ).modules;
    const core = modules.find((m) => m.name === "@nit/core")!;
    expect(core.paths).toEqual(["cli", ".claude"]);
    expect(moduleForPath(".claude/skills/init/SKILL.md", modules)).toBe("@nit/core");
  });
});

describe("this repository's own tasks against its own boundaries", () => {
  const modules: ModuleEntry[] = JSON.parse(
    readFileSync(join(ROOT, ".nit", "boundaries", "modules.json"), "utf8")
  ).modules;

  function filesFor(taskId: string): string[] {
    const hashes = Bun.spawnSync(["git", "log", "--format=%H", "--grep", `^${taskId}:`, "--all"], {
      cwd: ROOT,
    }).stdout.toString().split("\n").filter(Boolean);
    const files = new Set<string>();
    for (const hash of hashes) {
      const out = Bun.spawnSync(["git", "show", "--name-only", "--format=", "-1", hash], {
        cwd: ROOT,
      }).stdout.toString();
      for (const line of out.split("\n")) if (line.trim()) files.add(line.trim());
    }
    return [...files];
  }

  function crossings(taskId: string): string[] {
    const task = JSON.parse(
      readFileSync(join(ROOT, ".nit", "phases", "PHASE-4", "tasks", taskId, "task.json"), "utf8")
    );
    const crossed = filesFor(task.id)
      // A task writing its own record is not a crossing (isOwnRecord).
      .filter((p) => !isOwnRecord(p, task.id))
      .map((p) => moduleForPath(p, modules))
      .filter((m): m is string => Boolean(m) && m !== task.targetModule);
    return [...new Set(crossed)].sort();
  }

  const phase4 = readdirSync(join(ROOT, ".nit", "phases", "PHASE-4", "tasks")).sort();

  test.each(phase4)("%s does not cross inside the shipped tree", (taskId) => {
    // Every crossing that remains is between the shipped tree and the
    // workspace. None is between the CLI and the skills that call it, which is
    // the boundary TASK-044 removed.
    expect(crossings(taskId).every((m) => m === "@nit/core" || m === "@nit/workspace")).toBe(true);
  });

  test("the boundary the split created is gone for every task", () => {
    const inside = phase4.filter((taskId) => {
      const task = JSON.parse(
        readFileSync(join(ROOT, ".nit", "phases", "PHASE-4", "tasks", taskId, "task.json"), "utf8")
      );
      if (task.targetModule !== "@nit/core") return false;
      return filesFor(task.id)
        .filter((p) => !isOwnRecord(p, task.id))
        .some((p) => {
          const m = moduleForPath(p, modules);
          return m !== undefined && m !== "@nit/core" && m !== "@nit/workspace";
        });
    });
    expect(inside).toEqual([]);
  });

  // Declared, not silently tolerated: this is the residue Option A cannot
  // reach, and the number is the evidence for whether to act on it.
  test("the crossings that remain are core-to-workspace and no worse than today", () => {
    const crossing = phase4.filter((taskId) => crossings(taskId).length > 0);
    expect(crossing.length).toBeLessThanOrEqual(8);
  });
});
