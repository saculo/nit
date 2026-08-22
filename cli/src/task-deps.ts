import { existsSync, readdirSync, readFileSync } from "fs";
import { basename, dirname, join, sep } from "path";

/** The subset of task.json this module reads. */
export interface TaskNode {
  id: string;
  phase?: string;
  title?: string;
  status?: string;
  dependsOn?: string[];
}

/** A dependency that cannot stand: the reason is what the author needs. */
export interface DependencyProblem {
  taskId: string;
  dependsOn: string;
  reason: "unknown-task" | "self";
  message: string;
}

/** A cycle, as the ids around it, starting and ending at the same task. */
export type Cycle = string[];

/**
 * Find the phases root that contains a task file.
 *
 * Dependencies name tasks by id and nothing else, so resolving one means
 * knowing where the project's tasks live. Deriving it from the file's own path
 * keeps `nit validate` usable on any task file without a flag, and returning
 * undefined rather than guessing keeps it honest when the layout is not the
 * one nit creates.
 */
export function phasesRootFor(taskFilePath: string): string | undefined {
  // .../phases/PHASE-N/tasks/TASK-NNN/task.json
  const taskDir = dirname(taskFilePath);
  const tasksDir = dirname(taskDir);
  const phaseDir = dirname(tasksDir);
  const phasesDir = dirname(phaseDir);
  if (basename(tasksDir) !== "tasks") return undefined;
  if (!basename(phaseDir).startsWith("PHASE-")) return undefined;
  return phasesDir.endsWith(sep) ? phasesDir.slice(0, -1) : phasesDir;
}

/** Every task under a phases tree, across all phases. */
export function loadTasks(phasesDir: string): TaskNode[] {
  if (!existsSync(phasesDir)) return [];
  const tasks: TaskNode[] = [];
  for (const phase of readdirSync(phasesDir).sort()) {
    const tasksDir = join(phasesDir, phase, "tasks");
    if (!existsSync(tasksDir)) continue;
    for (const taskDir of readdirSync(tasksDir).sort()) {
      const file = join(tasksDir, taskDir, "task.json");
      if (!existsSync(file)) continue;
      try {
        const task = JSON.parse(readFileSync(file, "utf8")) as TaskNode;
        if (task?.id) tasks.push(task);
      } catch {
        // A task.json that will not parse is `nit validate`'s business, not the
        // graph's; skipping it costs its edges, not the whole graph.
      }
    }
  }
  return tasks;
}

/**
 * Check every declared dependency against the tasks that exist.
 *
 * A dependency naming a task nobody wrote is worse than no dependency: it reads
 * as a considered ordering constraint, and the ordering it describes can never
 * be satisfied (TASK-043 AC-3).
 */
export function checkDependencies(tasks: TaskNode[]): DependencyProblem[] {
  const known = new Set(tasks.map((t) => t.id));
  const problems: DependencyProblem[] = [];
  for (const task of tasks) {
    for (const dep of task.dependsOn ?? []) {
      if (dep === task.id) {
        problems.push({
          taskId: task.id,
          dependsOn: dep,
          reason: "self",
          message: `${task.id} depends on itself, so it can never start.`,
        });
      } else if (!known.has(dep)) {
        problems.push({
          taskId: task.id,
          dependsOn: dep,
          reason: "unknown-task",
          message: `${task.id} depends on "${dep}", which is not a task in this project.`,
        });
      }
    }
  }
  return problems;
}

/**
 * Every dependency cycle in the graph.
 *
 * A cycle is not an invalid reference — each id resolves — but no task in it can
 * ever start, and that is invisible one task at a time. It only appears when the
 * graph is assembled, which is the argument for assembling it at all.
 */
export function findCycles(tasks: TaskNode[]): Cycle[] {
  const edges = new Map(tasks.map((t) => [t.id, (t.dependsOn ?? []).filter((d) => d !== t.id)]));
  const cycles: Cycle[] = [];
  const seen = new Set<string>();
  const stack: string[] = [];
  const onStack = new Set<string>();

  const walk = (id: string): void => {
    if (onStack.has(id)) {
      cycles.push([...stack.slice(stack.indexOf(id)), id]);
      return;
    }
    if (seen.has(id)) return;
    seen.add(id);
    stack.push(id);
    onStack.add(id);
    for (const next of edges.get(id) ?? []) {
      if (edges.has(next)) walk(next);
    }
    stack.pop();
    onStack.delete(id);
  };

  for (const task of tasks) walk(task.id);
  // Two entry points can find the same cycle by different rotations.
  const canonical = new Set<string>();
  return cycles.filter((cycle) => {
    const key = [...cycle.slice(0, -1)].sort().join(">");
    if (canonical.has(key)) return false;
    canonical.add(key);
    return true;
  });
}

/** Tasks nothing blocks, and which are therefore startable now. */
export function readyTasks(tasks: TaskNode[]): TaskNode[] {
  const done = new Set(tasks.filter((t) => t.status === "done").map((t) => t.id));
  return tasks.filter(
    (t) => t.status !== "done" && (t.dependsOn ?? []).every((d) => done.has(d))
  );
}

/**
 * Render the dependency graph.
 *
 * `nit:tasks` is instructed to present a dependency graph when it finishes a
 * phase, and until now had to assemble one from memory of the conversation.
 * This derives it from what the tasks record (AC-2).
 */
export function renderGraph(tasks: TaskNode[]): string {
  if (tasks.length === 0) return "No tasks.";
  const blockedBy = new Map<string, string[]>();
  for (const task of tasks) {
    for (const dep of task.dependsOn ?? []) {
      blockedBy.set(dep, [...(blockedBy.get(dep) ?? []), task.id]);
    }
  }

  const lines: string[] = [];
  for (const task of tasks) {
    const deps = task.dependsOn ?? [];
    const blocks = blockedBy.get(task.id) ?? [];
    const status = task.status ? ` [${task.status}]` : "";
    lines.push(`${task.id}${status} ${task.title ?? ""}`.trimEnd());
    if (deps.length > 0) lines.push(`  after:   ${deps.join(", ")}`);
    if (blocks.length > 0) lines.push(`  blocks:  ${blocks.join(", ")}`);
  }

  const ready = readyTasks(tasks);
  const unfinished = tasks.filter((t) => t.status !== "done");
  lines.push("");
  if (unfinished.length === 0) {
    lines.push("Every task is done.");
  } else {
    lines.push(
      ready.length === 0
        ? "Nothing is startable: every unfinished task is waiting on another."
        : `Startable now: ${ready.map((t) => t.id).join(", ")}`
    );
  }
  return lines.join("\n");
}
