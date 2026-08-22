import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { resolveArchetype, type ArchetypeStep } from "../archetype-resolver";
import { buildInventory, missing, renderInventory, type SkillRecord } from "../skills-inventory";
import type { ModuleEntry, SkillsRegistry } from "../routing-resolver";

const DEFAULT_MODULES = ".nit/boundaries/modules.json";
const DEFAULT_REGISTRY = ".nit/registry/skills.json";
const DEFAULT_SKILLS_DIR = ".claude/skills";
const ARCHETYPES_DIR = "cli/archetypes";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 || i + 1 >= args.length ? undefined : args[i + 1];
}

/**
 * Every step id any shipped archetype dispatches.
 *
 * Read from the archetypes rather than written down here: an archetype that
 * adds a step adds a skill the project owes, and a hardcoded list would keep
 * saying otherwise (TASK-041 AC-3). An abstract archetype is skipped — nothing
 * dispatches it.
 */
export async function shippedStepIds(archetypesDir: string): Promise<string[]> {
  if (!existsSync(archetypesDir)) return [];
  const names = readdirSync(archetypesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length));

  const steps = new Set<string>();
  for (const name of names) {
    try {
      const resolved = await resolveArchetype(name);
      for (const step of resolved.steps as ArchetypeStep[]) steps.add(step.id);
    } catch {
      // Abstract archetypes and anything unresolvable contribute no steps.
      // `nit archetype` is the command that reports why one will not resolve.
    }
  }
  return [...steps].sort();
}

/**
 * List every skill the project references or ships, grouped by routing layer.
 *
 * Routing drops a declared-but-absent skill without a word, which is right at
 * dispatch and leaves nobody a way to see the gap. This lists what a project has
 * against what it claims, so a missing skill is visible before a specialist runs
 * without it.
 *
 * Usage: nit skills [--missing] [--json] [--modules <file>] [--registry <file>]
 *                   [--skills-dir <dir>] [--archetypes <dir>]
 * Exit codes: 0 always for a listing; 1 with --missing when something is missing;
 *             2 on an input error.
 */
export async function runSkills(args: string[]): Promise<number> {
  const skillsRootDir = flag(args, "--skills-dir") ?? DEFAULT_SKILLS_DIR;
  const modulesPath = flag(args, "--modules") ?? DEFAULT_MODULES;
  const registryPath = flag(args, "--registry") ?? DEFAULT_REGISTRY;
  const archetypesDir = flag(args, "--archetypes") ?? ARCHETYPES_DIR;

  try {
    // Both registries are optional: a project mid-setup should still be able to
    // ask what skills it has, and the answer is what is on disk.
    let modules: ModuleEntry[] = [];
    const modulesFile = Bun.file(modulesPath);
    if (await modulesFile.exists()) modules = (await modulesFile.json()).modules ?? [];

    let registry: SkillsRegistry | undefined;
    const registryFile = Bun.file(registryPath);
    if (await registryFile.exists()) registry = await registryFile.json();

    const records = buildInventory({
      stepIds: await shippedStepIds(archetypesDir),
      modules,
      registry,
      skillsRootDir,
    });

    const absent = missing(records);
    const onlyMissing = args.includes("--missing");
    const shown: SkillRecord[] = onlyMissing ? absent : records;

    if (args.includes("--json")) {
      console.log(JSON.stringify({ skillsRootDir, skills: shown, missing: absent.length }, null, 2));
    } else if (onlyMissing && absent.length === 0) {
      console.log("No declared skill is missing from disk.");
    } else {
      console.log(renderInventory(shown));
    }

    // A listing is not a verdict — `nit skills` alone always succeeds, so it can
    // be run to find out. `--missing` is the form worth putting in a pipeline.
    return onlyMissing && absent.length > 0 ? 1 : 0;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
