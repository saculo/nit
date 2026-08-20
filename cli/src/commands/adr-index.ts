import { join } from "path";
import {
  buildIndex,
  promote,
  outstanding,
  renderOutstanding,
  assertValidIndex,
  type AdrIndex,
  type RaisedBy,
} from "../adr-index";

const DEFAULT_INDEX = join(".nit", "adr", "index.json");
const PHASES_DIR = join(".nit", "phases");

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i === -1 || i + 1 >= args.length ? undefined : args[i + 1];
}

/** Every step output under .nit/phases/, with where it came from. */
async function collect(phasesDir: string, phaseFilter?: string): Promise<{ output: unknown; raisedBy: RaisedBy }[]> {
  const found: { output: unknown; raisedBy: RaisedBy }[] = [];
  const glob = new Bun.Glob("PHASE-*/tasks/TASK-*/STEP-*/output.json");
  for await (const rel of glob.scan({ cwd: phasesDir })) {
    const [phaseId, , taskId, stepDir] = rel.split("/");
    if (phaseFilter && phaseId !== phaseFilter) continue;
    // STEP-003-implement -> implement
    const stepId = stepDir!.replace(/^STEP-\d+-/, "");
    found.push({
      output: await Bun.file(join(phasesDir, rel)).json(),
      raisedBy: { taskId: taskId!, stepId, phaseId: phaseId! },
    });
  }
  return found.sort((a, b) => a.raisedBy.taskId.localeCompare(b.raisedBy.taskId));
}

/**
 * Build or update the ADR candidate index.
 *
 * The index lives in .nit/adr/ beside the records it indexes. A separate
 * decisions/ directory holding one file was ceremony, and two directories for
 * one concept is the ambiguity ADR-0006 removed for skills (TASK-039 AC-3).
 *
 * Usage: nit adr-index [--phase PHASE-N] [--index <file>] [--phases-dir <dir>]
 *        nit adr-index --promote <candidateId> --to <adrPath> [--index <file>]
 *        nit adr-index --outstanding [--index <file>]
 * Exit codes: 0 success, 1 nothing outstanding to report is still 0, 2 error.
 */
export async function runAdrIndex(args: string[]): Promise<number> {
  const indexPath = flag(args, "--index") ?? DEFAULT_INDEX;
  const phasesDir = flag(args, "--phases-dir") ?? PHASES_DIR;

  try {
    const existingFile = Bun.file(indexPath);
    const existing: AdrIndex = (await existingFile.exists())
      ? await existingFile.json()
      : { candidates: [] };

    if (args.includes("--outstanding")) {
      console.log(renderOutstanding(existing));
      return 0;
    }

    const promoteId = flag(args, "--promote");
    if (promoteId !== undefined) {
      const to = flag(args, "--to");
      if (!to) {
        console.error("Usage: nit adr-index --promote <candidateId> --to <adrPath>");
        return 2;
      }
      const updated = promote(existing, promoteId, to);
      assertValidIndex(updated);
      await Bun.write(indexPath, JSON.stringify(updated, null, 2) + "\n");
      console.log(JSON.stringify({ promoted: promoteId, to, outstanding: outstanding(updated).length }, null, 2));
      return 0;
    }

    const found = await collect(phasesDir, flag(args, "--phase"));
    const index = buildIndex(found, existing);
    assertValidIndex(index);
    await Bun.write(indexPath, JSON.stringify(index, null, 2) + "\n");
    console.log(
      JSON.stringify(
        {
          indexPath,
          stepOutputsScanned: found.length,
          candidates: index.candidates.length,
          outstanding: outstanding(index).map((c) => c.id),
        },
        null,
        2
      )
    );
    return 0;
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}
