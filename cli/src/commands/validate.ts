import Ajv2020 from "ajv/dist/2020";
import { resolveSchema, availableSchemaTypes } from "../schema-resolver";

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
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
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
