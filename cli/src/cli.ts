#!/usr/bin/env bun

import { runValidate } from "./commands/validate";
import { runArchetype } from "./commands/archetype";
import { runRoute } from "./commands/route";
import { runContinue } from "./commands/continue";

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<number> {
  if (!command || command === "--help" || command === "-h") {
    console.log("Usage: nit <command> [options]\n");
    console.log("Commands:");
    console.log("  validate --schema <type> <file>   Validate a JSON file against a schema");
    console.log("  archetype <name>                  Resolve an archetype and output flat step list");
    console.log("  route --task <id> --step <step>   Resolve layered skill routing for a task+step");
    console.log("  continue --task-dir <dir>         Advance a task through its archetype steps");
    return 0;
  }

  switch (command) {
    case "validate":
      return runValidate(args.slice(1));
    case "archetype":
      return runArchetype(args.slice(1));
    case "route":
      return runRoute(args.slice(1));
    case "continue":
      return runContinue(args.slice(1));
    default:
      console.error(`Unknown command: "${command}"`);
      console.error("Run 'nit --help' for available commands.");
      return 2;
  }
}

const exitCode = await main();
process.exit(exitCode);
