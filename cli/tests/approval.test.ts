import { describe, expect, test, beforeAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { resolveArchetype } from "../src/archetype-resolver";
import { approveStep, rejectStep, buildApproval, rejectState, type TaskState } from "../src/supervisor";
import { createAjv } from "../src/ajv";
import { resolveSchema } from "../src/schema-resolver";

const NOW = "2026-07-23T00:00:00.000Z";
const STEP_ORDER = ["analyze", "design", "implement", "review", "qa"];
let rejectionRouting: Record<string, string>;

beforeAll(async () => {
  rejectionRouting = (await resolveArchetype("backend-feature")).rejectionRouting;
});

function tmpTaskDir(): string {
  return mkdtempSync(join(tmpdir(), "nit-appr-"));
}
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8"));
}
function seedState(dir: string, currentStepId: string): void {
  const state: TaskState = {
    taskId: "TASK-016",
    currentStepId,
    stepOrder: STEP_ORDER,
    status: "awaiting_approval",
    reopenCount: 0,
    timestamps: { createdAt: NOW, updatedAt: NOW },
  };
  writeFileSync(join(dir, "state.json"), JSON.stringify(state));
}

describe("approve / reject", () => {
  // AC-1
  test("approve at the design step writes approved approval.json and advances to implement", async () => {
    const dir = tmpTaskDir();
    seedState(dir, "design");
    mkdirSync(join(dir, "STEP-002-design"), { recursive: true });

    const result = await approveStep({ taskDir: dir, now: NOW, approvedBy: "saculo", comment: "looks good" });
    expect(result.currentStepId).toBe("implement");
    expect(result.done).toBe(false);

    const approval = readJson<any>(join(dir, "STEP-002-design", "approval.json"));
    expect(approval.status).toBe("approved");
    expect(approval.timestamp).toBe(NOW);
    expect(approval.comment).toBe("looks good");

    const state = readJson<TaskState>(join(dir, "state.json"));
    expect(state.currentStepId).toBe("implement");
    expect(state.status).toBe("in-progress");
  });

  // AC-2
  test("reject at the review step reopens implement per rejection routing", async () => {
    const dir = tmpTaskDir();
    seedState(dir, "review");
    mkdirSync(join(dir, "STEP-004-review"), { recursive: true });

    const result = await rejectStep({ taskDir: dir, now: NOW, rejectionRouting, comment: "tests missing" });
    expect(result.rejectedStep).toBe("review");
    expect(result.reopenedStep).toBe("implement");

    const approval = readJson<any>(join(dir, "STEP-004-review", "approval.json"));
    expect(approval.status).toBe("rejected");
    expect(approval.comment).toBe("tests missing");

    const state = readJson<TaskState>(join(dir, "state.json"));
    expect(state.currentStepId).toBe("implement");
    expect(state.status).toBe("in-progress");
  });

  // AC-3
  test("approve at the last step completes the task with a completedAt timestamp", async () => {
    const dir = tmpTaskDir();
    seedState(dir, "qa");
    mkdirSync(join(dir, "STEP-005-qa"), { recursive: true });

    const result = await approveStep({ taskDir: dir, now: NOW });
    expect(result.done).toBe(true);
    expect(result.status).toBe("done");

    const state = readJson<TaskState>(join(dir, "state.json"));
    expect(state.status).toBe("done");
    expect(state.timestamps?.completedAt).toBe(NOW);
  });

  test("approve/reject refuse a task not awaiting approval", async () => {
    const dir = tmpTaskDir();
    const state: TaskState = {
      taskId: "TASK-016",
      currentStepId: "design",
      stepOrder: STEP_ORDER,
      status: "in-progress",
      reopenCount: 0,
    };
    writeFileSync(join(dir, "state.json"), JSON.stringify(state));
    await expect(approveStep({ taskDir: dir, now: NOW })).rejects.toThrow("awaiting_approval");
    await expect(rejectStep({ taskDir: dir, now: NOW, rejectionRouting })).rejects.toThrow("awaiting_approval");
  });

  test("rejectState throws when the step has no rejection routing", () => {
    const state: TaskState = {
      taskId: "T", currentStepId: "mystery", stepOrder: ["mystery"], status: "awaiting_approval", reopenCount: 0,
    };
    expect(() => rejectState(state, rejectionRouting, NOW)).toThrow("No rejection routing");
  });

  test("buildApproval only includes provided optional fields", () => {
    expect(buildApproval("T", "design", "approved")).toEqual({ taskId: "T", stepId: "design", status: "approved" });
    expect(buildApproval("T", "design", "rejected", { comment: "x" })).toMatchObject({ comment: "x" });
  });
});

// AC-4 — the analyze step's output shape
describe("nit:analyze output (analysis-result)", () => {
  function validateStepOutput(output: unknown): boolean {
    const ajv = createAjv();
    return ajv.compile(require(resolveSchema("step-output")!))(output);
  }

  test("an analysis-result with findings, risks, and proposedArchetype is schema-valid", () => {
    const output = {
      taskId: "TASK-016",
      stepId: "analyze",
      stepType: "analyze",
      result: {
        resultType: "analysis",
        findings: ["Requirement: approve advances state", "Requirement: reject reopens per routing"],
        risks: ["Overlap with supervisor advance branch"],
        recommendations: ["Reuse advanceState"],
        proposedArchetype: "backend-feature",
      },
    };
    expect(validateStepOutput(output)).toBe(true);
  });

  test("an analysis-result missing findings is rejected", () => {
    const output = {
      taskId: "TASK-016",
      stepId: "analyze",
      stepType: "analyze",
      result: { resultType: "analysis", proposedArchetype: "backend-feature" },
    };
    expect(validateStepOutput(output)).toBe(false);
  });
});
