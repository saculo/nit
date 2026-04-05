import { resolveArchetype } from "../archetype-resolver";

/**
 * Resolve an archetype by name and output the flat step list as JSON.
 *
 * Usage: nit archetype <name>
 *
 * Exit codes:
 *   0 - success, resolved archetype printed to stdout
 *   1 - resolution error (abstract archetype, inheritance violation, etc.)
 *   2 - usage error (missing arguments)
 */
export async function runArchetype(args: string[]): Promise<number> {
  const name = args[0];

  if (!name) {
    console.error("Usage: nit archetype <name>");
    console.error("\nResolves an archetype and outputs the flat step list as JSON.");
    return 2;
  }

  try {
    const resolved = await resolveArchetype(name);
    console.log(JSON.stringify(resolved, null, 2));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}
