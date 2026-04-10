import { join, dirname } from "path";

/**
 * Maps schema type names to their .schema.json file paths.
 * Schema files live in the schemas/ directory at the package root.
 */

const SCHEMA_DIR = join(dirname(dirname(import.meta.path)), "schemas");

const SCHEMA_MAP: Record<string, string> = {
  workspace: "workspace.schema.json",
  supervisor: "supervisor.schema.json",
  phase: "phase.schema.json",
  task: "task.schema.json",
  "task-state": "task-state.schema.json",
  "step-input": "step-input.schema.json",
  "step-output": "step-output.schema.json",
  approval: "approval.schema.json",
  "validation-result": "validation-result.schema.json",
  routing: "routing.schema.json",
  modules: "modules.schema.json",
  "dependency-rules": "dependency-rules.schema.json",
  archetype: "archetype.schema.json",
  "role-routing": "role-routing.schema.json",
  "adr-triggers": "adr-triggers.schema.json",
  "validation-config": "validation-config.schema.json",
  "task-types": "task-types.schema.json",
  roles: "roles.schema.json",
  "skills-registry": "skills-registry.schema.json",
  "artifact-types": "artifact-types.schema.json",
};

/**
 * Resolve a schema type name to its absolute file path.
 * Returns null if the type is not recognized.
 */
export function resolveSchema(typeName: string): string | null {
  const fileName = SCHEMA_MAP[typeName];
  if (!fileName) return null;
  return join(SCHEMA_DIR, fileName);
}

/**
 * Returns a sorted list of all available schema type names.
 */
export function availableSchemaTypes(): string[] {
  return Object.keys(SCHEMA_MAP).sort();
}
