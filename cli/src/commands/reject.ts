import { resolveArchetype } from "../archetype-resolver";
import { rejectStep } from "../supervisor";

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i === -1 || i + 1 >= args.length) return undefined;
  return args[i + 1];
}

/**
 * Reject the current (awaiting_approval) step of a task and reopen the
 * archetype's rejection-routing target.
 *
 * Usage: nit reject --task-dir <dir> --archetype <name> [--comment <text>]
 *
 * Exit codes: 0 success, 1 error, 2 usage error.
 */
export async function runReject(args: string[]): Promise<number> {
  const taskDir = flag(args, "--task-dir");
  const archetypeName = flag(args, "--archetype");
  if (!taskDir || !archetypeName) {
    console.error("Usage: nit reject --task-dir <dir> --archetype <name> [--comment <text>]");
    return 2;
  }
  try {
    const resolved = await resolveArchetype(archetypeName);
    const result = await rejectStep({
      taskDir,
      rejectionRouting: resolved.rejectionRouting,
      comment: flag(args, "--comment"),
    });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
