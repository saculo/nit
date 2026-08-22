import { join } from "path";
import { existsSync } from "fs";

/**
 * A module entry as read from .nit/boundaries/modules.json (the subset the
 * skill composition engine cares about).
 */
export interface ModuleEntry {
  name: string;
  /** The directories this module owns. More than one when its parts must change together. */
  paths?: string[];
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

/** The layer a candidate skill came from, in composition order. */
export const ROUTING_LAYERS = ["base", "language", "custom", "step-override", "global"] as const;
export type RoutingLayer = (typeof ROUTING_LAYERS)[number];

/** Why a candidate skill is not in the resolved routing. */
export type DropReason = "absent" | "duplicate";

/** One candidate skill considered during composition, kept or dropped. */
export interface RoutingTraceEntry {
  layer: RoutingLayer;
  skill: string;
  /** What contributed it: a module name, the registry, or the step id. */
  source: string;
  included: boolean;
  dropped?: DropReason;
}

/** A resolved routing together with every candidate that produced it. */
export interface RoutingExplanation {
  routing: Routing;
  trace: RoutingTraceEntry[];
}

/**
 * Resolve the layered skill routing, and record every candidate considered.
 *
 * Layer order (PRD Section 9): base step skill -> language skill -> custom
 * skills -> global skills. Step-override addSkills are appended within the
 * custom layer, after the modules' own custom skills. For cross-module tasks the
 * primary module's language populates `languageSkill` and each secondary
 * module's language is prepended to `customSkills`; custom skills are unioned
 * across all target modules (KD-5). Any language/custom/global skill whose
 * SKILL.md is absent is dropped without error (KD-2). The base step skill is
 * always retained (it is nit's own and required by the schema).
 *
 * Dropping silently is right at dispatch — a missing optional skill must not
 * stop work — and wrong when someone is asking why an agent did not get the
 * skill they configured. The trace is that answer, and it is produced by the
 * same pass that produces the routing rather than by a second implementation
 * that would drift from it (TASK-040).
 */
export function explainRouting(options: ResolveRoutingOptions): RoutingExplanation {
  const skillsRootDir = options.skillsRootDir ?? DEFAULT_SKILLS_ROOT;
  const modules = options.modules;
  if (modules.length === 0) {
    throw new Error("resolveRouting requires at least one target module");
  }

  const present =
    options.skillExists ?? ((name: string) => skillFileExists(name, skillsRootDir));

  const primary = modules[0]!;
  const baseSkill = baseSkillForStep(options.step);
  const trace: RoutingTraceEntry[] = [
    // Always retained: it is nit's own skill and the schema requires it.
    { layer: "base", skill: baseSkill, source: options.step, included: true },
  ];

  // Layer 2 — primary module's language skill (dropped if its file is missing).
  const languagePresent = present(primary.languageId);
  const languageSkill = languagePresent ? primary.languageId : undefined;
  trace.push({
    layer: "language",
    skill: primary.languageId,
    source: primary.name,
    included: languagePresent,
    ...(languagePresent ? {} : { dropped: "absent" as const }),
  });

  // Layer 3 — custom skills:
  //   secondary-module languages, then each module's custom skills, then the
  //   current step's override addSkills. Unioned and deduped, missing dropped.
  const candidates: { layer: RoutingLayer; skill: string; source: string }[] = [];
  for (const mod of modules.slice(1)) {
    candidates.push({ layer: "custom", skill: mod.languageId, source: mod.name });
  }
  for (const mod of modules) {
    for (const skill of mod.customSkills ?? []) {
      if (skill) candidates.push({ layer: "custom", skill, source: mod.name });
    }
  }
  for (const mod of modules) {
    for (const skill of mod.stepOverrides?.[options.step]?.addSkills ?? []) {
      if (skill) candidates.push({ layer: "step-override", skill, source: `${mod.name} @ ${options.step}` });
    }
  }

  // Seeded with the primary language: two modules sharing a language used to put
  // it in both the language layer and the custom layer, and the agent received
  // the same skill twice. Seeded whether or not the file exists — an absent
  // skill named twice is still one absent skill.
  const customSkills: string[] = [primary.languageId];
  for (const candidate of candidates) {
    if (customSkills.includes(candidate.skill)) {
      trace.push({ ...candidate, included: false, dropped: "duplicate" });
      continue;
    }
    customSkills.push(candidate.skill);
    const included = present(candidate.skill);
    trace.push({ ...candidate, included, ...(included ? {} : { dropped: "absent" as const }) });
  }
  const resolvedCustom = customSkills.slice(1).filter(present);

  // Layer 4 — global custom skills from the registry.
  const globalSkills: string[] = [];
  for (const entry of options.registry?.globalCustomSkills ?? []) {
    const included = present(entry.id);
    if (included) globalSkills.push(entry.id);
    trace.push({
      layer: "global",
      skill: entry.id,
      source: "registry/skills.json",
      included,
      ...(included ? {} : { dropped: "absent" as const }),
    });
  }

  const routing: Routing = {
    taskId: options.taskId,
    targetModule: primary.name,
    baseSkill,
    resolvedAt: new Date().toISOString(),
  };
  if (languageSkill) routing.languageSkill = languageSkill;
  if (resolvedCustom.length > 0) routing.customSkills = resolvedCustom;
  if (globalSkills.length > 0) routing.globalSkills = globalSkills;

  return { routing, trace };
}

/**
 * Resolve the layered skill routing for a task at a given step.
 *
 * One implementation, two views: the routing is what `explainRouting` computed,
 * so an explanation can never describe a composition the supervisor would not
 * actually perform.
 */
export function resolveRouting(options: ResolveRoutingOptions): Routing {
  return explainRouting(options).routing;
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
