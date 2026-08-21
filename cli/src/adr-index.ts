import { createAjv } from "./ajv";
import { resolveSchema } from "./schema-resolver";

/** A candidate as a step output carries it (step-output.schema.json #/$defs/adr-candidate). */
export interface AdrCandidate {
  title: string;
  context: string;
  decision: string;
  status?: "proposed" | "accepted" | "rejected" | "superseded";
}

/** Where a candidate came from. */
export interface RaisedBy {
  taskId: string;
  stepId: string;
  phaseId?: string;
}

/** An indexed candidate: what was raised, by whom, and whether it became a record. */
export interface IndexedCandidate extends AdrCandidate {
  id: string;
  raisedBy: RaisedBy;
  promotedTo?: string;
}

export interface AdrIndex {
  candidates: IndexedCandidate[];
}

/**
 * A stable id for a candidate: the task that raised it plus a slug of its title.
 *
 * Rebuilding the index must not renumber everything — a promotion recorded
 * against an id has to survive the next build, or the index forgets what it was
 * told. Deriving from content rather than from position is what makes that hold.
 */
export function candidateId(taskId: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${taskId}/${slug}`;
}

/** Extract the candidates a single step output carries. */
export function candidatesIn(output: unknown): AdrCandidate[] {
  const raw = (output as { adrCandidates?: AdrCandidate[] })?.adrCandidates;
  return Array.isArray(raw) ? raw : [];
}

/**
 * Build the index from every candidate the given step outputs raised.
 *
 * Promotions already recorded are carried across: the index is rebuilt from the
 * step outputs, which never learn that a candidate became an ADR, so the one
 * fact the build cannot rediscover has to be preserved from the previous index.
 */
export function buildIndex(
  found: { output: unknown; raisedBy: RaisedBy }[],
  previous: AdrIndex = { candidates: [] }
): AdrIndex {
  const promotedById = new Map(
    previous.candidates.filter((c) => c.promotedTo).map((c) => [c.id, c.promotedTo!])
  );
  const candidates: IndexedCandidate[] = [];
  const seen = new Set<string>();

  for (const { output, raisedBy } of found) {
    for (const candidate of candidatesIn(output)) {
      const id = candidateId(raisedBy.taskId, candidate.title);
      if (seen.has(id)) continue;
      seen.add(id);
      const promotedTo = promotedById.get(id);
      candidates.push({
        ...candidate,
        id,
        raisedBy,
        ...(promotedTo !== undefined && { promotedTo }),
      });
    }
  }
  return { candidates };
}

/** Candidates that have not become a numbered record. */
export function outstanding(index: AdrIndex): IndexedCandidate[] {
  return index.candidates.filter((c) => c.promotedTo === undefined);
}

/**
 * Record that a candidate became a numbered ADR.
 *
 * Promotion is the human decision this pipeline never automates: a specialist
 * proposes, a person writes the record, and this only remembers that they did.
 */
export function promote(index: AdrIndex, id: string, adrPath: string): AdrIndex {
  const target = index.candidates.find((c) => c.id === id);
  if (!target) {
    throw new Error(
      `No candidate "${id}" in the index.\n` +
        `Outstanding: ${outstanding(index).map((c) => c.id).join(", ") || "(none)"}.`
    );
  }
  if (target.promotedTo !== undefined && target.promotedTo !== adrPath) {
    throw new Error(
      `Candidate "${id}" is already promoted to ${target.promotedTo}. ` +
        `Promoting it again to ${adrPath} would lose which record it became.`
    );
  }
  return {
    candidates: index.candidates.map((c) =>
      c.id === id ? { ...c, promotedTo: adrPath, status: "accepted" as const } : c
    ),
  };
}

/**
 * Render the outstanding candidates as text, for whoever decides on them.
 *
 * The index is data, but the decision it asks for is human: someone reads the
 * context and the decision as the specialist stated them and judges whether it
 * deserves a numbered record. An id-only listing cannot support that judgement,
 * so every field the index carries about a candidate is shown here.
 */
export function renderOutstanding(index: AdrIndex): string {
  const open = outstanding(index);
  if (open.length === 0) return "No outstanding ADR candidates.";
  return open
    .map((c) => {
      const where = [c.raisedBy.phaseId, c.raisedBy.taskId, c.raisedBy.stepId]
        .filter(Boolean)
        .join(" / ");
      return [
        `${c.id} [${c.status ?? "proposed"}]`,
        `  ${c.title}`,
        `  raised by: ${where}`,
        `  context:   ${c.context}`,
        `  decision:  ${c.decision}`,
      ].join("\n");
    })
    .join("\n\n");
}

/** Validate an index against its schema; throw with details if invalid. */
export function assertValidIndex(index: unknown): asserts index is AdrIndex {
  const ajv = createAjv();
  const validate = ajv.compile(require(resolveSchema("adr-index")!));
  if (!validate(index)) {
    const details = (validate.errors ?? [])
      .map((e) => `  ${e.instancePath || "/"}: ${e.message}`)
      .join("\n");
    throw new Error(`adr-index validation failed:\n${details}`);
  }
}
