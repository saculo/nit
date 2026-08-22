import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  explainRouting,
  resolveRouting,
  orderedSkillList,
  ROUTING_LAYERS,
  type ModuleEntry,
} from "../src/routing-resolver";
import { runExplainRouting, runResolveRouting, renderExplanation } from "../src/commands/routing";
import { runContinue } from "../src/commands/continue";
import { createAjv } from "../src/ajv";
import { resolveSchema } from "../src/schema-resolver";

const API: ModuleEntry = {
  name: "api",
  languageId: "typescript",
  customSkills: ["spring-boot", "ddd"],
  stepOverrides: { implement: { addSkills: ["migrations"] } },
};
const WEB: ModuleEntry = { name: "web", languageId: "react", customSkills: ["ddd"] };

const REGISTRY = { globalCustomSkills: [{ id: "code-conventions" }, { id: "retired-skill" }] };

/** Everything exists except the two named — the layer-dropping case. */
const availability = (missing: string[]) => (name: string) => !missing.includes(name);

const opts = (over: Partial<Parameters<typeof explainRouting>[0]> = {}) => ({
  taskId: "TASK-040",
  step: "implement",
  modules: [API],
  registry: REGISTRY,
  skillExists: availability(["retired-skill"]),
  ...over,
});

describe("the trace records every candidate, not only the survivors", () => {
  test("the base step skill is always included", () => {
    const { trace } = explainRouting(opts({ skillExists: () => false }));
    const base = trace.find((e) => e.layer === "base")!;
    expect(base).toEqual({ layer: "base", skill: "nit:implement", source: "implement", included: true });
  });

  test("a language skill with no SKILL.md is recorded as dropped, not omitted", () => {
    const { routing, trace } = explainRouting(opts({ skillExists: availability(["typescript"]) }));
    expect(routing.languageSkill).toBeUndefined();
    expect(trace.find((e) => e.layer === "language")).toEqual({
      layer: "language",
      skill: "typescript",
      source: "api",
      included: false,
      dropped: "absent",
    });
  });

  test("each custom skill names the module that contributed it", () => {
    const { trace } = explainRouting(opts());
    const custom = trace.filter((e) => e.layer === "custom");
    expect(custom.map((e) => [e.skill, e.source])).toEqual([
      ["spring-boot", "api"],
      ["ddd", "api"],
    ]);
  });

  test("a step override is its own layer, naming the step it applies at", () => {
    const { trace } = explainRouting(opts());
    expect(trace.filter((e) => e.layer === "step-override")).toEqual([
      { layer: "step-override", skill: "migrations", source: "api @ implement", included: true },
    ]);
  });

  test("a step override for another step contributes nothing here", () => {
    const { trace } = explainRouting(opts({ step: "design" }));
    expect(trace.filter((e) => e.layer === "step-override")).toEqual([]);
  });

  test("a global skill with no SKILL.md is recorded as dropped", () => {
    const { routing, trace } = explainRouting(opts());
    expect(routing.globalSkills).toEqual(["code-conventions"]);
    expect(trace.find((e) => e.skill === "retired-skill")).toMatchObject({
      layer: "global",
      source: "registry/skills.json",
      included: false,
      dropped: "absent",
    });
  });

  // The two modules share `ddd`. Without this the second contribution simply
  // vanishes, and the person who configured it on `web` has no way to learn that
  // it was already there rather than missing.
  test("a skill two modules both contribute is recorded once as a duplicate", () => {
    const { routing, trace } = explainRouting(opts({ modules: [API, WEB] }));
    const ddd = trace.filter((e) => e.skill === "ddd");
    expect(ddd).toHaveLength(2);
    expect(ddd[0]).toMatchObject({ source: "api", included: true });
    expect(ddd[1]).toMatchObject({ source: "web", included: false, dropped: "duplicate" });
    expect(routing.customSkills!.filter((s) => s === "ddd")).toHaveLength(1);
  });

  // RV-2 — two modules sharing a language put it in the language layer *and*
  // the custom layer, and the agent received the same skill twice. Pre-existing,
  // and invisible until the trace made every candidate visible.
  test("a language two modules share is not handed to the agent twice", () => {
    const CLI: ModuleEntry = { name: "cli", languageId: "typescript" };
    const { routing, trace } = explainRouting(opts({ modules: [API, CLI], skillExists: () => true }));
    expect(orderedSkillList(routing).filter((s) => s === "typescript")).toHaveLength(1);
    expect(trace.find((e) => e.layer === "custom" && e.skill === "typescript")).toMatchObject({
      source: "cli",
      included: false,
      dropped: "duplicate",
    });
  });

  test("a secondary module's language enters the custom layer, named by its module", () => {
    const { trace } = explainRouting(opts({ modules: [API, WEB] }));
    expect(trace.find((e) => e.skill === "react")).toMatchObject({ layer: "custom", source: "web" });
  });

  test("every dropped entry says why", () => {
    const { trace } = explainRouting(opts({ modules: [API, WEB], skillExists: availability(["typescript", "retired-skill"]) }));
    for (const e of trace.filter((x) => !x.included)) {
      expect(["absent", "duplicate"]).toContain(e.dropped!);
    }
    for (const e of trace.filter((x) => x.included)) {
      expect(e.dropped).toBeUndefined();
    }
  });

  test("every layer the model declares can appear in a trace", () => {
    const { trace } = explainRouting(opts({ modules: [API, WEB] }));
    expect([...new Set(trace.map((e) => e.layer))].sort()).toEqual([...ROUTING_LAYERS].sort());
  });
});

// Two views of one composition. If these ever diverged, the explanation would
// describe a routing the supervisor does not perform — which is worse than no
// explanation, because it would be believed.
describe("the explanation and the routing come from one pass", () => {
  const cases: [string, Parameters<typeof explainRouting>[0]][] = [
    ["single module", opts()],
    ["cross-module", opts({ modules: [API, WEB] })],
    ["nothing available", opts({ skillExists: () => false })],
    ["everything available", opts({ skillExists: () => true })],
    ["no registry", opts({ registry: undefined })],
    ["a step with no override", opts({ step: "review" })],
  ];

  test.each(cases)("%s: resolveRouting returns exactly what explainRouting resolved", (_name, o) => {
    const viaExplain = { ...explainRouting(o).routing, resolvedAt: "fixed" };
    const viaResolve = { ...resolveRouting(o), resolvedAt: "fixed" };
    expect(viaResolve).toEqual(viaExplain);
  });

  test.each(cases)("%s: every included candidate is in the resolved skill list, and no other", (_name, o) => {
    const { routing, trace } = explainRouting(o);
    expect(orderedSkillList(routing).sort()).toEqual(
      trace.filter((e) => e.included).map((e) => e.skill).sort()
    );
  });
});

describe("the rendered chain", () => {
  const rendered = () => renderExplanation(explainRouting(opts({ modules: [API, WEB] })), "implement");

  // AC-1
  test("it names all five layers", () => {
    for (const layer of ROUTING_LAYERS) expect(rendered()).toContain(`${layer}:`);
  });

  test("it shows which layer contributed each skill", () => {
    expect(rendered()).toContain("+ migrations  <- api @ implement");
    expect(rendered()).toContain("+ spring-boot  <- api");
  });

  test("it shows what was dropped and why", () => {
    expect(rendered()).toContain("- retired-skill  <- registry/skills.json  (dropped: absent)");
    expect(rendered()).toContain("(dropped: duplicate)");
  });

  test("it ends with the list the agent would actually receive", () => {
    const routing = explainRouting(opts({ modules: [API, WEB] })).routing;
    expect(rendered()).toContain(`resolved skill list: ${orderedSkillList(routing).join(" -> ")}`);
  });

  // An empty layer omitted reads as an oversight; the question this command
  // answers is usually "why is my skill not here".
  test("a layer with no candidates says so rather than disappearing", () => {
    const text = renderExplanation(explainRouting(opts({ registry: undefined })), "implement");
    expect(text).toContain("global: (nothing configured)");
  });
});

describe("the commands", () => {
  function workspace(over: { targetModule?: string; state?: unknown; archetype?: string } = {}) {
    const dir = mkdtempSync(join(tmpdir(), "routing-"));
    const taskDir = join(dir, "TASK-040");
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      join(taskDir, "task.json"),
      JSON.stringify({
        id: "TASK-040",
        phase: "PHASE-4",
        title: "t",
        type: "devops",
        targetModule: over.targetModule ?? "api",
        status: "draft",
        archetype: over.archetype ?? "infra-change",
        acceptanceCriteria: [],
      })
    );
    if (over.state !== undefined) writeFileSync(join(taskDir, "state.json"), JSON.stringify(over.state));

    const modulesPath = join(dir, "modules.json");
    writeFileSync(modulesPath, JSON.stringify({ modules: [API, WEB] }));
    const registryPath = join(dir, "skills.json");
    writeFileSync(registryPath, JSON.stringify(REGISTRY));

    // A skills tree where the language skill exists and one global does not.
    const skillsDir = join(dir, "skills");
    for (const name of ["implement", "analyze", "typescript", "spring-boot", "ddd", "migrations", "code-conventions"]) {
      mkdirSync(join(skillsDir, name), { recursive: true });
      writeFileSync(join(skillsDir, name, "SKILL.md"), `# ${name}\n`);
    }
    return {
      dir,
      taskDir,
      base: ["--task-dir", taskDir, "--modules", modulesPath, "--registry", registryPath, "--skills-dir", skillsDir],
    };
  }

  function capture(): { said: string[]; restore: () => void } {
    const said: string[] = [];
    const log = console.log;
    const err = console.error;
    console.log = (...a: unknown[]) => void said.push(a.join(" "));
    console.error = (...a: unknown[]) => void said.push(a.join(" "));
    return { said, restore: () => { console.log = log; console.error = err; } };
  }

  async function run(fn: (a: string[]) => Promise<number>, args: string[]): Promise<{ code: number; out: string }> {
    const c = capture();
    try {
      const code = await fn(args);
      return { code, out: c.said.join("\n") };
    } finally {
      c.restore();
    }
  }

  // AC-1
  test("explain-routing prints the whole chain for the task's current step", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "implement", stepOrder: ["implement"] } });
    const { code, out } = await run(runExplainRouting, w.base);
    expect(code).toBe(0);
    expect(out).toContain('at step "implement"');
    for (const layer of ROUTING_LAYERS) expect(out).toContain(`${layer}:`);
    expect(out).toContain("+ typescript  <- api");
    expect(out).toContain("- retired-skill  <- registry/skills.json  (dropped: absent)");
  });

  test("the step comes from state.json when it is not given", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "review", stepOrder: ["implement", "review"] } });
    const { out } = await run(runExplainRouting, w.base);
    expect(out).toContain('at step "review"');
  });

  test("--step overrides where the task actually is", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "review", stepOrder: ["review"] } });
    const { out } = await run(runExplainRouting, [...w.base, "--step", "implement"]);
    expect(out).toContain('at step "implement"');
  });

  // A task that has not started has no state.json, and its routing is still a
  // fair question — the answer is what its first step would get.
  test("with no state.json it falls back to the archetype's first step", async () => {
    const w = workspace();
    const { code, out } = await run(runExplainRouting, w.base);
    expect(code).toBe(0);
    expect(out).toContain('at step "analyze"');
  });

  test("--json emits the trace as data", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "implement", stepOrder: ["implement"] } });
    const { code, out } = await run(runExplainRouting, [...w.base, "--json"]);
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(parsed.step).toBe("implement");
    expect(parsed.routing.baseSkill).toBe("nit:implement");
    expect(parsed.trace.some((e: { dropped?: string }) => e.dropped === "absent")).toBe(true);
  });

  // AC-2
  test("resolve-routing writes a schema-valid routing.json beside the task", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "implement", stepOrder: ["implement"] } });
    const { code } = await run(runResolveRouting, w.base);
    expect(code).toBe(0);
    const written = JSON.parse(readFileSync(join(w.taskDir, "routing.json"), "utf8"));
    const validate = createAjv().compile(require(resolveSchema("routing")!));
    expect(validate(written)).toBe(true);
    expect(written.baseSkill).toBe("nit:implement");
    expect(written.targetModule).toBe("api");
  });

  test("it resolves for the current step, not the first one", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "review", stepOrder: ["analyze", "review"] } });
    await run(runResolveRouting, w.base);
    expect(JSON.parse(readFileSync(join(w.taskDir, "routing.json"), "utf8")).baseSkill).toBe("nit:review");
  });

  // RV-1 — the same lesson as TASK-039's RV-3: routing.json is committed, and a
  // rebuild that only moves a timestamp shows a diff claiming a change that did
  // not happen. Diffs that lie get skimmed.
  test("re-resolving an unchanged routing does not rewrite the file", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "implement", stepOrder: ["implement"] } });
    await run(runResolveRouting, w.base);
    const first = readFileSync(join(w.taskDir, "routing.json"), "utf8");
    // Without this the two runs land in the same millisecond and the test passes
    // whether or not the timestamp is preserved — a false green found by
    // reverting the mechanism and seeing nothing fail.
    await new Promise((r) => setTimeout(r, 5));
    const { code, out } = await run(runResolveRouting, w.base);
    expect(code).toBe(0);
    expect(readFileSync(join(w.taskDir, "routing.json"), "utf8")).toBe(first);
    expect(JSON.parse(out).unchanged).toBe(true);
  });

  test("a routing that did change is written, timestamp and all", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "implement", stepOrder: ["implement", "review"] } });
    await run(runResolveRouting, w.base);
    const first = JSON.parse(readFileSync(join(w.taskDir, "routing.json"), "utf8"));
    await new Promise((r) => setTimeout(r, 5));
    const { out } = await run(runResolveRouting, [...w.base, "--step", "review"]);
    const second = JSON.parse(readFileSync(join(w.taskDir, "routing.json"), "utf8"));
    expect(second.baseSkill).toBe("nit:review");
    expect(second.resolvedAt).not.toBe(first.resolvedAt);
    expect(JSON.parse(out).unchanged).toBe(false);
  });

  test("--out puts it elsewhere", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "implement", stepOrder: ["implement"] } });
    const out = join(w.dir, "elsewhere.json");
    await run(runResolveRouting, [...w.base, "--out", out]);
    expect(existsSync(out)).toBe(true);
    expect(existsSync(join(w.taskDir, "routing.json"))).toBe(false);
  });

  test("what it writes is what explain-routing describes", async () => {
    const w = workspace({ state: { taskId: "TASK-040", currentStepId: "implement", stepOrder: ["implement"] } });
    await run(runResolveRouting, w.base);
    const written = JSON.parse(readFileSync(join(w.taskDir, "routing.json"), "utf8"));
    const { out } = await run(runExplainRouting, [...w.base, "--json"]);
    const explained = JSON.parse(out).routing;
    expect({ ...written, resolvedAt: "fixed" }).toEqual({ ...explained, resolvedAt: "fixed" });
  });

  // AC-3
  test.each([
    ["explain-routing", runExplainRouting],
    ["resolve-routing", runResolveRouting],
  ])("%s fails on a module the registry does not hold, naming it and the file", async (_n, fn) => {
    const w = workspace({ targetModule: "ghost" });
    const { code, out } = await run(fn, w.base);
    expect(code).toBe(2);
    expect(out).toContain('Module "ghost" is not in');
    expect(out).toContain("modules.json");
    expect(out).toContain("api, web");
  });

  // The failure has to be a failure. A partial chain would be read as the
  // configuration's fault rather than the registry's.
  test("a missing module resolves nothing at all — no partial routing is written", async () => {
    const w = workspace({ targetModule: "ghost" });
    await run(runResolveRouting, w.base);
    expect(existsSync(join(w.taskDir, "routing.json"))).toBe(false);
  });

  test("a secondary module missing from the registry fails too", async () => {
    const w = workspace();
    const { code, out } = await run(runExplainRouting, [...w.base, "--targets", "api,ghost"]);
    expect(code).toBe(2);
    expect(out).toContain('Module "ghost" is not in');
  });

  test.each([
    ["explain-routing", runExplainRouting],
    ["resolve-routing", runResolveRouting],
  ])("%s without --task-dir is a usage error", async (_n, fn) => {
    const { code, out } = await run(fn, []);
    expect(code).toBe(2);
    expect(out).toContain("--task-dir is required");
  });

  test("a missing module registry points at nit:init rather than crashing", async () => {
    const w = workspace();
    const { code, out } = await run(runExplainRouting, [
      "--task-dir", w.taskDir, "--modules", join(w.dir, "nope.json"),
    ]);
    expect(code).toBe(2);
    expect(out).toContain("Module registry not found");
    expect(out).toContain("/nit:init");
  });

  test("a directory with no task.json says so", async () => {
    const w = workspace();
    const { code, out } = await run(runExplainRouting, ["--task-dir", w.dir]);
    expect(code).toBe(2);
    expect(out).toContain("No task.json in");
  });
});

// A command nothing invokes is decoration. The skill that composes routing is
// the caller, so the wiring is part of the task, not a follow-up.
describe("nit:compose-routing uses the commands", () => {
  const ROOT = dirname(dirname(import.meta.dir));
  const skill = readFileSync(join(ROOT, ".claude/skills/compose-routing/SKILL.md"), "utf8");

  test("it resolves from the task directory rather than restating the step", () => {
    expect(skill).toContain("resolve-routing \\\n     --task-dir");
  });

  test("it points at explain-routing for a skill that did not make the list", () => {
    expect(skill).toContain("explain-routing --task-dir");
    expect(skill).toMatch(/absent|duplicate/);
  });

  test("the commands it names are commands the CLI has", () => {
    const cli = readFileSync(join(ROOT, "cli/src/cli.ts"), "utf8");
    for (const command of ["resolve-routing", "explain-routing", "route"]) {
      expect(cli).toContain(`case "${command}":`);
    }
  });
});

// The supervisor answered the same question differently: a target absent from
// the registry fell through to base-skill-only dispatch, silently, and the
// specialist got a shorter list than configured with nothing said about it.
describe("the supervisor does not resolve a partial chain either", () => {
  test("an unknown --target stops the dispatch and names the module", async () => {
    const dir = mkdtempSync(join(tmpdir(), "continue-target-"));
    const taskDir = join(dir, "TASK-040");
    mkdirSync(taskDir, { recursive: true });
    const modulesPath = join(dir, "modules.json");
    writeFileSync(modulesPath, JSON.stringify({ modules: [API, WEB] }));

    const said: string[] = [];
    const err = console.error;
    console.error = (...a: unknown[]) => void said.push(a.join(" "));
    let code: number;
    try {
      code = await runContinue([
        "--task-dir", taskDir, "--archetype", "infra-change",
        "--target", "ghost", "--modules", modulesPath, "--dry-run",
      ]);
    } finally {
      console.error = err;
    }
    expect(code).toBe(1);
    expect(said.join("\n")).toContain('Module "ghost" is not in');
    expect(said.join("\n")).toContain("api, web");
  });
});
