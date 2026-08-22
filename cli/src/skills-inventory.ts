import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { skillFilePath, type ModuleEntry, type SkillsRegistry } from "./routing-resolver";

/**
 * Where a skill comes from, in routing's composition order, plus one group for
 * skills that are on disk and no routing layer references.
 */
export const SKILL_GROUPS = ["base", "language", "custom", "global", "other"] as const;
export type SkillGroup = (typeof SKILL_GROUPS)[number];

/** One skill, with everything that claims it and whether it exists. */
export interface SkillRecord {
  name: string;
  group: SkillGroup;
  present: boolean;
  path: string;
  /** Modules that associate this skill, empty for global and base skills. */
  modules: string[];
  /** For a base step skill, the step ids it serves. */
  steps?: string[];
  /** First line of the skill's `description:` frontmatter, when it has one. */
  description?: string;
}

export interface InventoryInput {
  /** Every step id any shipped archetype dispatches. */
  stepIds: string[];
  modules: ModuleEntry[];
  registry?: SkillsRegistry;
  skillsRootDir: string;
}

/** Skill directories on disk — the source of truth for what actually exists. */
export function skillsOnDisk(skillsRootDir: string): string[] {
  if (!existsSync(skillsRootDir)) return [];
  return readdirSync(skillsRootDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(skillsRootDir, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

/**
 * The one-line description a SKILL.md declares, if it declares one.
 *
 * Read from the file rather than from a registry: a registry entry is a claim
 * about a skill, and the skill itself is the fact.
 */
export function skillDescription(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  const source = readFileSync(path, "utf8");
  // Frontmatter only. A `description:` line inside a body example is not the
  // skill describing itself, and quoting one would put someone else's words in
  // the listing.
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return undefined;
  const match = frontmatter[1]!.match(/^description:\s*"?(.*?)"?\s*$/m);
  const text = match?.[1]?.trim();
  if (!text) return undefined;
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

/**
 * Every skill the project references or ships, grouped by routing layer.
 *
 * Two properties make this worth having rather than an `ls`. A skill declared in
 * a module or the registry and absent from disk is listed as **missing** rather
 * than omitted — that is precisely what routing does silently at dispatch, and
 * a listing that also omitted it would hide the failure it exists to reveal
 * (TASK-041 AC-2). And a skill on disk that no layer references is listed under
 * `other`, so the command answers "what is here" as well as "what is wired".
 */
export function buildInventory(input: InventoryInput): SkillRecord[] {
  const { stepIds, modules, registry, skillsRootDir } = input;
  const records = new Map<string, SkillRecord>();

  const record = (name: string, group: SkillGroup): SkillRecord => {
    const existing = records.get(name);
    if (existing) return existing;
    const path = skillFilePath(name, skillsRootDir);
    const created: SkillRecord = {
      name,
      group,
      present: existsSync(path),
      path,
      modules: [],
      description: skillDescription(path),
    };
    records.set(name, created);
    return created;
  };

  // Base step skills, derived from the archetypes rather than from a list here:
  // an archetype that adds a step must show up as a skill this project owes.
  for (const step of stepIds) {
    const entry = record(`nit:${step}`, "base");
    entry.steps = [...new Set([...(entry.steps ?? []), step])].sort();
  }

  for (const mod of modules) {
    const language = record(mod.languageId, "language");
    if (!language.modules.includes(mod.name)) language.modules.push(mod.name);

    for (const skill of mod.customSkills ?? []) {
      const entry = record(skill, "custom");
      if (!entry.modules.includes(mod.name)) entry.modules.push(mod.name);
    }
    for (const [step, override] of Object.entries(mod.stepOverrides ?? {})) {
      for (const skill of override?.addSkills ?? []) {
        const entry = record(skill, "custom");
        if (!entry.modules.includes(mod.name)) entry.modules.push(mod.name);
        entry.steps = [...new Set([...(entry.steps ?? []), step])].sort();
      }
    }
  }

  for (const entry of registry?.globalCustomSkills ?? []) {
    record(entry.id, "global");
  }

  // Whatever is left on disk: command skills, internal skills, and anything a
  // project added without wiring it into a module or the registry.
  for (const name of skillsOnDisk(skillsRootDir)) {
    if (!records.has(name) && !records.has(`nit:${name}`)) record(name, "other");
  }

  const order = (g: SkillGroup) => SKILL_GROUPS.indexOf(g);
  return [...records.values()].sort(
    (a, b) => order(a.group) - order(b.group) || a.name.localeCompare(b.name)
  );
}

/** The skills a project declares but does not have. */
export function missing(records: SkillRecord[]): SkillRecord[] {
  return records.filter((r) => !r.present);
}

/**
 * Groups of records that resolve to the same SKILL.md under different names.
 *
 * `nit:review` and a custom skill called `review` are one file, and routing
 * composes them into separate layers — so the agent receives the same guidance
 * twice under two names. The same class of defect TASK-040 found between the
 * language and custom layers, visible here because this is where every name is
 * listed side by side.
 */
export function sameFile(records: SkillRecord[]): SkillRecord[][] {
  const byPath = new Map<string, SkillRecord[]>();
  for (const r of records.filter((x) => x.present)) {
    byPath.set(r.path, [...(byPath.get(r.path) ?? []), r]);
  }
  return [...byPath.values()].filter((group) => group.length > 1);
}

/**
 * Render the inventory for a person reading a terminal.
 *
 * `total` is the size of the whole inventory, which is not `records.length` when
 * the caller is showing a filtered view — a footer counting the filter's output
 * as the project's skills would misreport the project.
 */
export function renderInventory(records: SkillRecord[], total = records.length): string {
  const lines: string[] = [];
  for (const group of SKILL_GROUPS) {
    const inGroup = records.filter((r) => r.group === group);
    if (inGroup.length === 0) continue;
    lines.push(`${group} (${inGroup.length}):`);
    for (const r of inGroup) {
      const mark = r.present ? "+" : "!";
      const where: string[] = [];
      if (r.modules.length > 0) where.push(r.modules.join(", "));
      if (r.steps) where.push(`step: ${r.steps.join(", ")}`);
      if (!r.present) where.push("MISSING — no SKILL.md; routing drops it silently");
      lines.push(`  ${mark} ${r.name}${where.length > 0 ? `  <- ${where.join(" | ")}` : ""}`);
      if (r.description) lines.push(`      ${r.description}`);
    }
    lines.push("");
  }
  const absent = missing(records);
  lines.push(
    absent.length === 0
      ? `${total} skills, all present.`
      : `${total} skills, ${absent.length} declared and missing: ${absent.map((r) => r.name).join(", ")}.`
  );
  for (const group of sameFile(records)) {
    lines.push(
      `Note: ${group.map((r) => r.name).join(" and ")} are the same file (${group[0]!.path}); ` +
        `routing would hand it to the agent more than once.`
    );
  }
  return lines.join("\n");
}
