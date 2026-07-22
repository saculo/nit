import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

/**
 * Construct an Ajv 2020 instance configured for nit's schemas.
 *
 * Registers the standard string formats (date-time, uri, etc.) so schemas that
 * use `"format"` — task-state, approval, routing — validate instead of throwing
 * an "unknown format" error under strict mode.
 */
export function createAjv(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  return ajv;
}
