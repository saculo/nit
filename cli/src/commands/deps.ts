import { join } from "path";
import {
  loadTasks,
  checkDependencies,
  findCycles,
  readyTasks,
  renderGraph,
  type TaskNode,
} from "../task-deps";

const DEFAULT_PHASES = join(".nit", "phases");

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 || i + 1 >= args.length ? undefined : args[i + 1];
}

/**
 * Build the task dependency graph from what the tasks record.
 *
 * `nit:tasks` is instructed to present a dependency graph after creating a
 * phase's tasks, and had nowhere to read one from — so it assembled it from the
 * conversation, which is memory, not data (TASK-043 AC-2). This reads
 * `dependsOn` and reports the ordering, what each task blocks, and what is
 * startable now.
 *
 * Usage: nit deps [--phase PHASE-N] [--json] [--phases-dir <dir>]
 * Exit codes: 0 sound graph, 1 unresolvable dependencies or a cycle, 2 error.
 */
export async function runDeps(args: string[]): Promise<number> {
  const phasesDir = flag(args, "--phases-dir") ?? DEFAULT_PHASES;
  const phaseFilter = flag(args, "--phase");

  try {
    // The graph is checked against *every* task: a dependency may cross a phase
    // boundary, and resolving it against one phase would report a real task as
    // unknown. Only the view is narrowed by --phase.
    const all = loadTasks(phasesDir);
    const problems = checkDependencies(all);
    const cycles = findCycles(all);
    const shown: TaskNode[] = phaseFilter ? all.filter((t) => t.phase === phaseFilter) : all;

    if (args.includes("--json")) {
      console.log(
        JSON.stringify(
          {
            phasesDir,
            tasks: shown.map((t) => ({
              id: t.id,
              phase: t.phase,
              status: t.status,
              dependsOn: t.dependsOn ?? [],
            })),
            ready: readyTasks(shown).map((t) => t.id),
            problems,
            cycles,
          },
          null,
          2
        )
      );
    } else {
      console.log(renderGraph(shown));
      for (const problem of problems) console.error(problem.message);
      for (const cycle of cycles) {
        console.error(`Dependency cycle: ${cycle.join(" -> ")}. No task in it can start.`);
      }
    }
    return problems.length > 0 || cycles.length > 0 ? 1 : 0;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
