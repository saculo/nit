#!/usr/bin/env bun

import { runValidate } from "./commands/validate";

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<number> {
  if (!command || command === "--help" || command === "-h") {
    console.log("Usage: nit <command> [options]\n");
    console.log("Commands:");
    console.log("  validate --schema <type> <file>   Validate a JSON file against a schema");
    return 0;
  }

  switch (command) {
    case "validate":
      return runValidate(args.slice(1));
    default:
      console.error(`Unknown command: "${command}"`);
      console.error("Run 'nit --help' for available commands.");
      return 2;
  }
}

const exitCode = await main();
process.exit(exitCode);
