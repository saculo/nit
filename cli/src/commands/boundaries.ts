import { join } from "path";
import { loadDependencyRules } from "../dependency-rules";
import { checkBoundaries, violationMessage, DEFAULT_MODULES_PATH, DEFAULT_RULES_PATH } from "../boundary-check";
import type { ModuleEntry } from "../routing-resolver";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 || i + 1 >= args.length ? undefined : args[i + 1];
}

/**
 * Report the module boundaries a task's implementation crossed.
 *
 * The boundary-check step needs this verdict, and ADR-0004 puts the deciding
 * logic in tested code rather than in prose a reviewer interprets — so the skill
 * runs this and reports what it says.
 *
 * This is a query, not the gate. `ingest` enforces only when a project supplies
 * both a module registry and a rule set, so a project that has not opted in is
 * never blocked (TASK-035 AC-4). This command answers what the rules *would*
 * say either way, including from `modules.json.allowedDependencies` alone — so
 * a project can see what enforcement would cost before turning it on. When no
 * rule set exists, the report says so rather than implying the gate is live.
 *
 * Usage: nit boundaries --task-dir <dir> [--step <stepId>] [--modules <file>] [--rules <file>]
 * Exit codes: 0 no violations, 1 violations found, 2 usage or input error.
 */
export async function runBoundaries(args: string[]): Promise<number> {
  const taskDir = flag(args, "--task-dir");
  if (!taskDir) {
    console.error("Usage: nit boundaries --task-dir <dir> [--step <stepId>] [--modules <file>] [--rules <file>]");
    return 2;
  }
  const modulesPath = flag(args, "--modules") ?? DEFAULT_MODULES_PATH;
  const rulesPath = flag(args, "--rules") ?? DEFAULT_RULES_PATH;

  try {
    const task = await Bun.file(join(taskDir, "task.json")).json();
    if (!task?.targetModule) {
      console.error(`No task.json with a targetModule in ${taskDir}.`);
      return 2;
    }
    const modulesFile = Bun.file(modulesPath);
    const rulesFile = Bun.file(rulesPath);
    if (!(await modulesFile.exists())) {
      console.error(`Module registry not found: ${modulesPath}\nRun /nit:init to scaffold the workspace.`);
      return 2;
    }
    const modules: ModuleEntry[] = (await modulesFile.json()).modules ?? [];
    const hasRules = await rulesFile.exists();
    const rules = hasRules ? loadDependencyRules(await rulesFile.json(), modules) : { rules: [] };

    // The implement step's output is what reports changed files.
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

    const violations = checkBoundaries(output, task.targetModule, modules, rules, task.id);
    console.log(
      JSON.stringify(
        {
          taskId: task.id,
          targetModule: task.targetModule,
          // Enforcement at ingest requires both files. Saying so here stops a
          // report being read as "the gate is live" when it is not.
          enforced: hasRules,
          rulesPath: hasRules ? rulesPath : null,
          violations: violations.map((v) => ({ ...v, message: violationMessage(v) })),
        },
        null,
        2
      )
    );
    return violations.length > 0 ? 1 : 0;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
