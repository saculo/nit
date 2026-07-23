import { basename } from "path";
import { resolveArchetype, type ArchetypeStep } from "../archetype-resolver";
import {
  resolveRouting,
  orderedSkillList,
  baseSkillForStep,
  type ModuleEntry,
} from "../routing-resolver";
import { prepare, ingest, dryRun, loadMaxReopenCount } from "../supervisor";

const DEFAULT_CONFIG = ".nit/config/supervisor.json";
const DEFAULT_SKILLS_DIR = ".claude/skills";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}
const has = (args: string[], name: string): boolean => args.includes(name);

/**
 * Advance a task through its archetype steps.
 *
 * Usage: nit continue --task-dir <dir> --archetype <name>
 *          [--ingest] [--dry-run] [--target <module> --modules <file> [--registry <file>]]
 *          [--config <supervisor.json>] [--skills-dir <dir>] [--max-reopen <n>]
 *
 * Exit codes: 0 success, 1 error, 2 usage error.
 */
export async function runContinue(args: string[]): Promise<number> {
  const taskDir = flag(args, "--task-dir");
  const archetypeName = flag(args, "--archetype");
  if (!taskDir || !archetypeName) {
    console.error(
      "Usage: nit continue --task-dir <dir> --archetype <name> [--ingest] [--dry-run] " +
        "[--target <module> --modules <file>] [--config <file>] [--skills-dir <dir>]"
    );
    return 2;
  }

  const taskId = flag(args, "--task") ?? basename(taskDir);
  const skillsRootDir = flag(args, "--skills-dir") ?? DEFAULT_SKILLS_DIR;
  const target = flag(args, "--target");
  const modulesPath = flag(args, "--modules");
  const registryPath = flag(args, "--registry");
  const configPath = flag(args, "--config") ?? DEFAULT_CONFIG;

  try {
    const resolved = await resolveArchetype(archetypeName);
    const steps = resolved.steps as ArchetypeStep[];

    // Build a per-step skill resolver: full routing when a target module and
    // registry are available, otherwise just the base step skill.
    let resolveSkillList: (step: ArchetypeStep) => string[] = (step) => [baseSkillForStep(step.id)];
    if (target && modulesPath) {
      const modulesFile = Bun.file(modulesPath);
      if (await modulesFile.exists()) {
        const allModules: ModuleEntry[] = (await modulesFile.json()).modules ?? [];
        const entry = allModules.find((m) => m.name === target);
        if (entry) {
          let registry;
          if (registryPath) {
            const rf = Bun.file(registryPath);
            if (await rf.exists()) registry = await rf.json();
          }
          resolveSkillList = (step) =>
            orderedSkillList(
              resolveRouting({ taskId, step: step.id, modules: [entry], registry, skillsRootDir })
            );
        }
      }
    }

    const opts = { taskDir, taskId, steps, resolveSkillList };

    if (has(args, "--dry-run")) {
      const plan = await dryRun(opts);
      console.log(JSON.stringify(plan, null, 2));
      return 0;
    }

    if (has(args, "--ingest")) {
      const maxReopenFlag = flag(args, "--max-reopen");
      const maxReopenCount = maxReopenFlag !== undefined
        ? Number(maxReopenFlag)
        : await loadMaxReopenCount(configPath);
      const result = await ingest({ ...opts, maxReopenCount });
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }

    const descriptor = await prepare(opts);
    console.log(JSON.stringify(descriptor, null, 2));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}
