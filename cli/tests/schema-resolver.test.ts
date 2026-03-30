import { describe, expect, test } from "bun:test";
import { resolveSchema, availableSchemaTypes } from "../src/schema-resolver";
import { join, dirname } from "path";

const SCHEMAS_DIR = join(dirname(dirname(import.meta.path)), "schemas");

describe("resolveSchema", () => {
  test("returns absolute path for known schema type", () => {
    const result = resolveSchema("workspace");
    expect(result).toBe(join(SCHEMAS_DIR, "workspace.schema.json"));
  });

  test("returns null for unknown schema type", () => {
    expect(resolveSchema("nonexistent")).toBeNull();
  });

  test("resolves all registered schema types to existing files", async () => {
    const types = availableSchemaTypes();
    for (const typeName of types) {
      const path = resolveSchema(typeName);
      expect(path).not.toBeNull();
      const file = Bun.file(path!);
      expect(await file.exists()).toBe(true);
    }
  });
});

describe("availableSchemaTypes", () => {
  test("returns a sorted array of schema type names", () => {
    const types = availableSchemaTypes();
    expect(types.length).toBeGreaterThanOrEqual(20);
    const sorted = [...types].sort();
    expect(types).toEqual(sorted);
  });

  test("includes core schema types", () => {
    const types = availableSchemaTypes();
    expect(types).toContain("workspace");
    expect(types).toContain("task");
    expect(types).toContain("phase");
    expect(types).toContain("step-output");
    expect(types).toContain("archetype");
  });
});
