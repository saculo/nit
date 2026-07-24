import { describe, expect, test } from "bun:test";
import { createAjv } from "../src/ajv";
import { resolveSchema } from "../src/schema-resolver";

function validateStepOutput(output: unknown): { valid: boolean; errors: string } {
  const ajv = createAjv();
  const validate = ajv.compile(require(resolveSchema("step-output")!));
  const valid = validate(output) as boolean;
  return { valid, errors: ajv.errorsText(validate.errors) };
}

// AC-1 — the design step's output shape
describe("nit:design output (design-result)", () => {
  const designResult = {
    resultType: "design",
    summary: "Rewrite the two step skills to read input.json and emit output.json.",
    decisions: [
      {
        id: "KD-1",
        description: "output.json is the sole canonical step artifact",
        rationale: "One validated source of truth per step; no prose drift",
      },
    ],
    components: [
      {
        name: "nit:design SKILL.md",
        responsibility: "Produce a schema-valid design-result from input.json",
        collaborators: ["supervisor", "nit validate"],
      },
    ],
    interfaces: [
      {
        name: "step-output.design-result",
        kind: "file-format",
        contract: "output.json conforming to step-output.schema.json",
      },
    ],
    filePlan: [
      { path: ".claude/skills/design/SKILL.md", action: "modified", purpose: "Rewrite for JSON output" },
    ],
  };

  test("a design-result with decisions and component design is schema-valid", () => {
    const result = validateStepOutput({
      taskId: "TASK-017",
      stepId: "design",
      stepType: "design",
      result: designResult,
    });
    expect(result.errors).toBe("No errors");
    expect(result.valid).toBe(true);
  });

  test("the added design fields are optional — the pre-existing minimum still validates", () => {
    const { valid } = validateStepOutput({
      taskId: "TASK-017",
      stepId: "design",
      stepType: "design",
      result: { resultType: "design", summary: "s", decisions: [] },
    });
    expect(valid).toBe(true);
  });

  test("a component without a responsibility is rejected", () => {
    const { valid } = validateStepOutput({
      taskId: "TASK-017",
      stepId: "design",
      stepType: "design",
      result: { ...designResult, components: [{ name: "orphan" }] },
    });
    expect(valid).toBe(false);
  });

  test("a filePlan entry with an unknown action is rejected", () => {
    const { valid } = validateStepOutput({
      taskId: "TASK-017",
      stepId: "design",
      stepType: "design",
      result: { ...designResult, filePlan: [{ path: "a.ts", action: "renamed" }] },
    });
    expect(valid).toBe(false);
  });
});

// AC-2 — the implement step's output shape
describe("nit:implement output (implementation-result)", () => {
  const implementationResult = {
    resultType: "implementation",
    filesChanged: [
      { path: ".claude/skills/design/SKILL.md", action: "modified" },
      { path: "cli/tests/step-output-shapes.test.ts", action: "created" },
    ],
    notes: ["Prior-step outputs are read from context.priorOutputs, not by globbing."],
    tests: { command: "bun test", outcome: "passed", passed: 42, failed: 0 },
    deviations: [],
    techDebt: [],
  };

  test("an implementation-result with files changed and notes is schema-valid", () => {
    const result = validateStepOutput({
      taskId: "TASK-017",
      stepId: "implement",
      stepType: "implement",
      result: implementationResult,
    });
    expect(result.errors).toBe("No errors");
    expect(result.valid).toBe(true);
  });

  test("the added implementation fields are optional — the pre-existing minimum still validates", () => {
    const { valid } = validateStepOutput({
      taskId: "TASK-017",
      stepId: "implement",
      stepType: "implement",
      result: { resultType: "implementation", filesChanged: [] },
    });
    expect(valid).toBe(true);
  });

  test("a tests block without an outcome is rejected", () => {
    const { valid } = validateStepOutput({
      taskId: "TASK-017",
      stepId: "implement",
      stepType: "implement",
      result: { ...implementationResult, tests: { command: "bun test" } },
    });
    expect(valid).toBe(false);
  });

  test("an unknown tests outcome is rejected", () => {
    const { valid } = validateStepOutput({
      taskId: "TASK-017",
      stepId: "implement",
      stepType: "implement",
      result: { ...implementationResult, tests: { outcome: "flaky" } },
    });
    expect(valid).toBe(false);
  });

  // KD-2 — resultType keeps the root oneOf unambiguous as $defs grow
  test("resultType discriminates the result branch — a mismatched result is rejected", () => {
    const { valid } = validateStepOutput({
      taskId: "TASK-017",
      stepId: "implement",
      stepType: "implement",
      result: { resultType: "implementation", summary: "s", decisions: [] },
    });
    expect(valid).toBe(false);
  });
});

// AC-4 — adrCandidates travel alongside either result type
describe("adrCandidates", () => {
  test("a design-result may carry adrCandidates", () => {
    const { valid } = validateStepOutput({
      taskId: "TASK-017",
      stepId: "design",
      stepType: "design",
      result: { resultType: "design", summary: "s", decisions: [] },
      adrCandidates: [
        {
          title: "Step skills emit output.json as the sole canonical artifact",
          context: "v1 skills persisted prose alongside JSON",
          decision: "output.json only; other files listed in artifacts[]",
          status: "proposed",
        },
      ],
    });
    expect(valid).toBe(true);
  });

  test("an adrCandidate without a decision is rejected", () => {
    const { valid } = validateStepOutput({
      taskId: "TASK-017",
      stepId: "design",
      stepType: "design",
      adrCandidates: [{ title: "t", context: "c" }],
    });
    expect(valid).toBe(false);
  });
});
