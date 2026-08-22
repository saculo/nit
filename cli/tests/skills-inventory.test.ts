import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  buildInventory,
  missing,
  renderInventory,
  skillsOnDisk,
  skillDescription,
  SKILL_GROUPS,
  sameFile,
  type SkillRecord,
} from "../src/skills-inventory";
import { runSkills, shippedStepIds } from "../src/commands/skills";
import type { ModuleEntry } from "../src/routing-resolver";

const ROOT = dirname(dirname(import.meta.dir));

const API: ModuleEntry = {
  name: "api",
  languageId: "typescript",
  customSkills: ["ddd"],
  stepOverrides: { implement: { addSkills: ["migrations"] } },
};
const WEB: ModuleEntry = { name: "web", languageId: "typescript", customSkills: ["ddd", "a11y"] };

/** A skills directory holding exactly the named skills. */
function skillsDir(names: string[], descriptions: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "skills-"));
  for (const name of names) {
    mkdirSync(join(dir, name), { recursive: true });
    const body = descriptions[name]
      ? `---\nname: ${name}\ndescription: "${descriptions[name]}"\n---\n\n# ${name}\n`
      : `# ${name}\n`;
    writeFileSync(join(dir, name, "SKILL.md"), body);
  }
  return dir;
}

const inventory = (over: Partial<Parameters<typeof buildInventory>[0]> = {}) =>
  buildInventory({
    stepIds: ["analyze", "implement"],
    modules: [API],
    registry: { globalCustomSkills: [{ id: "code-conventions" }] },
    skillsRootDir: skillsDir(["analyze", "implement", "typescript", "ddd", "migrations", "code-conventions"]),
    ...over,
  });

const byName = (records: SkillRecord[], name: string) => records.find((r) => r.name === name)!;

describe("reading what is on disk", () => {
  test("a directory with a SKILL.md counts", () => {
    expect(skillsOnDisk(skillsDir(["one", "two"]))).toEqual(["one", "two"]);
  });

  test("a directory without a SKILL.md does not", () => {
    const dir = skillsDir(["real"]);
    mkdirSync(join(dir, "empty"), { recursive: true });
    expect(skillsOnDisk(dir)).toEqual(["real"]);
  });

  test("a skills root that does not exist is empty, not an error", () => {
    expect(skillsOnDisk(join(tmpdir(), "nit-no-such-dir-41"))).toEqual([]);
  });

  test("a skill's description comes from its own frontmatter", () => {
    const dir = skillsDir(["one"], { one: "Does the thing." });
    expect(skillDescription(join(dir, "one", "SKILL.md"))).toBe("Does the thing.");
  });

  test("a skill with no frontmatter simply has no description", () => {
    const dir = skillsDir(["one"]);
    expect(skillDescription(join(dir, "one", "SKILL.md"))).toBeUndefined();
  });

  // RV-2 — a `description:` inside a body example is not the skill describing
  // itself, and quoting one puts someone else's words in the listing.
  test("a description: line in the body is not mistaken for the skill's own", () => {
    const dir = mkdtempSync(join(tmpdir(), "skills-body-"));
    mkdirSync(join(dir, "one"), { recursive: true });
    writeFileSync(
      join(dir, "one", "SKILL.md"),
      "# one\n\nWrite a task.json:\n\n```yaml\ndescription: \"not the skill's own\"\n```\n"
    );
    expect(skillDescription(join(dir, "one", "SKILL.md"))).toBeUndefined();
  });

  test("a long description is truncated rather than flooding the listing", () => {
    const dir = skillsDir(["one"], { one: "x".repeat(400) });
    expect(skillDescription(join(dir, "one", "SKILL.md"))!.length).toBeLessThanOrEqual(140);
  });
});

// AC-1
describe("grouping by layer", () => {
  test("a base step skill is named for its step and records it", () => {
    const analyze = byName(inventory(), "nit:analyze");
    expect(analyze.group).toBe("base");
    expect(analyze.steps).toEqual(["analyze"]);
    expect(analyze.present).toBe(true);
  });

  test("a language skill names the modules that use it", () => {
    const records = inventory({ modules: [API, WEB] });
    expect(byName(records, "typescript")).toMatchObject({
      group: "language",
      modules: ["api", "web"],
    });
  });

  test("a custom skill two modules declare is listed once, naming both", () => {
    const records = inventory({ modules: [API, WEB] });
    expect(records.filter((r) => r.name === "ddd")).toHaveLength(1);
    expect(byName(records, "ddd").modules).toEqual(["api", "web"]);
  });

  test("a step-override skill records the step it applies at", () => {
    expect(byName(inventory(), "migrations")).toMatchObject({
      group: "custom",
      modules: ["api"],
      steps: ["implement"],
    });
  });

  test("a global skill is listed with no module", () => {
    expect(byName(inventory(), "code-conventions")).toMatchObject({ group: "global", modules: [] });
  });

  // Command and internal skills belong to no routing layer. Omitting them would
  // make `nit skills` answer "what is wired" while looking like "what is here".
  test("a skill on disk that no layer references is listed under other", () => {
    const records = inventory({
      skillsRootDir: skillsDir(["analyze", "implement", "typescript", "ddd", "migrations", "code-conventions", "init"]),
    });
    expect(byName(records, "init").group).toBe("other");
  });

  test("groups come out in composition order", () => {
    const records = inventory({ skillsRootDir: skillsDir(["analyze", "init"]) });
    const seen = [...new Set(records.map((r) => r.group))];
    expect(seen).toEqual([...SKILL_GROUPS].filter((g) => seen.includes(g)));
  });

  test("every group the model declares can be produced", () => {
    const records = inventory({
      modules: [API, WEB],
      skillsRootDir: skillsDir(["analyze", "implement", "typescript", "ddd", "migrations", "code-conventions", "init"]),
    });
    expect([...new Set(records.map((r) => r.group))].sort()).toEqual([...SKILL_GROUPS].sort());
  });
});

// AC-2 — the whole point: routing drops these silently, so a listing that also
// dropped them would hide the failure it exists to reveal.
describe("declared but absent", () => {
  const withGaps = () => inventory({ skillsRootDir: skillsDir(["analyze", "implement"]) });

  test("a language skill with no SKILL.md is listed as missing, not omitted", () => {
    expect(byName(withGaps(), "typescript")).toMatchObject({ present: false, modules: ["api"] });
  });

  test("a custom skill with no SKILL.md is listed as missing", () => {
    expect(byName(withGaps(), "ddd").present).toBe(false);
  });

  test("a global skill with no SKILL.md is listed as missing", () => {
    expect(byName(withGaps(), "code-conventions").present).toBe(false);
  });

  test("missing() collects exactly the absent ones", () => {
    expect(missing(withGaps()).map((r) => r.name).sort()).toEqual([
      "code-conventions",
      "ddd",
      "migrations",
      "typescript",
    ]);
  });

  test("a base step skill with no SKILL.md is missing too — that step cannot be dispatched", () => {
    const records = inventory({ stepIds: ["analyze", "ghost"], skillsRootDir: skillsDir(["analyze"]) });
    expect(byName(records, "nit:ghost").present).toBe(false);
  });

  test("the rendering says a missing skill is silently dropped at routing", () => {
    const text = renderInventory(withGaps());
    expect(text).toContain("! typescript");
    expect(text).toContain("MISSING — no SKILL.md; routing drops it silently");
    expect(text).toContain("4 declared and missing");
  });

  test("a project with everything present says so rather than staying silent", () => {
    expect(renderInventory(inventory())).toContain("skills, all present.");
  });

  test("the rendering names the modules behind each skill", () => {
    expect(renderInventory(inventory({ modules: [API, WEB] }))).toContain("typescript  <- api, web");
  });
});

// AC-3 — derived, not written down.
describe("the step ids come from the archetypes", () => {
  test("every step of every shipped archetype is a base skill the project owes", async () => {
    const steps = await shippedStepIds(join(ROOT, "cli/archetypes"));
    expect(steps).toContain("analyze");
    expect(steps).toContain("implement");
    // Only cross-module-change carries it, so a hardcoded five-step list misses it.
    expect(steps).toContain("boundary-check");
  });

  test("an abstract archetype contributes nothing, since nothing dispatches it", async () => {
    const base = JSON.parse(readFileSync(join(ROOT, "cli/archetypes/base.json"), "utf8"));
    expect(base.abstract).toBe(true);
    expect(await shippedStepIds(join(ROOT, "cli/archetypes"))).not.toContain("base");
  });

  test("a directory with no archetypes yields no steps rather than failing", async () => {
    expect(await shippedStepIds(join(tmpdir(), "nit-no-archetypes-41"))).toEqual([]);
  });
});

describe("the command", () => {
  function capture(): { said: string[]; restore: () => void } {
    const said: string[] = [];
    const log = console.log;
    const err = console.error;
    console.log = (...a: unknown[]) => void said.push(a.join(" "));
    console.error = (...a: unknown[]) => void said.push(a.join(" "));
    return { said, restore: () => { console.log = log; console.error = err; } };
  }

  async function run(args: string[]): Promise<{ code: number; out: string }> {
    const c = capture();
    try {
      return { code: await runSkills(args), out: c.said.join("\n") };
    } finally {
      c.restore();
    }
  }

  function workspace(over: { skills?: string[]; modules?: ModuleEntry[] } = {}) {
    const dir = mkdtempSync(join(tmpdir(), "skills-cmd-"));
    const modulesPath = join(dir, "modules.json");
    writeFileSync(modulesPath, JSON.stringify({ modules: over.modules ?? [API] }));
    const registryPath = join(dir, "skills.json");
    writeFileSync(registryPath, JSON.stringify({ globalCustomSkills: [{ id: "code-conventions" }] }));
    // The default fixture is a complete project: every step the real archetypes
    // dispatch, plus everything the module and registry declare.
    const root = skillsDir(
      over.skills ?? [
        "analyze", "design", "implement", "review", "qa", "boundary-check",
        "typescript", "ddd", "migrations", "code-conventions",
      ]
    );
    return {
      dir,
      base: [
        "--modules", modulesPath,
        "--registry", registryPath,
        "--skills-dir", root,
        "--archetypes", join(ROOT, "cli/archetypes"),
      ],
    };
  }

  // AC-3
  test("with no arguments it exits 0 against this repository", async () => {
    const { code, out } = await run([]);
    expect(code).toBe(0);
    expect(out).toContain("nit:analyze");
  });

  test("what it reports is what is on disk, not a fixed list", async () => {
    const w = workspace({ skills: ["analyze", "only-here"] });
    const { out } = await run(w.base);
    expect(out).toContain("only-here");
    // Absent from this fixture's disk, so reported missing rather than present.
    expect(out).toContain("! typescript");
  });

  // AC-3 — the command's base layer must come from the archetypes too. Only
  // cross-module-change carries `boundary-check`, so a list written down inside
  // the command rather than derived would be missing it. Found by reverting the
  // derivation and seeing the unit tests pass regardless.
  test("the command's base layer includes a step only one archetype dispatches", async () => {
    const w = workspace();
    const { out } = await run([...w.base, "--json"]);
    const base = JSON.parse(out).skills.filter((s: SkillRecord) => s.group === "base");
    expect(base.map((s: SkillRecord) => s.name)).toContain("nit:boundary-check");
  });

  test("--json emits the records as data", async () => {
    const w = workspace();
    const { code, out } = await run([...w.base, "--json"]);
    expect(code).toBe(0);
    const parsed = JSON.parse(out);
    expect(parsed.skills.some((s: SkillRecord) => s.group === "base")).toBe(true);
    expect(parsed.missing).toBe(0);
  });

  test("--missing exits 1 and shows only the gaps", async () => {
    const w = workspace({ skills: ["analyze"] });
    const { code, out } = await run([...w.base, "--missing"]);
    expect(code).toBe(1);
    expect(out).toContain("typescript");
    expect(out).not.toContain("+ analyze");
  });

  test("--missing on a complete project exits 0 and says so", async () => {
    const w = workspace({
      skills: ["analyze", "design", "implement", "review", "qa", "boundary-check", "typescript", "ddd", "migrations", "code-conventions"],
    });
    const { code, out } = await run([...w.base, "--missing"]);
    expect(code).toBe(0);
    expect(out).toContain("No declared skill is missing");
  });

  // A listing is not a verdict: someone asking what they have should get an
  // answer, not an exit code, or they will stop asking.
  test("a plain listing exits 0 even when skills are missing", async () => {
    const w = workspace({ skills: ["analyze"] });
    expect((await run(w.base)).code).toBe(0);
  });

  test("a project with no registries still reports what is on disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "skills-bare-"));
    const { code, out } = await run([
      "--modules", join(dir, "none.json"),
      "--registry", join(dir, "none.json"),
      "--skills-dir", skillsDir(["analyze", "init"]),
      "--archetypes", join(ROOT, "cli/archetypes"),
    ]);
    expect(code).toBe(0);
    expect(out).toContain("init");
  });
});

// This repository declares two language skills it does not have. The command
// reporting that is the command working; a test asserting they exist would be
// asserting the gap away.
describe("against this repository", () => {
  test("it reports the language skills the modules declare and the tree lacks", async () => {
    const modules: ModuleEntry[] = JSON.parse(
      readFileSync(join(ROOT, ".nit/boundaries/modules.json"), "utf8")
    ).modules;
    const records = buildInventory({
      stepIds: await shippedStepIds(join(ROOT, "cli/archetypes")),
      modules,
      registry: JSON.parse(readFileSync(join(ROOT, ".nit/registry/skills.json"), "utf8")),
      skillsRootDir: join(ROOT, ".claude/skills"),
    });
    expect(missing(records).map((r) => r.name).sort()).toEqual(["markdown", "typescript"]);
  });

  test("every step of every shipped archetype has a skill on disk", async () => {
    const records = buildInventory({
      stepIds: await shippedStepIds(join(ROOT, "cli/archetypes")),
      modules: [],
      skillsRootDir: join(ROOT, ".claude/skills"),
    });
    expect(records.filter((r) => r.group === "base" && !r.present)).toEqual([]);
  });
});

// A command nothing invokes is decoration. nit:init is where a workspace first
// declares skills it may not have, so it is where the gap should be reported.
describe("nit:init verifies what it referenced", () => {
  const initSkill = readFileSync(join(ROOT, ".claude/skills/init/SKILL.md"), "utf8");

  test("it runs the check after writing the registries", () => {
    expect(initSkill).toContain("cli.ts skills --missing");
    expect(initSkill.indexOf("skills --missing")).toBeGreaterThan(initSkill.indexOf("### 5c — skills.json"));
  });

  test("it forbids creating empty stubs to silence the check", () => {
    expect(initSkill).toMatch(/Do NOT create stubs/);
  });

  test("the command it names is a command the CLI has", () => {
    expect(readFileSync(join(ROOT, "cli/src/cli.ts"), "utf8")).toContain('case "skills":');
  });
});

// moduleSkills was declared by the registry schema, scaffolded by nit:init, and
// read by nothing — routing has never consumed it. ADR-0007 gives a declared
// field one job, and a listing that showed those skills would have claimed they
// were available when nothing would ever route them.
describe("the skills registry declares nothing without a consumer", () => {
  test("moduleSkills is gone from the schema", () => {
    const schema = JSON.parse(readFileSync(join(ROOT, "cli/schemas/skills-registry.schema.json"), "utf8"));
    expect(Object.keys(schema.properties)).toEqual(["globalCustomSkills"]);
    expect(schema.required).toEqual(["globalCustomSkills"]);
  });

  test("nit:init no longer scaffolds it", () => {
    expect(readFileSync(join(ROOT, ".claude/skills/init/SKILL.md"), "utf8")).not.toContain("moduleSkills");
  });

  test("this workspace's registry is valid without it", () => {
    const registry = JSON.parse(readFileSync(join(ROOT, ".nit/registry/skills.json"), "utf8"));
    expect(registry).toEqual({ globalCustomSkills: [] });
  });
});

// RV-3 — `nit:review` and a custom skill called `review` are one file, composed
// into two layers, so the agent receives the same guidance twice under two
// names. The same defect class TASK-040 found between the language and custom
// layers, visible here because this is where every name is listed side by side.
describe("two names for one file", () => {
  const collide = () =>
    buildInventory({
      stepIds: ["review"],
      modules: [{ name: "api", languageId: "typescript", customSkills: ["review"] }],
      skillsRootDir: skillsDir(["review", "typescript"]),
    });

  test("both names are listed, in their own layers", () => {
    const records = collide();
    expect(byName(records, "nit:review").group).toBe("base");
    expect(byName(records, "review").group).toBe("custom");
  });

  test("the collision is detected", () => {
    expect(sameFile(collide())[0]!.map((r) => r.name).sort()).toEqual(["nit:review", "review"]);
  });

  test("the listing says the agent would receive it more than once", () => {
    expect(renderInventory(collide())).toContain("routing would hand it to the agent more than once");
  });

  test("an absent skill is not a collision — two names for one missing file is one gap", () => {
    const records = buildInventory({
      stepIds: ["review"],
      modules: [{ name: "api", languageId: "typescript", customSkills: ["review"] }],
      skillsRootDir: skillsDir([]),
    });
    expect(sameFile(records)).toEqual([]);
  });

  test("this repository has no such collision", async () => {
    const modules = JSON.parse(readFileSync(join(ROOT, ".nit/boundaries/modules.json"), "utf8")).modules;
    const records = buildInventory({
      stepIds: await shippedStepIds(join(ROOT, "cli/archetypes")),
      modules,
      registry: JSON.parse(readFileSync(join(ROOT, ".nit/registry/skills.json"), "utf8")),
      skillsRootDir: join(ROOT, ".claude/skills"),
    });
    expect(sameFile(records)).toEqual([]);
  });
});

// RV-1 — a footer counting the filter's output as the project's skills
// misreports the project to the person who filtered.
describe("a filtered view still reports the whole project", () => {
  test("--missing counts the inventory, not the gaps", () => {
    const records = inventory({ skillsRootDir: skillsDir(["analyze", "implement"]) });
    const text = renderInventory(missing(records), records.length);
    expect(text).toContain(`${records.length} skills, 4 declared and missing`);
    expect(text).not.toContain("4 skills, 4 declared");
  });
});
