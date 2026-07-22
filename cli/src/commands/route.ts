import { resolveSchema } from "../schema-resolver";
import { createAjv } from "../ajv";
import {
  resolveRouting,
  type ModuleEntry,
  type Routing,
  type SkillsRegistry,
} from "../routing-resolver";

const DEFAULT_MODULES = ".nit/boundaries/modules.json";
const DEFAULT_REGISTRY = ".nit/registry/skills.json";
const DEFAULT_SKILLS_DIR = ".claude/skills";

/** Read a required single-value flag from args, or undefined if absent. */
function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

/** Validate a routing object in-process against routing.schema.json. */
function validateRouting(routing: Routing): string[] {
  const schemaPath = resolveSchema("routing");
  if (!schemaPath) throw new Error("Routing schema not found in schema registry");
  const schema = require(schemaPath);
  const ajv = createAjv();
  const validate = ajv.compile(schema);
  if (validate(routing)) return [];
  return (validate.errors ?? []).map((e) => `  ${e.instancePath || "/"}: ${e.message}`);
}

/**
 * Resolve the layered skill routing for a task+step and write routing.json.
 *
 * Usage: nit route --task <id> --step <step> --targets <m1,m2> [--modules <file>]
 *                  [--registry <file>] [--skills-dir <dir>] [--out <file>]
 *
 * Exit codes:
 *   0 - success, routing resolved (and written when --out given)
 *   1 - resolution error (missing modules.json, unknown target, invalid routing)
 *   2 - usage error (missing required flags)
 */
export async function runRoute(args: string[]): Promise<number> {
  const taskId = flag(args, "--task");
  const step = flag(args, "--step");
  const targets = flag(args, "--targets");

  if (!taskId || !step || !targets) {
    console.error(
      "Usage: nit route --task <id> --step <step> --targets <m1,m2> " +
        "[--modules <file>] [--registry <file>] [--skills-dir <dir>] [--out <file>]"
    );
    return 2;
  }

  const modulesPath = flag(args, "--modules") ?? DEFAULT_MODULES;
  const registryPath = flag(args, "--registry") ?? DEFAULT_REGISTRY;
  const skillsRootDir = flag(args, "--skills-dir") ?? DEFAULT_SKILLS_DIR;
  const outPath = flag(args, "--out");
  const targetNames = targets.split(",").map((t) => t.trim()).filter(Boolean);

  try {
    // Modules registry is mandatory — a missing one is a setup error, not a crash.
    const modulesFile = Bun.file(modulesPath);
    if (!(await modulesFile.exists())) {
      console.error(
        `Module registry not found: ${modulesPath}\nRun /nit:init to scaffold the workspace.`
      );
      return 1;
    }
    const allModules: ModuleEntry[] = (await modulesFile.json()).modules ?? [];

    const modules: ModuleEntry[] = [];
    for (const name of targetNames) {
      const entry = allModules.find((m) => m.name === name);
      if (!entry) {
        console.error(`Target module not found in ${modulesPath}: "${name}"`);
        return 1;
      }
      modules.push(entry);
    }
    if (modules.length === 0) {
      console.error("At least one --targets module is required.");
      return 2;
    }

    // Skills registry is optional — absence means no global skills.
    let registry: SkillsRegistry | undefined;
    const registryFile = Bun.file(registryPath);
    if (await registryFile.exists()) {
      registry = await registryFile.json();
    }

    const routing = resolveRouting({ taskId, step, modules, registry, skillsRootDir });

    const errors = validateRouting(routing);
    if (errors.length > 0) {
      console.error("Resolved routing failed schema validation:\n" + errors.join("\n"));
      return 1;
    }

    const json = JSON.stringify(routing, null, 2);
    if (outPath) {
      await Bun.write(outPath, json + "\n");
    }
    console.log(json);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return 1;
  }
}
