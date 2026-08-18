import { describe, expect, test } from "bun:test";
import { createAjv } from "../src/ajv";
import { resolveSchema } from "../src/schema-resolver";

function validate(summary: unknown): { valid: boolean; errors: string } {
  const ajv = createAjv();
  const compiled = ajv.compile(require(resolveSchema("phase-summary")!));
  const valid = compiled(summary) as boolean;
  return { valid, errors: ajv.errorsText(compiled.errors) };
}

const minimal = {
  phaseId: "PHASE-3",
  milestone: {
    reached: false,
    criteria: [{ id: "SC-1", result: "unmet", evidence: "Boundary enforcement is unstarted." }],
  },
};

// TASK-023 — the phase summary's machine-readable shape
describe("nit:phase-summary output (phase-summary)", () => {
  test("the schema is registered and resolvable by name", () => {
    expect(resolveSchema("phase-summary")).toContain("phase-summary.schema.json");
  });

  // AC-1 — the worked example documented in .claude/skills/phase-summary/SKILL.md
  test("the shape documented in the skill validates", () => {
    const { valid, errors } = validate({
      phaseId: "PHASE-3",
      title: "Review, QA, and Boundary Enforcement",
      milestone: {
        reached: false,
        criteria: [
          { id: "SC-1", result: "met", evidence: "Step outputs show the pipeline completing.", taskIds: ["TASK-021", "TASK-022"] },
          { id: "SC-2", result: "unmet", evidence: "No task in the phase reports it.", taskIds: [] },
        ],
      },
      tasks: [
        { taskId: "TASK-021", title: "Rewrite nit:review", status: "done", readable: true },
        { taskId: "TASK-009", title: "v1 task", status: "done", readable: false },
      ],
      deviations: [{ taskId: "TASK-021", item: "Renamed the skill directory.", category: "architecture" }],
      techDebt: [{ taskId: "TASK-018", item: "oneOf error volume.", category: "code-quality", affectsPhase: "PHASE-4" }],
      reviewFindings: [{ taskId: "TASK-022", item: "The approval flag is never read." }],
      qaIssues: [],
      adrCandidates: [
        { taskId: "TASK-022", title: "Archetype fields must be consumed", context: "Three defects.", decision: "Cover each field.", status: "proposed" },
      ],
      recommendations: [
        { phaseId: "PHASE-4", scopeItem: "Run logging", recommendation: "Re-check the integration point.", reason: "nit:status was rewritten." },
      ],
      unreadable: [{ taskId: "TASK-009", reason: "Recorded as v1 prose.", found: ["TASK.md", "REVIEW.md"] }],
      plr: ".nit/plr/0002-phase-3-review-qa.md",
    });
    expect(errors).toBe("No errors");
    expect(valid).toBe(true);
  });

  test("phaseId and milestone are the minimum", () => {
    expect(validate(minimal).valid).toBe(true);
  });

  test.each(["phaseId", "milestone"])("a summary without %s is rejected", (field) => {
    const summary: Record<string, unknown> = { ...minimal };
    delete summary[field];
    expect(validate(summary).valid).toBe(false);
  });

  test("an unknown top-level field is rejected", () => {
    expect(validate({ ...minimal, verdict: "approved" }).valid).toBe(false);
  });

  // AC-2 — the milestone verdict is explicit, per criterion, with evidence
  test("a criterion without evidence is rejected", () => {
    const { valid } = validate({
      phaseId: "PHASE-3",
      milestone: { reached: true, criteria: [{ id: "SC-1", result: "met" }] },
    });
    expect(valid).toBe(false);
  });

  test("a criterion result outside met/unmet is rejected", () => {
    const { valid } = validate({
      phaseId: "PHASE-3",
      milestone: { reached: true, criteria: [{ id: "SC-1", result: "partial", evidence: "e" }] },
    });
    expect(valid).toBe(false);
  });

  test("milestone requires both reached and criteria", () => {
    expect(validate({ phaseId: "P", milestone: { reached: true } }).valid).toBe(false);
    expect(validate({ phaseId: "P", milestone: { criteria: [] } }).valid).toBe(false);
  });

  // AC-3 — every aggregated item stays traceable to the task that reported it
  test.each(["deviations", "techDebt", "reviewFindings", "qaIssues"])(
    "%s entries require a taskId and a non-empty item",
    (field) => {
      const withTask = { ...minimal, [field]: [{ taskId: "TASK-021", item: "something" }] };
      expect(validate(withTask).valid).toBe(true);

      const noTask = { ...minimal, [field]: [{ item: "something" }] };
      expect(validate(noTask).valid).toBe(false);

      const noItem = { ...minimal, [field]: [{ taskId: "TASK-021" }] };
      expect(validate(noItem).valid).toBe(false);

      const emptyItem = { ...minimal, [field]: [{ taskId: "TASK-021", item: "" }] };
      expect(validate(emptyItem).valid).toBe(false);
    }
  );

  test("an adrCandidate is attributed and complete, or rejected", () => {
    const complete = {
      ...minimal,
      adrCandidates: [{ taskId: "TASK-022", title: "t", context: "c", decision: "d" }],
    };
    expect(validate(complete).valid).toBe(true);

    const unattributed = { ...minimal, adrCandidates: [{ title: "t", context: "c", decision: "d" }] };
    expect(validate(unattributed).valid).toBe(false);

    const noDecision = { ...minimal, adrCandidates: [{ taskId: "TASK-022", title: "t", context: "c" }] };
    expect(validate(noDecision).valid).toBe(false);
  });

  test("a recommendation must name the phase it affects", () => {
    const named = { ...minimal, recommendations: [{ phaseId: "PHASE-4", recommendation: "do x" }] };
    expect(validate(named).valid).toBe(true);

    const unnamed = { ...minimal, recommendations: [{ recommendation: "consider reviewing" }] };
    expect(validate(unnamed).valid).toBe(false);
  });

  // AC-4 — a partial summary declares its own gaps
  test("an unreadable task is recorded with a reason", () => {
    const declared = {
      ...minimal,
      tasks: [{ taskId: "TASK-009", status: "done", readable: false }],
      unreadable: [{ taskId: "TASK-009", reason: "v1 prose; no step output." }],
    };
    expect(validate(declared).valid).toBe(true);

    const reasonless = { ...minimal, unreadable: [{ taskId: "TASK-009" }] };
    expect(validate(reasonless).valid).toBe(false);
  });

  test("a task roll-up entry requires a taskId and a status", () => {
    expect(validate({ ...minimal, tasks: [{ taskId: "TASK-021", status: "done" }] }).valid).toBe(true);
    expect(validate({ ...minimal, tasks: [{ taskId: "TASK-021" }] }).valid).toBe(false);
    expect(validate({ ...minimal, tasks: [{ status: "done" }] }).valid).toBe(false);
  });
});
