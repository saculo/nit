import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { join } from "path";

const CLI_PATH = join(dirname(import.meta.path), "..", "src", "cli.ts");
const FIXTURES_DIR = join(dirname(import.meta.path), "fixtures");

import { dirname, basename } from "path";
import { mkdir } from "fs/promises";

beforeAll(async () => {
  await mkdir(FIXTURES_DIR, { recursive: true });

  // Valid workspace
  await Bun.write(
    join(FIXTURES_DIR, "valid-workspace.json"),
    JSON.stringify({ name: "test", mode: "greenfield", nitVersion: "1.0" })
  );

  // Invalid workspace (missing required fields)
  await Bun.write(
    join(FIXTURES_DIR, "invalid-workspace.json"),
    JSON.stringify({ name: "test" })
  );

  // Valid step-output with adr-candidate
  await Bun.write(
    join(FIXTURES_DIR, "valid-step-output.json"),
    JSON.stringify({
      taskId: "TASK-001",
      stepId: "S-1",
      stepType: "analysis",
      adrCandidates: [
        { title: "Use JSON Schema 2020-12", context: "Need schema version", decision: "Use 2020-12" }
      ]
    })
  );

  // Valid prd-summary
  await Bun.write(
    join(FIXTURES_DIR, "valid-prd-summary.json"),
    JSON.stringify({
      goal: "Deterministic agent workflow orchestration",
      audience: "Engineering teams using Claude Code",
      capabilities: ["clarify PRDs", "plan phases", "create tasks"],
      clarifications: [
        { id: "U-1", category: "unknown", question: "Which output format?", answer: "JSON" }
      ]
    })
  );

  // Invalid prd-summary (missing required capabilities; bad clarification category)
  await Bun.write(
    join(FIXTURES_DIR, "invalid-prd-summary.json"),
    JSON.stringify({
      goal: "x",
      audience: "y",
      clarifications: [{ id: "U-1", category: "bogus", question: "?", answer: "!" }]
    })
  );

  // Valid glossary
  await Bun.write(
    join(FIXTURES_DIR, "valid-glossary.json"),
    JSON.stringify({
      terms: [
        { term: "archetype", definition: "A reusable task step sequence", aliases: ["template"] },
        { term: "supervisor", definition: "The deterministic pipeline driver" }
      ]
    })
  );

  // Invalid glossary (entry missing definition)
  await Bun.write(
    join(FIXTURES_DIR, "invalid-glossary.json"),
    JSON.stringify({ terms: [{ term: "archetype" }] })
  );

  // Not JSON
  await Bun.write(join(FIXTURES_DIR, "not-json.txt"), "this is not json");
});

afterAll(async () => {
  const { rm } = await import("fs/promises");
  await rm(FIXTURES_DIR, { recursive: true, force: true });
});

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

describe("nit validate", () => {
  test("exits 0 and prints Valid for conforming file", async () => {
    const { exitCode, stdout } = await runCli([
      "validate", "--schema", "workspace", join(FIXTURES_DIR, "valid-workspace.json")
    ]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("Valid");
  });

  test("exits 1 with errors for non-conforming file", async () => {
    const { exitCode, stderr } = await runCli([
      "validate", "--schema", "workspace", join(FIXTURES_DIR, "invalid-workspace.json")
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("mode");
    expect(stderr).toContain("nitVersion");
  });

  test("exits 2 and lists types for unknown schema type", async () => {
    const { exitCode, stderr } = await runCli([
      "validate", "--schema", "bogus", join(FIXTURES_DIR, "valid-workspace.json")
    ]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Unknown schema type");
    expect(stderr).toContain("workspace");
  });

  test("exits 1 for non-JSON file", async () => {
    const { exitCode, stderr } = await runCli([
      "validate", "--schema", "workspace", join(FIXTURES_DIR, "not-json.txt")
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Failed to parse JSON");
  });

  test("exits 2 when --schema flag is missing", async () => {
    const { exitCode, stderr } = await runCli(["validate"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("Usage");
  });

  test("validates step-output with adrCandidates referencing $defs", async () => {
    const { exitCode, stdout } = await runCli([
      "validate", "--schema", "step-output", join(FIXTURES_DIR, "valid-step-output.json")
    ]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("Valid");
  });

  test("validates a conforming prd-summary file", async () => {
    const { exitCode, stdout } = await runCli([
      "validate", "--schema", "prd-summary", join(FIXTURES_DIR, "valid-prd-summary.json")
    ]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("Valid");
  });

  test("rejects a non-conforming prd-summary file", async () => {
    const { exitCode, stderr } = await runCli([
      "validate", "--schema", "prd-summary", join(FIXTURES_DIR, "invalid-prd-summary.json")
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Validation failed");
  });

  test("validates a conforming glossary file", async () => {
    const { exitCode, stdout } = await runCli([
      "validate", "--schema", "glossary", join(FIXTURES_DIR, "valid-glossary.json")
    ]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe("Valid");
  });

  test("rejects a glossary entry missing its definition", async () => {
    const { exitCode, stderr } = await runCli([
      "validate", "--schema", "glossary", join(FIXTURES_DIR, "invalid-glossary.json")
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Validation failed");
  });
});
