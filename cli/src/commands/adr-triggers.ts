import { join } from "path";
import { loadTriggers, evaluateTriggers } from "../adr-triggers";
import { loadDependencyRules } from "../dependency-rules";
import { DEFAULT_MODULES_PATH, DEFAULT_RULES_PATH } from "../boundary-check";
import type { ModuleEntry } from "../routing-resolver";

const DEFAULT_TRIGGERS_PATH = join(".nit", "config", "adr-triggers.json");

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 || i + 1 >= args.length ? undefined : args[i + 1];
}

/**
 * Report which ADR triggers a step's changes would fire.
 *
 * The supervisor evaluates these at ingest — but that is *after* the specialist
 * has written its output, which is too late to add an adrCandidate to it. A
 * specialist that is meant to notice a decision worth recording needs to ask
 * before it finishes, so this is that question, answered by the same evaluator
 * the supervisor uses rather than by prose reasoning about paths (ADR-0004).
 *
 * Usage: nit adr-triggers --task-dir <dir> [--step <stepId>] [--triggers <file>]
 *                         [--modules <file>] [--rules <file>]
 * Exit codes: 0 nothing fired, 1 one or more fired, 2 usage or input error.
 */
export async function runAdrTriggers(args: string[]): Promise<number> {
  const taskDir = flag(args, "--task-dir");
  if (!taskDir) {
    console.error("Usage: nit adr-triggers --task-dir <dir> [--step <stepId>] [--triggers <file>]");
    return 2;
  }
  try {
    const task = await Bun.file(join(taskDir, "task.json")).json();
    if (!task?.targetModule) {
      console.error(`No task.json with a targetModule in ${taskDir}.`);
      return 2;
    }
    const triggersFile = Bun.file(flag(args, "--triggers") ?? DEFAULT_TRIGGERS_PATH);
    const modulesFile = Bun.file(flag(args, "--modules") ?? DEFAULT_MODULES_PATH);
    if (!(await triggersFile.exists()) || !(await modulesFile.exists())) {
      // Not configured is not an error: a project without triggers simply has
      // nothing to notice, and saying so beats failing.
      console.log(JSON.stringify({ taskId: task.id, configured: false, fired: [] }, null, 2));
      return 0;
    }
    const modules: ModuleEntry[] = (await modulesFile.json()).modules ?? [];
    const triggers = loadTriggers(await triggersFile.json()).triggers;
    const rulesFile = Bun.file(flag(args, "--rules") ?? DEFAULT_RULES_PATH);
    const rules = (await rulesFile.exists())
      ? loadDependencyRules(await rulesFile.json(), modules)
      : { rules: [] };

    const stepId = flag(args, "--step") ?? "implement";
    const glob = new Bun.Glob(`STEP-*-${stepId}/output.json`);
    let output: unknown;
    for await (const path of glob.scan({ cwd: taskDir })) {
      output = await Bun.file(join(taskDir, path)).json();
      break;
    }
    if (output === undefined) {
      console.error(`No output.json for step "${stepId}" in ${taskDir}.`);
      return 2;
    }

    const fired = evaluateTriggers(output, triggers, {
      targetModule: task.targetModule,
      modules,
      rules,
    });
    console.log(JSON.stringify({ taskId: task.id, configured: true, fired }, null, 2));
    return fired.length > 0 ? 1 : 0;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
