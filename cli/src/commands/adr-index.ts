import { join } from "path";
import { existsSync } from "fs";
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

/**
 * Every step output under .nit/phases/, with where it came from.
 *
 * A step output that will not parse is declared rather than fatal. The index is
 * committed and read by people; one malformed file should cost its own
 * candidates, not the report on every other task's.
 */
async function collect(
  phasesDir: string,
  phaseFilter?: string
): Promise<{ found: { output: unknown; raisedBy: RaisedBy }[]; unreadable: string[] }> {
  const found: { output: unknown; raisedBy: RaisedBy }[] = [];
  const unreadable: string[] = [];
  const glob = new Bun.Glob("PHASE-*/tasks/TASK-*/STEP-*/output.json");
  for await (const rel of glob.scan({ cwd: phasesDir })) {
    const [phaseId, , taskId, stepDir] = rel.split("/");
    if (phaseFilter && phaseId !== phaseFilter) continue;
    // STEP-003-implement -> implement
    const stepId = stepDir!.replace(/^STEP-\d+-/, "");
    try {
      found.push({
        output: await Bun.file(join(phasesDir, rel)).json(),
        raisedBy: { taskId: taskId!, stepId, phaseId: phaseId! },
      });
    } catch {
      unreadable.push(rel);
    }
  }
  // The index is a committed file: scan order must not decide its line order, or
  // rebuilding it produces a diff that says nothing changed.
  const key = (r: RaisedBy) => `${r.phaseId}/${r.taskId}/${r.stepId}`;
  found.sort((a, b) => key(a.raisedBy).localeCompare(key(b.raisedBy)));
  return { found, unreadable: unreadable.sort() };
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
      // "Nothing outstanding" and "never built" are different answers, and only
      // one of them means a reader can stop looking.
      if (!(await existingFile.exists())) {
        console.error(`No index at ${indexPath}. Run \`nit adr-index\` to build it.`);
        return 2;
      }
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
      // The index's whole claim is that a record was written. Recording a path
      // to a file nobody wrote makes the index assert something false, and the
      // reader who trusts it stops looking for the decision.
      if (!existsSync(to)) {
        console.error(`No ADR at ${to}. Write the record first, then record the promotion.`);
        return 2;
      }
      const updated = promote(existing, promoteId, to);
      assertValidIndex(updated);
      await Bun.write(indexPath, JSON.stringify(updated, null, 2) + "\n");
      console.log(JSON.stringify({ promoted: promoteId, to, outstanding: outstanding(updated).length }, null, 2));
      return 0;
    }

    const { found, unreadable } = await collect(phasesDir, flag(args, "--phase"));
    const index = buildIndex(found, existing);
    assertValidIndex(index);
    await Bun.write(indexPath, JSON.stringify(index, null, 2) + "\n");
    console.log(
      JSON.stringify(
        {
          indexPath,
          stepOutputsScanned: found.length,
          unreadable,
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
