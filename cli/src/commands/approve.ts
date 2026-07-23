import { approveStep } from "../supervisor";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

/**
 * Approve the current (awaiting_approval) step of a task and advance it.
 *
 * Usage: nit approve --task-dir <dir> [--by <name>] [--comment <text>]
 *
 * Exit codes: 0 success, 1 error, 2 usage error.
 */
export async function runApprove(args: string[]): Promise<number> {
  const taskDir = flag(args, "--task-dir");
  if (!taskDir) {
    console.error("Usage: nit approve --task-dir <dir> [--by <name>] [--comment <text>]");
    return 2;
  }
  try {
    const result = await approveStep({
      taskDir,
      approvedBy: flag(args, "--by"),
      comment: flag(args, "--comment"),
    });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
