import { join } from "path";
import { mkdirSync } from "fs";
import { createAjv } from "./ajv";
import { resolveSchema } from "./schema-resolver";
import { baseSkillForStep } from "./routing-resolver";
import { engineerRoleForTaskType, type ArchetypeStep } from "./archetype-resolver";

/** Runtime state for a task's step progression (task-state.schema.json). */
export interface TaskState {
  taskId: string;
  currentStepId: string;
  stepOrder: string[];
  status: "pending" | "in-progress" | "awaiting_approval" | "blocked" | "escalated" | "done" | "failed";
  reopenCount: number;
  repairRequired?: boolean;
  reworkFrom?: ReworkFrom;
  timestamps?: { createdAt: string; updatedAt: string; completedAt?: string };
}

/**
 * Why a step was reopened by a rejection rather than by a validation failure.
 * `repairErrors` says the output was malformed; this says it was well-formed and
 * unsatisfactory, which calls for a different response (TASK-031).
 */
export interface ReworkFrom {
  /** The step that was rejected. */
  stepId: string;
  /** The rejection comment — the specialist's rework context. */
  comment?: string;
  /**
   * The rejecting step's output.json, relative to the task directory. Not
   * reachable through priorOutputs, which maps only steps before the current
   * index — and a rejection routes backwards, so the cause is always after.
   */
  output?: string;
}

/** Input payload handed to a specialist (step-input.schema.json). */
export interface StepInput {
  taskId: string;
  stepId: string;
  stepType: string;
  role: string;
  skillList?: string[];
  context?: Record<string, unknown>;
}

/** A single validation error entry (validation-result.schema.json). */
export interface ValidationError {
  path: string;
  message: string;
  severity?: "error" | "warning";
}

/** Outcome of a schema/policy validation (validation-result.schema.json). */
export interface ValidationResult {
  schemaValid: boolean;
  policyValid: boolean;
  errors: ValidationError[];
  action: "repair" | "proceed" | "block";
}

/** Why a step cannot proceed (step-output.schema.json #/$defs/blocked-result). */
export type BlockedReason =
  | "needs-splitting"
  | "contradictory-input"
  | "criterion-unsatisfiable"
  | "no-output";

/** A specialist's report that it cannot complete its step. */
export interface BlockedResult {
  resultType: "blocked";
  reason: BlockedReason;
  explanation: string;
  detail?: Record<string, unknown>;
}

/** True when a step output carries a blocked result rather than a step result. */
export function blockedResultOf(output: unknown): BlockedResult | undefined {
  const result = (output as { result?: unknown } | undefined)?.result as BlockedResult | undefined;
  return result?.resultType === "blocked" ? result : undefined;
}

const pad3 = (n: number): string => String(n).padStart(3, "0");

/** Directory name for a step by its position in the resolved step order (U-6). */
export function stepDirName(index0: number, stepId: string): string {
  return `STEP-${pad3(index0 + 1)}-${stepId}`;
}

/** Index of the current step within stepOrder. */
export function currentIndex(state: TaskState): number {
  return state.stepOrder.indexOf(state.currentStepId);
}

/** Fresh state for a task starting at the first resolved step. */
export function initialState(taskId: string, steps: ArchetypeStep[], now: string): TaskState {
  if (steps.length === 0) throw new Error("Cannot initialize state: archetype has no steps");
  return {
    taskId,
    currentStepId: steps[0]!.id,
    stepOrder: steps.map((s) => s.id),
    status: "in-progress",
    reopenCount: 0,
    repairRequired: false,
    timestamps: { createdAt: now, updatedAt: now },
  };
}

/**
 * Advance to the next step, resetting the per-step counters. When the current
 * step is the last one, the task transitions to `done`.
 */
export function advanceState(state: TaskState, now: string): TaskState {
  const next = state.stepOrder[currentIndex(state) + 1];
  // Advancing means the current step succeeded, so any rework it was carrying is
  // discharged. Leaving it would resurface a stale rejection on a later reopen.
  const { reworkFrom: _discharged, ...cleared } = state;
  if (next === undefined) {
    return {
      ...cleared,
      status: "done",
      repairRequired: false,
      timestamps: { ...(state.timestamps ?? { createdAt: now, updatedAt: now }), updatedAt: now, completedAt: now },
    };
  }
  return {
    ...cleared,
    currentStepId: next,
    status: "in-progress",
    reopenCount: 0,
    repairRequired: false,
    timestamps: { ...(state.timestamps ?? { createdAt: now, updatedAt: now }), updatedAt: now },
  };
}

/**
 * Resolve a step's role for dispatch. `$engineer` is substituted at archetype
 * resolution, but `$detect` survives it deliberately — the archetype has no task
 * context — so it is resolved here from the task's own `type`.
 *
 * A descriptor must never carry a `$`-prefixed role: `nit:continue` passes the
 * role straight to the Agent tool as `subagent_type`, and no agent answers to a
 * placeholder (TASK-028).
 */
export async function resolveStepRole(
  step: ArchetypeStep,
  taskDir: string
): Promise<ArchetypeStep> {
  if (!step.role.startsWith("$")) return step;
  if (step.role !== "$detect") {
    throw new Error(
      `Unresolved placeholder role "${step.role}" at step "${step.id}"; ` +
        `only $engineer and $detect are defined.`
    );
  }
  const task = await readJson<{ type?: string }>(join(taskDir, "task.json"));
  if (!task?.type) {
    throw new Error(
      `Cannot resolve $detect at step "${step.id}": no task.json with a "type" in ${taskDir}. ` +
        `The archetype defers the engineer to the task, so the task must declare one.`
    );
  }
  return { ...step, role: engineerRoleForTaskType(task.type, step.id) };
}

/**
 * Whether a step stops for a human decision. The archetype declares it per step
 * (`approval`); an archetype that omits the flag is treated as gated, because
 * inferring "no human review needed" from silence is not a safe default.
 */
export function stepIsGated(step: ArchetypeStep): boolean {
  return step.approval !== false;
}

/** Build the step input payload for a specialist. */
export function buildStepInput(
  taskId: string,
  step: ArchetypeStep,
  skillList: string[],
  context: Record<string, unknown>
): StepInput {
  return { taskId, stepId: step.id, stepType: step.id, role: step.role, skillList, context };
}

/** Result of ingesting a valid step output. */
export function ingestValid(state: TaskState, now: string): { state: TaskState; approval: Approval } {
  const { reworkFrom: _discharged, ...cleared } = state;
  const updated: TaskState = {
    ...cleared,
    status: "awaiting_approval",
    repairRequired: false,
    timestamps: { ...(state.timestamps ?? { createdAt: now, updatedAt: now }), updatedAt: now },
  };
  return {
    state: updated,
    approval: { taskId: state.taskId, stepId: state.currentStepId, status: "pending" },
  };
}

/** Approval record (approval.schema.json). */
export interface Approval {
  taskId: string;
  stepId: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  timestamp?: string;
  comment?: string;
}

/**
 * Result of ingesting a blocked step output. The task parks at `blocked` for a
 * human decision: the step did not fail validation, it reported that it cannot
 * succeed, so re-running it would waste the reopen budget. `reopenCount` is
 * therefore left untouched and no repair is scheduled (TASK-018 AC-2, D-2).
 */
export function ingestBlocked(state: TaskState, now: string): TaskState {
  return {
    ...state,
    status: "blocked",
    repairRequired: false,
    timestamps: { ...(state.timestamps ?? { createdAt: now, updatedAt: now }), updatedAt: now },
  };
}

/**
 * Result of ingesting an invalid step output. Increments reopenCount and either
 * reopens the step for repair or, once the reopen budget is exceeded, escalates.
 */
export function ingestInvalid(
  state: TaskState,
  errors: ValidationError[],
  maxReopenCount: number,
  now: string
): { state: TaskState; validation: ValidationResult; escalated: boolean } {
  const newCount = state.reopenCount + 1;
  const escalated = newCount > maxReopenCount;
  const updated: TaskState = {
    ...state,
    reopenCount: newCount,
    repairRequired: !escalated,
    status: escalated ? "escalated" : "in-progress",
    timestamps: { ...(state.timestamps ?? { createdAt: now, updatedAt: now }), updatedAt: now },
  };
  const validation: ValidationResult = {
    schemaValid: false,
    policyValid: true,
    errors,
    action: "repair",
  };
  return { state: updated, validation, escalated };
}

/** Load maxReopenCount from config/supervisor.json, defaulting to 3. */
export async function loadMaxReopenCount(configPath: string): Promise<number> {
  const file = Bun.file(configPath);
  if (!(await file.exists())) return 3;
  const config = await file.json();
  return typeof config.maxReopenCount === "number" ? config.maxReopenCount : 3;
}

// --- fs orchestration -------------------------------------------------------

/** Validate an object against a named schema; throw with details if invalid. */
function assertValid(schemaName: string, data: unknown): void {
  const schemaPath = resolveSchema(schemaName);
  if (!schemaPath) throw new Error(`Schema not found in registry: ${schemaName}`);
  const ajv = createAjv();
  const validate = ajv.compile(require(schemaPath));
  if (!validate(data)) {
    const details = (validate.errors ?? [])
      .map((e) => `  ${e.instancePath || "/"}: ${e.message}`)
      .join("\n");
    throw new Error(`${schemaName} validation failed:\n${details}`);
  }
}

async function writeJson(path: string, data: unknown, schemaName: string): Promise<void> {
  assertValid(schemaName, data);
  await Bun.write(path, JSON.stringify(data, null, 2) + "\n");
}

async function readJson<T>(path: string): Promise<T | undefined> {
  const file = Bun.file(path);
  if (!(await file.exists())) return undefined;
  return file.json();
}

/** Options shared by prepare/ingest/dryRun. */
export interface SupervisorOptions {
  taskDir: string;
  taskId: string;
  steps: ArchetypeStep[];
  now?: string;
  /** Resolve the ordered skill list for a step (defaults to [nit:<stepId>]). */
  resolveSkillList?: (step: ArchetypeStep) => string[];
  /** Build the specialist context for a step (defaults to a task/step reference). */
  buildContext?: (state: TaskState, step: ArchetypeStep, repairErrors?: ValidationError[]) => Record<string, unknown>;
}

/** Dispatch descriptor returned by prepare — what the skill dispatches. */
export interface DispatchDescriptor {
  taskId: string;
  stepId: string;
  role: string;
  skillList: string[];
  stepDir: string;
  inputPath: string;
  action: "start" | "advance" | "resume" | "reopen";
}

function defaultSkillList(step: ArchetypeStep): string[] {
  return [baseSkillForStep(step.id)];
}

function defaultContext(state: TaskState, step: ArchetypeStep, repairErrors?: ValidationError[]): Record<string, unknown> {
  const ctx: Record<string, unknown> = { taskId: state.taskId, stepId: step.id };
  if (repairErrors && repairErrors.length > 0) ctx.repairErrors = repairErrors;
  return ctx;
}

/**
 * Map every completed step that produced an output.json to its path, keyed by
 * step id. Threaded into the step input so a specialist reads earlier results
 * (e.g. implement reading the design output) without re-deriving the
 * STEP-NNN-<id> directory convention itself.
 *
 * Paths are relative to the task directory, so input.json stays portable across
 * checkouts even when the caller passes an absolute --task-dir.
 */
export async function priorOutputs(
  taskDir: string,
  steps: ArchetypeStep[],
  currentIdx: number
): Promise<Record<string, string>> {
  const outputs: Record<string, string> = {};
  for (let i = 0; i < currentIdx; i++) {
    const step = steps[i]!;
    const relative = join(stepDirName(i, step.id), "output.json");
    if (await Bun.file(join(taskDir, relative)).exists()) outputs[step.id] = relative;
  }
  return outputs;
}

/**
 * Assemble the specialist context for a step: the caller's (or default) context
 * plus the prior-step outputs. Shared by prepare and dryRun so the two cannot
 * report different inputs for the same step. A context that already carries
 * priorOutputs is left untouched.
 */
async function assembleContext(
  opts: SupervisorOptions,
  state: TaskState,
  step: ArchetypeStep,
  stepIdx: number,
  repairErrors?: ValidationError[]
): Promise<Record<string, unknown>> {
  const buildContext = opts.buildContext ?? defaultContext;
  const context = buildContext(state, step, repairErrors);
  // A rejection routes backwards, so the rejecting step is always *after* this
  // one and priorOutputs structurally cannot reach it. Thread it separately.
  const withRework =
    state.reworkFrom !== undefined && context.reworkFrom === undefined
      ? { ...context, reworkFrom: state.reworkFrom }
      : context;
  if (withRework.priorOutputs !== undefined) return withRework;
  const outputs = await priorOutputs(opts.taskDir, opts.steps, stepIdx);
  return Object.keys(outputs).length > 0 ? { ...withRework, priorOutputs: outputs } : withRework;
}

/**
 * Prepare the next step: create or advance state.json, scaffold the step
 * directory, write input.json, and return the dispatch descriptor. Blocks
 * (returns a status without writing) when the current step is still awaiting an
 * un-granted approval, or when the task is blocked/escalated/done.
 */
export async function prepare(
  opts: SupervisorOptions
): Promise<DispatchDescriptor | { blocked: true; status: string } | { done: true }> {
  const now = opts.now ?? new Date().toISOString();
  const resolveSkillList = opts.resolveSkillList ?? defaultSkillList;
  const statePath = join(opts.taskDir, "state.json");

  let state = await readJson<TaskState>(statePath);
  let action: DispatchDescriptor["action"];
  let repairErrors: ValidationError[] | undefined;

  if (!state) {
    state = initialState(opts.taskId, opts.steps, now);
    action = "start";
  } else if (state.status === "escalated") {
    return { blocked: true, status: "escalated" };
  } else if (state.status === "blocked") {
    return { blocked: true, status: "blocked" };
  } else if (state.status === "done") {
    return { done: true };
  } else if (state.status === "awaiting_approval") {
    const idx = currentIndex(state);
    const dir = join(opts.taskDir, stepDirName(idx, state.currentStepId));
    const approval = await readJson<Approval>(join(dir, "approval.json"));
    if (approval?.status !== "approved") {
      return { blocked: true, status: "awaiting_approval" };
    }
    state = advanceState(state, now);
    if (state.status === "done") {
      await writeJson(statePath, state, "task-state");
      return { done: true };
    }
    action = "advance";
  } else if (state.repairRequired) {
    // in-progress + repairRequired: reopen the same step with prior errors.
    const idx = currentIndex(state);
    const prior = await readJson<ValidationResult>(join(opts.taskDir, stepDirName(idx, state.currentStepId), "validation.json"));
    repairErrors = prior?.errors ?? [];
    action = "reopen";
  } else {
    action = "resume";
  }

  const idx = currentIndex(state);
  const step = await resolveStepRole(opts.steps[idx]!, opts.taskDir);
  const dir = join(opts.taskDir, stepDirName(idx, step.id));
  mkdirSync(dir, { recursive: true });

  const skillList = resolveSkillList(step);
  const context = await assembleContext(opts, state, step, idx, repairErrors);
  const input = buildStepInput(state.taskId, step, skillList, context);
  const inputPath = join(dir, "input.json");
  await writeJson(inputPath, input, "step-input");
  await writeJson(statePath, state, "task-state");

  return { taskId: state.taskId, stepId: step.id, role: step.role, skillList, stepDir: dir, inputPath, action };
}

/** Result of ingesting a step's output.json. */
export type IngestResult =
  | { valid: true; status: "awaiting_approval"; stepId: string }
  | { valid: true; status: string; stepId: string; gated: false; advancedTo?: string }
  | {
      valid: boolean;
      blocked: true;
      status: "blocked";
      stepId: string;
      reason: BlockedReason;
      explanation: string;
    }
  | { valid: false; escalated: boolean; status: string; stepId: string; errors: ValidationError[] };

/**
 * Ingest the current step's output.json: validate against step-output, then
 * either park at awaiting_approval (valid) or record validation errors and
 * reopen/escalate (invalid).
 */
export async function ingest(
  opts: SupervisorOptions & { maxReopenCount?: number; validateOutput?: (output: unknown) => ValidationError[] }
): Promise<IngestResult> {
  const now = opts.now ?? new Date().toISOString();
  const resolveSkillList = opts.resolveSkillList ?? defaultSkillList;
  const statePath = join(opts.taskDir, "state.json");

  const state = await readJson<TaskState>(statePath);
  if (!state) throw new Error(`No state.json in ${opts.taskDir}; run prepare first`);

  const idx = currentIndex(state);
  // Resolved here too: the reopen path below rebuilds input.json, and an
  // unresolved $detect would be written back into it (the TASK-017 RW-1 lesson —
  // prepare, dryRun and ingest must not diverge).
  const step = await resolveStepRole(opts.steps[idx]!, opts.taskDir);
  const dir = join(opts.taskDir, stepDirName(idx, step.id));
  const output = await readJson<unknown>(join(dir, "output.json"));

  // A step that stopped without writing anything is blocked, not broken: there
  // is nothing to repair, so record the miss and park for a human (AC-3).
  if (output === undefined) {
    // Name the step directory relatively: validation.json is a committed
    // artifact, and an absolute --task-dir would bake a machine-specific path
    // into it (the TASK-017 RW-2 lesson).
    const explanation = `No output.json in ${stepDirName(idx, step.id)}; the step produced no result.`;
    const validation: ValidationResult = {
      schemaValid: false,
      policyValid: true,
      errors: [{ path: "/", message: explanation, severity: "error" }],
      action: "block",
    };
    await writeJson(join(dir, "validation.json"), validation, "validation-result");
    await writeJson(statePath, ingestBlocked(state, now), "task-state");
    return {
      valid: false,
      blocked: true,
      status: "blocked",
      stepId: step.id,
      reason: "no-output",
      explanation,
    };
  }

  const errors = (opts.validateOutput ?? defaultValidateOutput)(output);

  // A schema-valid blocked result: the specialist ran and reported it cannot
  // proceed. No validation.json — nothing failed validation (AC-2). A malformed
  // blocked result falls through to the repair path like any other bad output.
  const blocked = errors.length === 0 ? blockedResultOf(output) : undefined;
  if (blocked) {
    await writeJson(statePath, ingestBlocked(state, now), "task-state");
    return {
      valid: true,
      blocked: true,
      status: "blocked",
      stepId: step.id,
      reason: blocked.reason,
      explanation: blocked.explanation,
    };
  }

  if (errors.length === 0) {
    // The archetype decides whether this step stops for a human (TASK-029).
    // An archetype that omits the flag is treated as gated: skipping human
    // review is not a safe default to infer from silence.
    if (stepIsGated(step)) {
      const { state: next, approval } = ingestValid(state, now);
      approval.timestamp = now;
      await writeJson(join(dir, "approval.json"), approval, "approval");
      await writeJson(statePath, next, "task-state");
      return { valid: true, status: "awaiting_approval", stepId: step.id };
    }

    // Ungated: advance without a human decision. An auto-approved approval.json
    // is still written so the step's record looks the same shape as a gated
    // one — and so `prepare`, which decides by reading that file, cannot see a
    // half-finished step if it runs before the state write lands.
    const approval = buildApproval(state.taskId, step.id, "approved", {
      approvedBy: "supervisor",
      timestamp: now,
      comment: `Step "${step.id}" is not gated by the archetype (approval: false).`,
    });
    await writeJson(join(dir, "approval.json"), approval, "approval");
    const next = advanceState(state, now);
    await writeJson(statePath, next, "task-state");
    return {
      valid: true,
      status: next.status,
      stepId: step.id,
      gated: false,
      advancedTo: next.status === "done" ? undefined : next.currentStepId,
    };
  }

  const maxReopen = opts.maxReopenCount ?? 3;
  const { state: next, validation, escalated } = ingestInvalid(state, errors, maxReopen, now);
  await writeJson(join(dir, "validation.json"), validation, "validation-result");
  await writeJson(statePath, next, "task-state");

  if (!escalated) {
    // Reopen the same step with the errors embedded in a fresh input.json. The
    // context is assembled the same way prepare does it, so reopening never
    // strips the prior-step outputs the specialist still needs.
    const context = await assembleContext(opts, next, step, idx, errors);
    const input = buildStepInput(next.taskId, step, resolveSkillList(step), context);
    await writeJson(join(dir, "input.json"), input, "step-input");
  }

  return {
    valid: false,
    escalated,
    status: next.status,
    stepId: step.id,
    errors,
  };
}

/** Validate a step output against step-output.schema.json. */
export function defaultValidateOutput(output: unknown): ValidationError[] {
  const schemaPath = resolveSchema("step-output");
  const ajv = createAjv();
  const validate = ajv.compile(require(schemaPath!));
  if (validate(output)) return [];
  return (validate.errors ?? []).map((e) => ({
    path: e.instancePath || "/",
    message: e.message ?? "invalid",
    severity: "error" as const,
  }));
}

/** Plan returned by dryRun — what a real prepare would produce. */
export interface DryRunPlan {
  taskId: string;
  resolvedSteps: ArchetypeStep[];
  currentStepId: string;
  skillList: string[];
  input: StepInput;
}

/**
 * Compute what prepare would do for the next step without any side effects:
 * no directory creation, no file writes, no dispatch.
 */
export async function dryRun(opts: SupervisorOptions): Promise<DryRunPlan | { done: true } | { blocked: true; status: string }> {
  const now = opts.now ?? new Date().toISOString();
  const resolveSkillList = opts.resolveSkillList ?? defaultSkillList;
  const existing = await readJson<TaskState>(join(opts.taskDir, "state.json"));

  let state: TaskState;
  if (!existing) {
    state = initialState(opts.taskId, opts.steps, now);
  } else if (existing.status === "escalated") {
    return { blocked: true, status: "escalated" };
  } else if (existing.status === "blocked") {
    return { blocked: true, status: "blocked" };
  } else if (existing.status === "done") {
    return { done: true };
  } else if (existing.status === "awaiting_approval") {
    const idx = currentIndex(existing);
    const approval = await readJson<Approval>(join(opts.taskDir, stepDirName(idx, existing.currentStepId), "approval.json"));
    state = approval?.status === "approved" ? advanceState(existing, now) : existing;
    if (state.status === "done") return { done: true };
  } else {
    state = existing;
  }

  const idx = currentIndex(state);
  const step = await resolveStepRole(opts.steps[idx]!, opts.taskDir);
  const skillList = resolveSkillList(step);
  const repairErrors = state.repairRequired
    ? (await readJson<ValidationResult>(join(opts.taskDir, stepDirName(idx, step.id), "validation.json")))?.errors
    : undefined;
  const context = await assembleContext(opts, state, step, idx, repairErrors);
  const input = buildStepInput(state.taskId, step, skillList, context);
  return { taskId: state.taskId, resolvedSteps: opts.steps, currentStepId: step.id, skillList, input };
}

// --- approval operations (TASK-016) ----------------------------------------

/**
 * Reopen the rejection-routing target for the current step. Resets the repair
 * counters — a rejection starts the target step fresh.
 */
export function rejectState(
  state: TaskState,
  rejectionRouting: Record<string, string>,
  now: string,
  rework?: Omit<ReworkFrom, "stepId">
): TaskState {
  const target = rejectionRouting[state.currentStepId];
  if (!target) throw new Error(`No rejection routing for step "${state.currentStepId}"`);
  // Belt and braces against a hand-authored archetype or a hand-edited state:
  // resolution validates this, but rejectState is reachable with any routing map
  // and moving currentStepId outside stepOrder breaks the next prepare (TASK-027).
  if (!state.stepOrder.includes(target)) {
    throw new Error(
      `Rejecting "${state.currentStepId}" would reopen "${target}", which is not in this task's ` +
        `step order (${state.stepOrder.join(", ")}).`
    );
  }
  return {
    ...state,
    currentStepId: target,
    status: "in-progress",
    repairRequired: false,
    reopenCount: 0,
    // The rejection's reasoning has to travel with the state: it is written into
    // the *rejected* step's approval.json, but the *reopened* step is the one
    // that needs it, and nothing else carries it across (TASK-031).
    reworkFrom: { stepId: state.currentStepId, ...rework },
    timestamps: { ...(state.timestamps ?? { createdAt: now, updatedAt: now }), updatedAt: now },
  };
}

/** Construct an approval record. */
export function buildApproval(
  taskId: string,
  stepId: string,
  status: Approval["status"],
  opts?: { approvedBy?: string; comment?: string; timestamp?: string }
): Approval {
  const approval: Approval = { taskId, stepId, status };
  if (opts?.approvedBy) approval.approvedBy = opts.approvedBy;
  if (opts?.timestamp) approval.timestamp = opts.timestamp;
  if (opts?.comment) approval.comment = opts.comment;
  return approval;
}

/** Common options for approve/reject operations. */
interface ApprovalOpts {
  taskDir: string;
  now?: string;
}

/** Assert the task is parked at awaiting_approval and return its state + current step dir. */
async function loadAwaitingApproval(taskDir: string, verb: string): Promise<{ state: TaskState; dir: string }> {
  const state = await readJson<TaskState>(join(taskDir, "state.json"));
  if (!state) throw new Error(`No state.json in ${taskDir}`);
  if (state.status !== "awaiting_approval") {
    throw new Error(`Cannot ${verb}: task status is "${state.status}", expected awaiting_approval`);
  }
  const dir = join(taskDir, stepDirName(currentIndex(state), state.currentStepId));
  return { state, dir };
}

/**
 * Approve the current step: write an approved approval.json and advance the
 * task to the next step (or complete it at the last step).
 */
export async function approveStep(
  opts: ApprovalOpts & { approvedBy?: string; comment?: string }
): Promise<{ status: string; currentStepId: string; done: boolean }> {
  const now = opts.now ?? new Date().toISOString();
  const { state, dir } = await loadAwaitingApproval(opts.taskDir, "approve");
  const approval = buildApproval(state.taskId, state.currentStepId, "approved", {
    approvedBy: opts.approvedBy,
    comment: opts.comment,
    timestamp: now,
  });
  await writeJson(join(dir, "approval.json"), approval, "approval");
  const next = advanceState(state, now);
  await writeJson(join(opts.taskDir, "state.json"), next, "task-state");
  return { status: next.status, currentStepId: next.currentStepId, done: next.status === "done" };
}

/**
 * Reject the current step: write a rejected approval.json and reopen the
 * archetype's rejection-routing target for the current step.
 */
export async function rejectStep(
  opts: ApprovalOpts & { rejectionRouting: Record<string, string>; comment?: string }
): Promise<{ status: string; rejectedStep: string; reopenedStep: string }> {
  const now = opts.now ?? new Date().toISOString();
  const { state, dir } = await loadAwaitingApproval(opts.taskDir, "reject");
  const approval = buildApproval(state.taskId, state.currentStepId, "rejected", {
    comment: opts.comment,
    timestamp: now,
  });
  await writeJson(join(dir, "approval.json"), approval, "approval");
  const rejectedStep = state.currentStepId;
  const rejectedDir = stepDirName(currentIndex(state), rejectedStep);
  const outputPath = join(rejectedDir, "output.json");
  const next = rejectState(state, opts.rejectionRouting, now, {
    comment: opts.comment,
    // Task-relative so the committed input.json stays portable (TASK-017 RW-2).
    output: (await Bun.file(join(opts.taskDir, outputPath)).exists()) ? outputPath : undefined,
  });
  await writeJson(join(opts.taskDir, "state.json"), next, "task-state");
  return { status: next.status, rejectedStep, reopenedStep: next.currentStepId };
}
