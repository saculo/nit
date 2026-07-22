import { join } from "path";
import { existsSync } from "fs";

/**
 * A module entry as read from .nit/boundaries/modules.json (the subset the
 * skill composition engine cares about).
 */
export interface ModuleEntry {
  name: string;
  languageId: string;
  customSkills?: string[];
  stepOverrides?: Record<string, { addSkills?: string[] } | undefined>;
}

/** A single global custom skill entry from registry/skills.json. */
export interface GlobalSkillEntry {
  id: string;
  path?: string;
  description?: string;
}

/** The skills registry (registry/skills.json), globalCustomSkills subset. */
export interface SkillsRegistry {
  globalCustomSkills?: GlobalSkillEntry[];
}

/** Inputs to a single routing resolution. */
export interface ResolveRoutingOptions {
  taskId: string;
  /** The current step id from the resolved archetype (e.g. "implement"). */
  step: string;
  /**
   * The target modules for the task, in order. A single-module task passes one
   * entry; a cross-module-change task passes all target modules, the first of
   * which is treated as primary.
   */
  modules: ModuleEntry[];
  /** The skills registry, or undefined when registry/skills.json is absent. */
  registry?: SkillsRegistry;
  /**
   * Root directory holding skill folders (each `<name>/SKILL.md`). Used by the
   * default existence check to drop skills whose SKILL.md does not exist.
   * Defaults to ".claude/skills". Ignored when `skillExists` is provided.
   */
  skillsRootDir?: string;
  /**
   * Predicate deciding whether a skill is available. Defaults to checking
   * `<skillsRootDir>/<name>/SKILL.md` on disk. Injectable so callers (and tests)
   * can supply an alternative source of truth.
   */
  skillExists?: (name: string) => boolean;
}

/** The resolved routing, matching routing.schema.json. */
export interface Routing {
  taskId: string;
  targetModule?: string;
  baseSkill: string;
  languageSkill?: string;
  customSkills?: string[];
  globalSkills?: string[];
  resolvedAt?: string;
}

const DEFAULT_SKILLS_ROOT = ".claude/skills";

/** Derive the base step skill name for a step id by convention (nit:<stepId>). */
export function baseSkillForStep(step: string): string {
  return `nit:${step}`;
}

/** Map a skill name to its SKILL.md path, stripping any nit: namespace prefix. */
export function skillFilePath(name: string, skillsRootDir: string): string {
  const dir = name.startsWith("nit:") ? name.slice("nit:".length) : name;
  return join(skillsRootDir, dir, "SKILL.md");
}

/** True when a skill's SKILL.md exists on disk under the skills root. */
export function skillFileExists(name: string, skillsRootDir: string): boolean {
  return existsSync(skillFilePath(name, skillsRootDir));
}

/** Append items to a list, skipping duplicates and empty values. */
function pushUnique(list: string[], items: string[] | undefined): void {
  for (const item of items ?? []) {
    if (item && !list.includes(item)) list.push(item);
  }
}

/**
 * Resolve the layered skill routing for a task at a given step.
 *
 * Layer order (PRD Section 9): base step skill -> language skill -> custom
 * skills -> global skills. Step-override addSkills are appended within the
 * custom layer, after the modules' own custom skills. For cross-module tasks the
 * primary module's language populates `languageSkill` and each secondary
 * module's language is prepended to `customSkills`; custom skills are unioned
 * across all target modules (KD-5). Any language/custom/global skill whose
 * SKILL.md is absent is dropped without error (KD-2). The base step skill is
 * always retained (it is nit's own and required by the schema).
 */
export function resolveRouting(options: ResolveRoutingOptions): Routing {
  const skillsRootDir = options.skillsRootDir ?? DEFAULT_SKILLS_ROOT;
  const modules = options.modules;
  if (modules.length === 0) {
    throw new Error("resolveRouting requires at least one target module");
  }

  const present =
    options.skillExists ?? ((name: string) => skillFileExists(name, skillsRootDir));

  const primary = modules[0]!;
  const baseSkill = baseSkillForStep(options.step);

  // Layer 2 — primary module's language skill (dropped if its file is missing).
  const languageSkill = present(primary.languageId) ? primary.languageId : undefined;

  // Layer 3 — custom skills:
  //   secondary-module languages, then each module's custom skills, then the
  //   current step's override addSkills. Unioned and deduped, missing dropped.
  const customSkills: string[] = [];
  for (const mod of modules.slice(1)) {
    pushUnique(customSkills, [mod.languageId]);
  }
  for (const mod of modules) {
    pushUnique(customSkills, mod.customSkills);
  }
  for (const mod of modules) {
    pushUnique(customSkills, mod.stepOverrides?.[options.step]?.addSkills);
  }
  const resolvedCustom = customSkills.filter(present);

  // Layer 4 — global custom skills from the registry.
  const globalSkills = (options.registry?.globalCustomSkills ?? [])
    .map((s) => s.id)
    .filter(present);

  const routing: Routing = {
    taskId: options.taskId,
    targetModule: primary.name,
    baseSkill,
    resolvedAt: new Date().toISOString(),
  };
  if (languageSkill) routing.languageSkill = languageSkill;
  if (resolvedCustom.length > 0) routing.customSkills = resolvedCustom;
  if (globalSkills.length > 0) routing.globalSkills = globalSkills;

  return routing;
}

/**
 * Flatten a resolved Routing into the ordered skill list a consumer passes to an
 * agent: base -> language -> custom -> global.
 */
export function orderedSkillList(routing: Routing): string[] {
  const list: string[] = [routing.baseSkill];
  if (routing.languageSkill) list.push(routing.languageSkill);
  list.push(...(routing.customSkills ?? []));
  list.push(...(routing.globalSkills ?? []));
  return list;
}
