import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  loadTasks,
  checkDependencies,
  findCycles,
  readyTasks,
  renderGraph,
  phasesRootFor,
  type TaskNode,
} from "../src/task-deps";
import { runDeps } from "../src/commands/deps";
import { runValidate } from "../src/commands/validate";
import { createAjv } from "../src/ajv";
import { resolveSchema } from "../src/schema-resolver";

const ROOT = dirname(dirname(import.meta.dir));

const task = (id: string, over: Partial<TaskNode> = {}): TaskNode => ({
  id,
  phase: "PHASE-1",
  title: `Task ${id}`,
  status: "draft",
  ...over,
});

const validator = () => createAjv().compile(require(resolveSchema("task")!));

const full = (over: Record<string, unknown> = {}) => ({
  id: "TASK-002",
  phase: "PHASE-1",
  title: "A task",
  type: "backend",
  targetModule: "api",
  status: "draft",
  ...over,
});

// AC-1
describe("the schema defines the field", () => {
  test("a task can record what it waits on", () => {
    expect(validator()(full({ dependsOn: ["TASK-001"] }))).toBe(true);
  });

  test("a task with nothing blocking it simply omits the field", () => {
    expect(validator()(full())).toBe(true);
  });

  test("a dependency that is not a task id is rejected", () => {
    expect(validator()(full({ dependsOn: ["the auth work"] }))).toBe(false);
  });

  test("the same dependency twice is rejected — it says nothing the once did not", () => {
    expect(validator()(full({ dependsOn: ["TASK-001", "TASK-001"] }))).toBe(false);
  });

  // nit:tasks splits a two-type task into TASK-044a and TASK-044b and sets a
  // dependency between them. The id pattern rejected both halves outright, so
  // the documented split produced task files that would not validate.
  test("a split task's id validates, and can be depended on", () => {
    expect(validator()(full({ id: "TASK-044a", dependsOn: ["TASK-044b"] }))).toBe(true);
  });
});

describe("finding the tasks to resolve against", () => {
  test("the phases root comes from a task file's own path", () => {
    expect(phasesRootFor(join("x", "phases", "PHASE-2", "tasks", "TASK-003", "task.json"))).toBe(
      join("x", "phases")
    );
  });

  test("a file outside that layout resolves to nothing rather than to a guess", () => {
    expect(phasesRootFor(join("somewhere", "task.json"))).toBeUndefined();
    expect(phasesRootFor(join("x", "PHASE-2", "TASK-003", "task.json"))).toBeUndefined();
  });
});

// AC-3
describe("resolving what a dependency names", () => {
  const three = () => [task("TASK-001"), task("TASK-002"), task("TASK-003")];

  test("dependencies that name real tasks are sound", () => {
    const tasks = three();
    tasks[1]!.dependsOn = ["TASK-001"];
    expect(checkDependencies(tasks)).toEqual([]);
  });

  test("a dependency on a task nobody wrote is reported, naming both", () => {
    const tasks = three();
    tasks[1]!.dependsOn = ["TASK-999"];
    const [problem] = checkDependencies(tasks);
    expect(problem).toMatchObject({ taskId: "TASK-002", dependsOn: "TASK-999", reason: "unknown-task" });
    expect(problem!.message).toContain("TASK-999");
  });

  test("a task depending on itself is reported separately — the reason is different", () => {
    const tasks = three();
    tasks[0]!.dependsOn = ["TASK-001"];
    expect(checkDependencies(tasks)[0]).toMatchObject({ reason: "self" });
  });

  test("a dependency across phases resolves", () => {
    const tasks = [task("TASK-001", { phase: "PHASE-1" }), task("TASK-020", { phase: "PHASE-3", dependsOn: ["TASK-001"] })];
    expect(checkDependencies(tasks)).toEqual([]);
  });
});

describe("cycles", () => {
  test("a two-task cycle is found", () => {
    const tasks = [task("TASK-001", { dependsOn: ["TASK-002"] }), task("TASK-002", { dependsOn: ["TASK-001"] })];
    expect(findCycles(tasks)).toHaveLength(1);
  });

  test("a longer cycle is found once, not once per entry point", () => {
    const tasks = [
      task("TASK-001", { dependsOn: ["TASK-002"] }),
      task("TASK-002", { dependsOn: ["TASK-003"] }),
      task("TASK-003", { dependsOn: ["TASK-001"] }),
    ];
    const cycles = findCycles(tasks);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]![0]).toBe(cycles[0]![cycles[0]!.length - 1]);
  });

  test("a diamond is not a cycle", () => {
    const tasks = [
      task("TASK-001"),
      task("TASK-002", { dependsOn: ["TASK-001"] }),
      task("TASK-003", { dependsOn: ["TASK-001"] }),
      task("TASK-004", { dependsOn: ["TASK-002", "TASK-003"] }),
    ];
    expect(findCycles(tasks)).toEqual([]);
  });

  test("a dependency on a task that does not exist is not mistaken for a cycle", () => {
    expect(findCycles([task("TASK-001", { dependsOn: ["TASK-999"] })])).toEqual([]);
  });
});

// AC-4 — something reads the field: the graph, the readiness answer, and
// validation all do, and each changes when it changes.
describe("what reads dependsOn", () => {
  const tasks = () => [
    task("TASK-001", { status: "done" }),
    task("TASK-002", { dependsOn: ["TASK-001"] }),
    task("TASK-003", { dependsOn: ["TASK-002"] }),
  ];

  test("readiness follows the field: a task waiting on unfinished work is not startable", () => {
    expect(readyTasks(tasks()).map((t) => t.id)).toEqual(["TASK-002"]);
  });

  test("removing the field changes the answer", () => {
    const without = tasks().map((t) => ({ ...t, dependsOn: undefined }));
    expect(readyTasks(without).map((t) => t.id)).toEqual(["TASK-002", "TASK-003"]);
  });

  test("the graph shows the ordering in both directions", () => {
    const text = renderGraph(tasks());
    expect(text).toContain("after:   TASK-001");
    expect(text).toContain("blocks:  TASK-003");
    expect(text).toContain("Startable now: TASK-002");
  });

  test("a graph with no dependencies says everything is startable", () => {
    expect(renderGraph([task("TASK-001"), task("TASK-002")])).toContain(
      "Startable now: TASK-001, TASK-002"
    );
  });

  test("a fully blocked graph says so rather than printing an empty list", () => {
    const tasks = [task("TASK-001", { dependsOn: ["TASK-002"] }), task("TASK-002", { dependsOn: ["TASK-001"] })];
    expect(renderGraph(tasks)).toContain("Nothing is startable");
  });

  test("a finished phase is not reported as blocked", () => {
    expect(renderGraph([task("TASK-001", { status: "done" })])).toContain("Every task is done.");
  });
});

describe("reading a phases tree", () => {
  function workspace(tasks: Record<string, TaskNode[]>): string {
    const dir = mkdtempSync(join(tmpdir(), "deps-"));
    const phases = join(dir, "phases");
    for (const [phase, entries] of Object.entries(tasks)) {
      for (const entry of entries) {
        const taskDir = join(phases, phase, "tasks", entry.id);
        mkdirSync(taskDir, { recursive: true });
        writeFileSync(join(taskDir, "task.json"), JSON.stringify({ ...entry, phase }));
      }
    }
    return phases;
  }

  test("every task in every phase is loaded", () => {
    const phases = workspace({
      "PHASE-1": [task("TASK-001"), task("TASK-002")],
      "PHASE-2": [task("TASK-003")],
    });
    expect(loadTasks(phases).map((t) => t.id)).toEqual(["TASK-001", "TASK-002", "TASK-003"]);
  });

  test("a task.json that will not parse costs its own edges, not the graph", () => {
    const phases = workspace({ "PHASE-1": [task("TASK-001")] });
    const broken = join(phases, "PHASE-1", "tasks", "TASK-002");
    mkdirSync(broken, { recursive: true });
    writeFileSync(join(broken, "task.json"), "{ not json");
    expect(loadTasks(phases).map((t) => t.id)).toEqual(["TASK-001"]);
  });

  test("a phases tree that does not exist is empty, not an error", () => {
    expect(loadTasks(join(tmpdir(), "nit-no-phases-43"))).toEqual([]);
  });

  describe("the command", () => {
    function capture(): { said: string[]; restore: () => void } {
      const said: string[] = [];
      const log = console.log;
      const err = console.error;
      console.log = (...a: unknown[]) => void said.push(a.join(" "));
      console.error = (...a: unknown[]) => void said.push(a.join(" "));
      return { said, restore: () => { console.log = log; console.error = err; } };
    }

    async function run(args: string[]): Promise<{ code: number; out: string }> {
      const c = capture();
      try {
        return { code: await runDeps(args), out: c.said.join("\n") };
      } finally {
        c.restore();
      }
    }

    // AC-2
    test("it derives the graph from the tasks and exits 0 when it is sound", async () => {
      const phases = workspace({
        "PHASE-1": [task("TASK-001"), task("TASK-002", { dependsOn: ["TASK-001"] })],
      });
      const { code, out } = await run(["--phases-dir", phases]);
      expect(code).toBe(0);
      expect(out).toContain("after:   TASK-001");
    });

    test("--phase narrows the view", async () => {
      const phases = workspace({ "PHASE-1": [task("TASK-001")], "PHASE-2": [task("TASK-009")] });
      const { out } = await run(["--phases-dir", phases, "--phase", "PHASE-2"]);
      expect(out).toContain("TASK-009");
      expect(out).not.toContain("TASK-001");
    });

    // Resolving against one phase would report a real task as unknown, which is
    // the kind of false alarm that gets a check turned off.
    test("--phase narrows the view but not the resolution", async () => {
      const phases = workspace({
        "PHASE-1": [task("TASK-001")],
        "PHASE-2": [task("TASK-009", { dependsOn: ["TASK-001"] })],
      });
      const { code, out } = await run(["--phases-dir", phases, "--phase", "PHASE-2"]);
      expect(code).toBe(0);
      expect(out).not.toContain("not a task in this project");
    });

    test("an unresolvable dependency exits 1 and names it", async () => {
      const phases = workspace({ "PHASE-1": [task("TASK-001", { dependsOn: ["TASK-999"] })] });
      const { code, out } = await run(["--phases-dir", phases]);
      expect(code).toBe(1);
      expect(out).toContain("TASK-999");
    });

    test("a cycle exits 1 and says no task in it can start", async () => {
      const phases = workspace({
        "PHASE-1": [
          task("TASK-001", { dependsOn: ["TASK-002"] }),
          task("TASK-002", { dependsOn: ["TASK-001"] }),
        ],
      });
      const { code, out } = await run(["--phases-dir", phases]);
      expect(code).toBe(1);
      expect(out).toContain("Dependency cycle");
    });

    test("--json emits the graph as data", async () => {
      const phases = workspace({
        "PHASE-1": [task("TASK-001"), task("TASK-002", { dependsOn: ["TASK-001"] })],
      });
      const { out } = await run(["--phases-dir", phases, "--json"]);
      const parsed = JSON.parse(out);
      expect(parsed.tasks.find((t: TaskNode) => t.id === "TASK-002").dependsOn).toEqual(["TASK-001"]);
      expect(parsed.ready).toEqual(["TASK-001"]);
    });
  });

  // AC-3 through the command a task author actually runs.
  describe("nit validate resolves dependencies", () => {
    function taskFile(id: string, dependsOn: string[], siblings: string[] = []): string {
      const dir = mkdtempSync(join(tmpdir(), "validate-deps-"));
      const phases = join(dir, "phases");
      for (const sibling of [...siblings, id]) {
        const taskDir = join(phases, "PHASE-1", "tasks", sibling);
        mkdirSync(taskDir, { recursive: true });
        writeFileSync(
          join(taskDir, "task.json"),
          JSON.stringify(
            sibling === id
              ? { ...full({ id, dependsOn }), phase: "PHASE-1" }
              : { ...full({ id: sibling }), phase: "PHASE-1" }
          )
        );
      }
      return join(phases, "PHASE-1", "tasks", id, "task.json");
    }

    async function validate(path: string): Promise<{ code: number; out: string }> {
      const said: string[] = [];
      const log = console.log;
      const err = console.error;
      console.log = (...a: unknown[]) => void said.push(a.join(" "));
      console.error = (...a: unknown[]) => void said.push(a.join(" "));
      try {
        return { code: await runValidate(["--schema", "task", path]), out: said.join("\n") };
      } finally {
        console.log = log;
        console.error = err;
      }
    }

    test("a dependency on a task that exists validates", async () => {
      const { code } = await validate(taskFile("TASK-002", ["TASK-001"], ["TASK-001"]));
      expect(code).toBe(0);
    });

    test("a dependency on a task that does not exist fails, naming it", async () => {
      const { code, out } = await validate(taskFile("TASK-002", ["TASK-999"]));
      expect(code).toBe(1);
      expect(out).toContain("TASK-999");
      expect(out).toContain("dependsOn");
    });

    test("a self-dependency fails", async () => {
      const { code, out } = await validate(taskFile("TASK-002", ["TASK-002"]));
      expect(code).toBe(1);
      expect(out).toContain("depends on itself");
    });

    test("a task with no dependencies is unaffected", async () => {
      const { code } = await validate(taskFile("TASK-002", []));
      expect(code).toBe(0);
    });

    // Passing it would be worse: the reference would be reported as checked
    // when nothing had checked it.
    test("a dependency in a file outside the layout fails rather than passing unchecked", async () => {
      const dir = mkdtempSync(join(tmpdir(), "validate-loose-"));
      const path = join(dir, "task.json");
      writeFileSync(path, JSON.stringify(full({ dependsOn: ["TASK-001"] })));
      const { code, out } = await validate(path);
      expect(code).toBe(1);
      expect(out).toContain("cannot resolve");
    });

    test("a file outside the layout with no dependencies still validates", async () => {
      const dir = mkdtempSync(join(tmpdir(), "validate-loose-ok-"));
      const path = join(dir, "task.json");
      writeFileSync(path, JSON.stringify(full()));
      expect((await validate(path)).code).toBe(0);
    });
  });
});

describe("nit:tasks records dependencies rather than describing them", () => {
  const skill = readFileSync(join(ROOT, ".claude/skills/create-tasks/SKILL.md"), "utf8");

  test("its task.json shape carries the field", () => {
    expect(skill).toContain('"dependsOn"');
  });

  test("it derives the summary graph from the command", () => {
    expect(skill).toContain("cli.ts deps --phase PHASE-N");
  });

  test("it forbids recording an ordering in prose", () => {
    expect(skill).toMatch(/never in prose|do NOT record an ordering in prose/i);
  });

  test("the command it names is a command the CLI has", () => {
    expect(readFileSync(join(ROOT, "cli/src/cli.ts"), "utf8")).toContain('case "deps":');
  });
});

// This repository's own graph, which is the first real data the field has.
describe("against this repository", () => {
  test("every recorded dependency resolves and no cycle exists", () => {
    const tasks = loadTasks(join(ROOT, ".nit/phases"));
    expect(checkDependencies(tasks)).toEqual([]);
    expect(findCycles(tasks)).toEqual([]);
  });

  test("TASK-033 records that it waited on TASK-042", () => {
    const tasks = loadTasks(join(ROOT, ".nit/phases"));
    expect(tasks.find((t) => t.id === "TASK-033")!.dependsOn).toEqual(["TASK-042"]);
  });
});
