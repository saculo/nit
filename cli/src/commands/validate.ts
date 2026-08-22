import { resolveSchema, availableSchemaTypes } from "../schema-resolver";
import { createAjv } from "../ajv";
import { checkDependencies, loadTasks, phasesRootFor, type TaskNode } from "../task-deps";

/**
 * Validate a JSON file against a named schema.
 *
 * Exit codes:
 *   0 - valid
 *   1 - validation errors
 *   2 - unknown schema type or usage error
 */
export async function runValidate(args: string[]): Promise<number> {
  // Parse --schema <type> <file> from args
  const schemaFlagIndex = args.indexOf("--schema");
  if (schemaFlagIndex === -1 || schemaFlagIndex + 2 >= args.length) {
    console.error("Usage: nit validate --schema <type> <file>");
    console.error(`\nAvailable schema types:\n  ${availableSchemaTypes().join("\n  ")}`);
    return 2;
  }

  const schemaType = args[schemaFlagIndex + 1];
  const filePath = args[schemaFlagIndex + 2];

  // Resolve schema path
  const schemaPath = resolveSchema(schemaType);
  if (!schemaPath) {
    console.error(`Unknown schema type: "${schemaType}"`);
    console.error(`\nAvailable schema types:\n  ${availableSchemaTypes().join("\n  ")}`);
    return 2;
  }

  // Load schema
  const schemaFile = Bun.file(schemaPath);
  if (!(await schemaFile.exists())) {
    console.error(`Schema file not found: ${schemaPath}`);
    return 2;
  }
  const schema = await schemaFile.json();

  // Load target file
  const targetFile = Bun.file(filePath);
  if (!(await targetFile.exists())) {
    console.error(`File not found: ${filePath}`);
    return 2;
  }

  let data: unknown;
  try {
    data = await targetFile.json();
  } catch {
    console.error(`Failed to parse JSON: ${filePath}`);
    return 1;
  }

  // Validate
  const ajv = createAjv();
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    // A schema cannot check that TASK-017 exists — only that the string looks
    // like a task id. An unresolvable dependency reads as a considered ordering
    // constraint and describes an ordering that can never happen, so it fails
    // here rather than being discovered when the task never becomes startable
    // (TASK-043 AC-3).
    if (schemaType === "task") {
      const problems = resolveTaskDependencies(data as TaskNode, filePath);
      if (problems.length > 0) {
        console.error("Validation failed:\n");
        for (const message of problems) console.error(`  ${message}`);
        return 1;
      }
    }
    console.log("Valid");
    return 0;
  }

  // Format errors
  console.error("Validation failed:\n");
  for (const error of validate.errors ?? []) {
    const path = error.instancePath || "/";
    console.error(`  ${path}: ${error.message}`);
  }

  return 1;
}

/**
 * Resolve a task's `dependsOn` against the project's other tasks.
 *
 * The phases root is derived from the file's own path, so no flag is needed for
 * the layout nit creates. A task file somewhere else cannot have its references
 * resolved, and saying so is better than passing it: a declared dependency this
 * cannot verify is a claim nobody has checked.
 */
function resolveTaskDependencies(task: TaskNode, filePath: string): string[] {
  const declared = task?.dependsOn ?? [];
  if (declared.length === 0) return [];

  const phasesDir = phasesRootFor(filePath);
  if (!phasesDir) {
    return [
      `/dependsOn: cannot resolve ${declared.join(", ")} — ${filePath} is not inside a ` +
        `phases/PHASE-N/tasks/TASK-NNN/ layout, so there is no set of tasks to resolve against.`,
    ];
  }
  const tasks = loadTasks(phasesDir);
  // The file being validated may not be on disk in the form given (it is, but
  // its id must be in the set for a self-reference to be caught either way).
  const known = tasks.some((t) => t.id === task.id) ? tasks : [...tasks, task];
  return checkDependencies(known)
    .filter((p) => p.taskId === task.id)
    .map((p) => `/dependsOn: ${p.message}`);
}
