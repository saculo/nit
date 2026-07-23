import { describe, expect, test, beforeAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { resolveArchetype, type ArchetypeStep } from "../src/archetype-resolver";
import {
  initialState,
  advanceState,
  stepDirName,
  buildStepInput,
  ingestValid,
  ingestInvalid,
  prepare,
  ingest,
  dryRun,
  type TaskState,
} from "../src/supervisor";

const NOW = "2026-07-23T00:00:00.000Z";
let steps: ArchetypeStep[]; // backend-feature: analyze, design, implement, review, qa

beforeAll(async () => {
  steps = (await resolveArchetype("backend-feature")).steps as ArchetypeStep[];
});

function tmpTaskDir(): string {
  return mkdtempSync(join(tmpdir(), "nit-sup-"));
}
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("supervisor — pure functions", () => {
  test("initialState starts at the first step with the full step order", () => {
    const state = initialState("TASK-015", steps, NOW);
    expect(state.currentStepId).toBe("analyze");
    expect(state.stepOrder).toEqual(["analyze", "design", "implement", "review", "qa"]);
    expect(state.status).toBe("in-progress");
    expect(state.reopenCount).toBe(0);
  });

  test("advanceState moves to the next step and resets counters", () => {
    const state = initialState("T", steps, NOW);
    const next = advanceState(state, NOW);
    expect(next.currentStepId).toBe("design");
    expect(next.status).toBe("in-progress");
    expect(next.reopenCount).toBe(0);
  });

  test("advanceState from the last step completes the task", () => {
    const state: TaskState = { ...initialState("T", steps, NOW), currentStepId: "qa" };
    const done = advanceState(state, NOW);
    expect(done.status).toBe("done");
    expect(done.timestamps?.completedAt).toBe(NOW);
  });

  test("stepDirName numbers by position (U-6)", () => {
    expect(stepDirName(0, "analyze")).toBe("STEP-001-analyze");
    expect(stepDirName(1, "design")).toBe("STEP-002-design");
  });

  test("ingestValid parks at awaiting_approval with a pending approval", () => {
    const state = initialState("T", steps, NOW);
    const { state: next, approval } = ingestValid(state, NOW);
    expect(next.status).toBe("awaiting_approval");
    expect(approval).toMatchObject({ taskId: "T", stepId: "analyze", status: "pending" });
  });

  test("ingestInvalid reopens below the budget and escalates once exceeded", () => {
    let state = initialState("T", steps, NOW);
    const errs = [{ path: "/", message: "bad" }];
    // reopens 1..3 stay in-progress with repairRequired
    for (let i = 1; i <= 3; i++) {
      const r = ingestInvalid(state, errs, 3, NOW);
      expect(r.escalated).toBe(false);
      expect(r.state.reopenCount).toBe(i);
      expect(r.state.status).toBe("in-progress");
      expect(r.state.repairRequired).toBe(true);
      state = r.state;
    }
    // 4th failure exceeds maxReopenCount -> escalated
    const escal = ingestInvalid(state, errs, 3, NOW);
    expect(escal.escalated).toBe(true);
    expect(escal.state.status).toBe("escalated");
    expect(escal.state.reopenCount).toBe(4);
  });
});

const validAnalysisOutput = {
  taskId: "TASK-015",
  stepId: "analyze",
  stepType: "analyze",
  result: { resultType: "analysis", findings: ["something"] },
};
const invalidOutput = { taskId: "TASK-015" }; // missing stepId/stepType

describe("supervisor — fs orchestration", () => {
  // AC-1
  test("first run creates state, scaffolds STEP-001-analyze, and ingest parks awaiting_approval", async () => {
    const dir = tmpTaskDir();
    const desc = (await prepare({ taskDir: dir, taskId: "TASK-015", steps, now: NOW })) as any;
    expect(desc.stepId).toBe("analyze");
    expect(desc.role).toBe("analyst");
    expect(desc.action).toBe("start");

    const statePath = join(dir, "state.json");
    expect(existsSync(statePath)).toBe(true);
    const state = readJson<TaskState>(statePath);
    expect(state.currentStepId).toBe("analyze");
    expect(state.stepOrder).toHaveLength(5);
    const inputPath = join(dir, "STEP-001-analyze", "input.json");
    expect(existsSync(inputPath)).toBe(true);

    // specialist writes output, then ingest
    writeFileSync(join(dir, "STEP-001-analyze", "output.json"), JSON.stringify(validAnalysisOutput));
    const result = (await ingest({ taskDir: dir, taskId: "TASK-015", steps, now: NOW })) as any;
    expect(result.valid).toBe(true);
    expect(result.status).toBe("awaiting_approval");

    const approval = readJson<{ status: string }>(join(dir, "STEP-001-analyze", "approval.json"));
    expect(approval.status).toBe("pending");
    expect(readJson<TaskState>(statePath).status).toBe("awaiting_approval");
  });

  // AC-2
  test("advances to design once the analyze step is approved", async () => {
    const dir = tmpTaskDir();
    const state: TaskState = {
      taskId: "TASK-015",
      currentStepId: "analyze",
      stepOrder: ["analyze", "design", "implement", "review", "qa"],
      status: "awaiting_approval",
      reopenCount: 0,
      timestamps: { createdAt: NOW, updatedAt: NOW },
    };
    writeFileSync(join(dir, "state.json"), JSON.stringify(state));
    mkdirSync(join(dir, "STEP-001-analyze"), { recursive: true });
    writeFileSync(
      join(dir, "STEP-001-analyze", "approval.json"),
      JSON.stringify({ taskId: "TASK-015", stepId: "analyze", status: "approved" })
    );

    const desc = (await prepare({ taskDir: dir, taskId: "TASK-015", steps, now: NOW })) as any;
    expect(desc.stepId).toBe("design");
    expect(desc.role).toBe("architect");
    expect(desc.action).toBe("advance");
    expect(existsSync(join(dir, "STEP-002-design", "input.json"))).toBe(true);
    expect(readJson<TaskState>(join(dir, "state.json")).currentStepId).toBe("design");
  });

  // AC-3
  test("invalid output records validation errors, reopens the step, and increments reopenCount", async () => {
    const dir = tmpTaskDir();
    await prepare({ taskDir: dir, taskId: "TASK-015", steps, now: NOW });
    writeFileSync(join(dir, "STEP-001-analyze", "output.json"), JSON.stringify(invalidOutput));

    const result = (await ingest({ taskDir: dir, taskId: "TASK-015", steps, now: NOW })) as any;
    expect(result.valid).toBe(false);
    expect(result.escalated).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    const validation = readJson<{ schemaValid: boolean; errors: unknown[] }>(
      join(dir, "STEP-001-analyze", "validation.json")
    );
    expect(validation.schemaValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);

    const state = readJson<TaskState>(join(dir, "state.json"));
    expect(state.reopenCount).toBe(1);
    expect(state.repairRequired).toBe(true);
    expect(state.status).toBe("in-progress");

    const input = readJson<{ context: { repairErrors?: unknown[] } }>(
      join(dir, "STEP-001-analyze", "input.json")
    );
    expect(input.context.repairErrors?.length).toBeGreaterThan(0);
  });

  // AC-4
  test("escalates when the reopen budget is exceeded", async () => {
    const dir = tmpTaskDir();
    const state: TaskState = {
      taskId: "TASK-015",
      currentStepId: "analyze",
      stepOrder: ["analyze", "design", "implement", "review", "qa"],
      status: "in-progress",
      reopenCount: 3,
      repairRequired: true,
      timestamps: { createdAt: NOW, updatedAt: NOW },
    };
    writeFileSync(join(dir, "state.json"), JSON.stringify(state));
    mkdirSync(join(dir, "STEP-001-analyze"), { recursive: true });
    writeFileSync(join(dir, "STEP-001-analyze", "output.json"), JSON.stringify(invalidOutput));

    const result = (await ingest({
      taskDir: dir,
      taskId: "TASK-015",
      steps,
      now: NOW,
      maxReopenCount: 3,
    })) as any;
    expect(result.valid).toBe(false);
    expect(result.escalated).toBe(true);
    expect(result.status).toBe("escalated");
    expect(readJson<TaskState>(join(dir, "state.json")).status).toBe("escalated");
  });

  // AC-5
  test("--dry-run computes the plan without writing state or step directories", async () => {
    const dir = tmpTaskDir();
    const plan = (await dryRun({ taskDir: dir, taskId: "TASK-015", steps, now: NOW })) as any;
    expect(plan.resolvedSteps).toHaveLength(5);
    expect(plan.currentStepId).toBe("analyze");
    expect(plan.skillList).toContain("nit:analyze");
    expect(plan.input.stepId).toBe("analyze");
    // no side effects
    expect(existsSync(join(dir, "state.json"))).toBe(false);
    expect(existsSync(join(dir, "STEP-001-analyze"))).toBe(false);
  });
});
