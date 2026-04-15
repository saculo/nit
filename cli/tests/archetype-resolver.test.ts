import { describe, expect, test } from "bun:test";
import {
  loadArchetype,
  validateArchetype,
  replacePlaceholders,
  applyOverrides,
  resolveArchetype,
  type ArchetypeStep,
} from "../src/archetype-resolver";

describe("loadArchetype", () => {
  test("loads an existing archetype by name", async () => {
    const archetype = await loadArchetype("base");
    expect(archetype.id).toBe("base");
    expect(archetype.abstract).toBe(true);
    expect(archetype.steps).toHaveLength(5);
  });

  test("throws for non-existent archetype", async () => {
    await expect(loadArchetype("does-not-exist")).rejects.toThrow(
      'Archetype not found: "does-not-exist"'
    );
  });
});

describe("validateArchetype", () => {
  test("accepts a valid abstract archetype", () => {
    const valid = {
      id: "test",
      abstract: true,
      steps: [{ id: "s1", role: "analyst", approval: false }],
    };
    expect(() => validateArchetype(valid)).not.toThrow();
  });

  test("accepts a valid child archetype without steps", () => {
    const valid = {
      id: "child",
      extends: "base",
      engineerRole: "backend-engineer",
    };
    expect(() => validateArchetype(valid)).not.toThrow();
  });

  test("rejects archetype without id", () => {
    const invalid = { steps: [{ id: "s1", role: "r" }] };
    expect(() => validateArchetype(invalid)).toThrow("Archetype validation failed");
  });

  test("rejects non-extending archetype without steps", () => {
    const invalid = { id: "no-steps" };
    expect(() => validateArchetype(invalid)).toThrow("Archetype validation failed");
  });
});

describe("replacePlaceholders", () => {
  const steps: ArchetypeStep[] = [
    { id: "analyze", role: "analyst" },
    { id: "implement", role: "$engineer" },
    { id: "review", role: "reviewer" },
  ];

  test("replaces $engineer with the given engineerRole", () => {
    const result = replacePlaceholders(steps, "backend-engineer");
    expect(result[1].role).toBe("backend-engineer");
    expect(result[0].role).toBe("analyst");
    expect(result[2].role).toBe("reviewer");
  });

  test("preserves $detect as-is in role", () => {
    const result = replacePlaceholders(steps, "$detect");
    expect(result[1].role).toBe("$detect");
  });

  test("leaves $engineer unchanged when engineerRole is undefined", () => {
    const result = replacePlaceholders(steps, undefined);
    expect(result[1].role).toBe("$engineer");
  });

  test("does not mutate original steps", () => {
    replacePlaceholders(steps, "frontend-engineer");
    expect(steps[1].role).toBe("$engineer");
  });
});

describe("applyOverrides", () => {
  const parentSteps: ArchetypeStep[] = [
    { id: "analyze", role: "analyst", approval: false },
    { id: "design", role: "architect", approval: true },
    { id: "implement", role: "$engineer", approval: false },
    { id: "review", role: "reviewer", approval: true },
    { id: "qa", role: "qa", approval: false },
  ];

  test("returns a copy of parent steps when no overrides", () => {
    const result = applyOverrides(parentSteps, undefined);
    expect(result).toEqual(parentSteps);
    expect(result).not.toBe(parentSteps);
    expect(result[0]).not.toBe(parentSteps[0]);
  });

  test("removes steps listed in removeSteps", () => {
    const result = applyOverrides(parentSteps, {
      removeSteps: ["analyze"],
    });
    expect(result).toHaveLength(4);
    expect(result.map((s) => s.id)).toEqual(["design", "implement", "review", "qa"]);
  });

  test("applies step property modifications", () => {
    const result = applyOverrides(parentSteps, {
      steps: {
        design: { approval: false },
      },
    });
    expect(result.find((s) => s.id === "design")!.approval).toBe(false);
  });

  test("adds steps after the specified anchor", () => {
    const result = applyOverrides(parentSteps, {
      addSteps: [
        { id: "boundary-check", after: "implement", role: "reviewer", approval: true },
      ],
    });
    expect(result).toHaveLength(6);
    expect(result.map((s) => s.id)).toEqual([
      "analyze", "design", "implement", "boundary-check", "review", "qa",
    ]);
  });

  test("throws when addStep anchor is not found", () => {
    expect(() =>
      applyOverrides(parentSteps, {
        addSteps: [
          { id: "extra", after: "nonexistent", role: "r" },
        ],
      })
    ).toThrow('anchor step "nonexistent" not found');
  });

  test("applies overrides in correct order: removeSteps, then mods, then addSteps", () => {
    // Remove analyze, modify design approval, add a step after implement
    const result = applyOverrides(parentSteps, {
      removeSteps: ["analyze"],
      steps: {
        design: { approval: false },
      },
      addSteps: [
        { id: "extra", after: "implement", role: "extra-role" },
      ],
    });
    expect(result.map((s) => s.id)).toEqual([
      "design", "implement", "extra", "review", "qa",
    ]);
    expect(result.find((s) => s.id === "design")!.approval).toBe(false);
  });
});

describe("resolveArchetype", () => {
  test("resolves backend-feature with 5 steps and replaced engineer role", async () => {
    const resolved = await resolveArchetype("backend-feature");
    expect(resolved.id).toBe("backend-feature");
    expect(resolved.engineerRole).toBe("backend-engineer");
    expect(resolved.steps).toHaveLength(5);
    expect(resolved.steps.map((s) => s.id)).toEqual([
      "analyze", "design", "implement", "review", "qa",
    ]);
    expect(resolved.steps.find((s) => s.id === "implement")!.role).toBe(
      "backend-engineer"
    );
  });

  test("resolves bugfix with 4 steps, design approval false, $detect role", async () => {
    const resolved = await resolveArchetype("bugfix");
    expect(resolved.steps).toHaveLength(4);
    expect(resolved.steps.map((s) => s.id)).toEqual([
      "design", "implement", "review", "qa",
    ]);
    expect(resolved.steps.find((s) => s.id === "design")!.approval).toBe(false);
    expect(resolved.steps.find((s) => s.id === "implement")!.role).toBe("$detect");
    expect(resolved.engineerRole).toBe("$detect");
  });

  test("resolves cross-module-change with 6 steps including boundary-check", async () => {
    const resolved = await resolveArchetype("cross-module-change");
    expect(resolved.steps).toHaveLength(6);
    expect(resolved.steps.map((s) => s.id)).toEqual([
      "analyze", "design", "implement", "boundary-check", "review", "qa",
    ]);
    expect(resolved.steps.find((s) => s.id === "boundary-check")!.role).toBe(
      "reviewer"
    );
  });

  test("resolves architecture-decision with 3 steps", async () => {
    const resolved = await resolveArchetype("architecture-decision");
    expect(resolved.steps).toHaveLength(3);
    expect(resolved.steps.map((s) => s.id)).toEqual([
      "analyze", "design", "review",
    ]);
  });

  test("rejects abstract archetype", async () => {
    await expect(resolveArchetype("base")).rejects.toThrow(
      'Archetype "base" is abstract and cannot be used directly'
    );
  });

  test("inherits rejection routing from parent", async () => {
    const resolved = await resolveArchetype("backend-feature");
    expect(resolved.rejectionRouting).toEqual({
      analyze: "analyze",
      design: "design",
      implement: "implement",
      review: "implement",
      qa: "implement",
    });
  });

  test("removes rejection routing entries for removed steps", async () => {
    const resolved = await resolveArchetype("bugfix");
    expect(resolved.rejectionRouting).not.toHaveProperty("analyze");
    expect(resolved.rejectionRouting).toHaveProperty("design");
  });
});
