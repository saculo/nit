import { basename, join } from "path";
import { createAjv } from "../ajv";
import { resolveSchema } from "../schema-resolver";
import { resolveArchetype, type ArchetypeStep } from "../archetype-resolver";
import {
  explainRouting,
  orderedSkillList,
  ROUTING_LAYERS,
  type ModuleEntry,
  type Routing,
  type RoutingExplanation,
  type SkillsRegistry,
} from "../routing-resolver";

const DEFAULT_MODULES = ".nit/boundaries/modules.json";
const DEFAULT_REGISTRY = ".nit/registry/skills.json";
const DEFAULT_SKILLS_DIR = ".claude/skills";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 || i + 1 >= args.length ? undefined : args[i + 1];
}

/** A usage or input failure, carrying the message the caller should see. */
class RoutingInputError extends Error {}

/**
 * Everything the two commands need, derived from a task directory.
 *
 * Both commands answer questions about a task at its current step, and neither
 * should make the caller restate what the task already records. Deriving it here
 * once also means the two cannot disagree about which step a task is on.
 */
async function loadFromTaskDir(args: string[]): Promise<{
  explanation: RoutingExplanation;
  taskDir: string;
  step: string;
  modules: ModuleEntry[];
}> {
  const taskDir = flag(args, "--task-dir");
  if (!taskDir) throw new RoutingInputError("--task-dir is required");

  const taskFile = Bun.file(join(taskDir, "task.json"));
  if (!(await taskFile.exists())) {
    throw new RoutingInputError(`No task.json in ${taskDir}.`);
  }
  const task = await taskFile.json();
  const taskId = task?.id ?? basename(taskDir);

  // Which step: what was asked for, else where the task actually is, else the
  // first step of its archetype — a task that has not started yet still has a
  // routing worth explaining.
  let step = flag(args, "--step");
  if (!step) {
    const stateFile = Bun.file(join(taskDir, "state.json"));
    if (await stateFile.exists()) {
      step = (await stateFile.json())?.currentStepId;
    }
  }
  if (!step) {
    if (!task?.archetype) {
      throw new RoutingInputError(
        `Cannot tell which step ${taskId} is on: no state.json, no archetype in task.json, and no --step given.`
      );
    }
    const resolved = await resolveArchetype(task.archetype);
    step = (resolved.steps as ArchetypeStep[])[0]?.id;
    if (!step) throw new RoutingInputError(`Archetype "${task.archetype}" resolves to no steps.`);
  }

  const modulesPath = flag(args, "--modules") ?? DEFAULT_MODULES;
  const modulesFile = Bun.file(modulesPath);
  if (!(await modulesFile.exists())) {
    throw new RoutingInputError(
      `Module registry not found: ${modulesPath}\nRun /nit:init to scaffold the workspace.`
    );
  }
  const allModules: ModuleEntry[] = (await modulesFile.json()).modules ?? [];

  // A cross-module task names its secondaries with --targets; otherwise the
  // task's own targetModule is the whole story.
  const wanted = (flag(args, "--targets") ?? task?.targetModule ?? "")
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
  if (wanted.length === 0) {
    throw new RoutingInputError(`No targetModule in ${join(taskDir, "task.json")}, and no --targets given.`);
  }

  const modules: ModuleEntry[] = [];
  for (const name of wanted) {
    const entry = allModules.find((m) => m.name === name);
    // A partial chain is the wrong answer to give someone asking why routing
    // looks the way it does: they would read a shorter skill list as the
    // configuration's fault rather than the registry's (TASK-040 AC-3).
    if (!entry) {
      throw new RoutingInputError(
        `Module "${name}" is not in ${modulesPath}.\n` +
          `Known modules: ${allModules.map((m) => m.name).join(", ") || "(none)"}.\n` +
          `Add it to ${modulesPath}, or correct the task's targetModule.`
      );
    }
    modules.push(entry);
  }

  let registry: SkillsRegistry | undefined;
  const registryFile = Bun.file(flag(args, "--registry") ?? DEFAULT_REGISTRY);
  if (await registryFile.exists()) registry = await registryFile.json();

  const explanation = explainRouting({
    taskId,
    step,
    modules,
    registry,
    skillsRootDir: flag(args, "--skills-dir") ?? DEFAULT_SKILLS_DIR,
  });
  return { explanation, taskDir, step, modules };
}

/** Render the composition chain as the layered thing it is. */
export function renderExplanation(explanation: RoutingExplanation, step: string): string {
  const { routing, trace } = explanation;
  const lines = [
    `${routing.taskId} at step "${step}" — target module ${routing.targetModule}`,
    "",
  ];
  for (const layer of ROUTING_LAYERS) {
    const entries = trace.filter((e) => e.layer === layer);
    if (entries.length === 0) {
      // Said rather than omitted: an absent line reads as an oversight, and the
      // question this command answers is usually "why is my skill not here".
      lines.push(`${layer}: (nothing configured)`);
      continue;
    }
    lines.push(`${layer}:`);
    for (const e of entries) {
      const mark = e.included ? "+" : "-";
      const why = e.included ? "" : `  (dropped: ${e.dropped})`;
      lines.push(`  ${mark} ${e.skill}  <- ${e.source}${why}`);
    }
  }
  lines.push("", `resolved skill list: ${orderedSkillList(routing).join(" -> ")}`);
  const dropped = trace.filter((e) => !e.included);
  if (dropped.length > 0) {
    lines.push(
      "",
      `${dropped.length} candidate${dropped.length === 1 ? "" : "s"} did not make it. ` +
        `"absent" means no SKILL.md under the skills directory; "duplicate" means an earlier layer already contributed it.`
    );
  }
  return lines.join("\n");
}

/**
 * Print the full composition chain for a task's current step.
 *
 * Routing drops a missing skill silently, which is right at dispatch and opaque
 * afterwards. This is the command that answers "why did the agent not get the
 * skill I configured" — every candidate, the layer and source that offered it,
 * and why it was dropped.
 *
 * Usage: nit explain-routing --task-dir <dir> [--step <id>] [--targets <m1,m2>]
 *                            [--modules <file>] [--registry <file>] [--skills-dir <dir>] [--json]
 * Exit codes: 0 success, 2 usage or input error.
 */
export async function runExplainRouting(args: string[]): Promise<number> {
  try {
    const { explanation, step } = await loadFromTaskDir(args);
    if (args.includes("--json")) {
      console.log(JSON.stringify({ step, ...explanation }, null, 2));
    } else {
      console.log(renderExplanation(explanation, step));
    }
    return 0;
  } catch (error) {
    if (error instanceof RoutingInputError) {
      console.error(error.message);
      console.error(
        "Usage: nit explain-routing --task-dir <dir> [--step <id>] [--targets <m1,m2>] [--json]"
      );
      return 2;
    }
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

/** Validate a routing in-process against routing.schema.json. */
function validationErrors(routing: Routing): string[] {
  const schemaPath = resolveSchema("routing");
  if (!schemaPath) throw new Error("Routing schema not found in schema registry");
  const validate = createAjv().compile(require(schemaPath));
  if (validate(routing)) return [];
  return (validate.errors ?? []).map((e) => `  ${e.instancePath || "/"}: ${e.message}`);
}

/**
 * Resolve a task's routing for its current step and write routing.json.
 *
 * `nit route` already does the resolution, but makes the caller supply the task
 * id, the step and the target modules — the three things the task directory
 * already knows. Every caller restating them is a chance for one of them to be
 * wrong, and a routing resolved for the wrong step is not detectably wrong.
 *
 * Usage: nit resolve-routing --task-dir <dir> [--step <id>] [--targets <m1,m2>]
 *                            [--modules <file>] [--registry <file>] [--skills-dir <dir>] [--out <file>]
 * Exit codes: 0 success, 2 usage or input error.
 */
export async function runResolveRouting(args: string[]): Promise<number> {
  try {
    const { explanation, taskDir } = await loadFromTaskDir(args);
    const routing = explanation.routing;

    // ADR-0003: nothing invalid reaches disk, so a routing.json that exists is
    // one the supervisor can act on.
    const errors = validationErrors(routing);
    if (errors.length > 0) {
      console.error("Resolved routing failed schema validation:\n" + errors.join("\n"));
      return 2;
    }

    const outPath = flag(args, "--out") ?? join(taskDir, "routing.json");
    await Bun.write(outPath, JSON.stringify(routing, null, 2) + "\n");
    console.log(JSON.stringify({ wrote: outPath, ...routing }, null, 2));
    return 0;
  } catch (error) {
    if (error instanceof RoutingInputError) {
      console.error(error.message);
      console.error("Usage: nit resolve-routing --task-dir <dir> [--step <id>] [--out <file>]");
      return 2;
    }
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
