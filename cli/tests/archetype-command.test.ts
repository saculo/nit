import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { join, dirname } from "path";
import { mkdir, writeFile } from "fs/promises";

const CLI_PATH = join(dirname(import.meta.path), "..", "src", "cli.ts");

async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "run", CLI_PATH, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { exitCode, stdout, stderr };
}

describe("nit archetype", () => {
  // AC-1: Abstract archetype rejection
  test("rejects abstract base archetype with exit code 1", async () => {
    const { exitCode, stderr } = await runCli(["archetype", "base"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("abstract");
    expect(stderr).toContain("cannot be used directly");
  });

  // AC-2: backend-feature resolves with 5 steps and backend-engineer role
  test("resolves backend-feature with 5 steps and backend-engineer role", async () => {
    const { exitCode, stdout } = await runCli(["archetype", "backend-feature"]);
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.steps).toHaveLength(5);
    expect(result.steps.map((s: { id: string }) => s.id)).toEqual([
      "analyze", "design", "implement", "review", "qa",
    ]);
    const implementStep = result.steps.find((s: { id: string }) => s.id === "implement");
    expect(implementStep.role).toBe("backend-engineer");
  });

  // AC-3: bugfix resolves with 4 steps, design approval=false, $detect
  test("resolves bugfix with 4 steps, design approval false, $detect role", async () => {
    const { exitCode, stdout } = await runCli(["archetype", "bugfix"]);
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.steps).toHaveLength(4);
    expect(result.steps.map((s: { id: string }) => s.id)).toEqual([
      "design", "implement", "review", "qa",
    ]);
    const designStep = result.steps.find((s: { id: string }) => s.id === "design");
    expect(designStep.approval).toBe(false);
    expect(result.engineerRole).toBe("$detect");
    const implementStep = result.steps.find((s: { id: string }) => s.id === "implement");
    expect(implementStep.role).toBe("$detect");
  });

  // AC-4: cross-module-change resolves with 6 steps including boundary-check
  test("resolves cross-module-change with 6 steps including boundary-check after implement", async () => {
    const { exitCode, stdout } = await runCli(["archetype", "cross-module-change"]);
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.steps).toHaveLength(6);
    expect(result.steps.map((s: { id: string }) => s.id)).toEqual([
      "analyze", "design", "implement", "boundary-check", "review", "qa",
    ]);
  });

  // AC-5: Single-level inheritance enforcement
  // We test this by creating a temporary archetype that extends a non-abstract child
  describe("single-level inheritance enforcement", () => {
    const FIXTURES_DIR = join(dirname(import.meta.path), "fixtures", "archetypes");
    const ARCHETYPES_DIR = join(dirname(import.meta.path), "..", "archetypes");

    // We cannot easily test multi-level inheritance via CLI since the archetypes
    // are in a fixed directory. Instead we test via the resolver directly.
    test("resolver rejects multi-level inheritance", async () => {
      const { resolveArchetype, loadArchetype, validateArchetype } = await import(
        "../src/archetype-resolver"
      );

      // Create a temporary archetype file that extends backend-feature
      // (which extends base — so this would be 2 levels)
      const tempDir = join(dirname(import.meta.path), "..", "archetypes");
      const tempFile = join(tempDir, "multi-level-test.json");
      await writeFile(
        tempFile,
        JSON.stringify({
          id: "multi-level-test",
          extends: "backend-feature",
          engineerRole: "test-engineer",
        })
      );

      try {
        await expect(resolveArchetype("multi-level-test")).rejects.toThrow(
          "Single-level inheritance only"
        );
      } finally {
        // Clean up the temp file
        const { rm } = await import("fs/promises");
        await rm(tempFile, { force: true });
      }
    });
  });

  test("exits 2 when no archetype name is provided", async () => {
    const { exitCode, stderr } = await runCli(["archetype"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Usage");
  });

  test("exits 1 for non-existent archetype", async () => {
    const { exitCode, stderr } = await runCli(["archetype", "nonexistent"]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Archetype not found");
  });

  // Verify all concrete archetypes resolve successfully
  test("resolves frontend-feature", async () => {
    const { exitCode, stdout } = await runCli(["archetype", "frontend-feature"]);
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.steps).toHaveLength(5);
    expect(result.steps.find((s: { id: string }) => s.id === "implement").role).toBe(
      "frontend-engineer"
    );
  });

  test("resolves infra-change", async () => {
    const { exitCode, stdout } = await runCli(["archetype", "infra-change"]);
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.steps).toHaveLength(5);
    expect(result.steps.find((s: { id: string }) => s.id === "implement").role).toBe(
      "infra-engineer"
    );
  });

  test("resolves architecture-decision with 3 steps", async () => {
    const { exitCode, stdout } = await runCli(["archetype", "architecture-decision"]);
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.steps).toHaveLength(3);
    expect(result.steps.map((s: { id: string }) => s.id)).toEqual([
      "analyze", "design", "review",
    ]);
  });
});
