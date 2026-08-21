import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import {
  buildIndex,
  candidateId,
  candidatesIn,
  outstanding,
  promote,
  renderOutstanding,
  assertValidIndex,
  type AdrIndex,
} from "../src/adr-index";
import { resolveSchema } from "../src/schema-resolver";
import { runAdrIndex } from "../src/commands/adr-index";

const ROOT = dirname(dirname(import.meta.dir));

const candidate = (title: string, extra: Record<string, unknown> = {}) => ({
  title,
  context: `why ${title} came up`,
  decision: `what was decided about ${title}`,
  ...extra,
});

const output = (...titles: string[]) => ({
  result: { resultType: "design", summary: "s", decisions: [] },
  adrCandidates: titles.map((t) => candidate(t)),
});

const raisedBy = (taskId: string, stepId = "design", phaseId = "PHASE-4") => ({ taskId, stepId, phaseId });

describe("candidate identity", () => {
  // A promotion is recorded against an id. If ids moved when the index was
  // rebuilt, the index would forget which candidate had become which record —
  // the one fact it exists to hold.
  test("an id is derived from the raising task and the title", () => {
    expect(candidateId("TASK-039", "Index lives beside the records")).toBe(
      "TASK-039/index-lives-beside-the-records"
    );
  });

  test("the same candidate gets the same id on every build", () => {
    const found = [{ output: output("Shared cache"), raisedBy: raisedBy("TASK-039") }];
    expect(buildIndex(found).candidates[0]!.id).toBe(buildIndex(found).candidates[0]!.id);
  });

  test("the same title raised by two tasks gets two ids", () => {
    const index = buildIndex([
      { output: output("Shared cache"), raisedBy: raisedBy("TASK-039") },
      { output: output("Shared cache"), raisedBy: raisedBy("TASK-040") },
    ]);
    expect(index.candidates.map((c) => c.id)).toEqual([
      "TASK-039/shared-cache",
      "TASK-040/shared-cache",
    ]);
  });

  test("punctuation and case do not leak into an id", () => {
    expect(candidateId("TASK-1", "Ajv 2020-12: why *not* Zod?")).toBe("TASK-1/ajv-2020-12-why-not-zod");
  });
});

describe("reading candidates out of a step output", () => {
  test("a step that raised none contributes none", () => {
    expect(candidatesIn({ result: { resultType: "review" } })).toEqual([]);
  });

  test("a malformed adrCandidates is treated as none, not as a crash", () => {
    expect(candidatesIn({ adrCandidates: "later" })).toEqual([]);
  });
});

// AC-1
describe("building the index", () => {
  test("each candidate is listed with the task that raised it", () => {
    const index = buildIndex([
      { output: output("Shared cache", "Retry policy"), raisedBy: raisedBy("TASK-039", "design") },
      { output: output("Log format"), raisedBy: raisedBy("TASK-040", "implement", "PHASE-5") },
    ]);
    expect(index.candidates).toHaveLength(3);
    expect(index.candidates[0]!.raisedBy).toEqual({
      taskId: "TASK-039",
      stepId: "design",
      phaseId: "PHASE-4",
    });
    expect(index.candidates[2]!.raisedBy.phaseId).toBe("PHASE-5");
  });

  test("a candidate carries its title, context and decision, not just its id", () => {
    const c = buildIndex([{ output: output("Shared cache"), raisedBy: raisedBy("TASK-039") }]).candidates[0]!;
    expect(c.title).toBe("Shared cache");
    expect(c.context).toBe("why Shared cache came up");
    expect(c.decision).toBe("what was decided about Shared cache");
  });

  test("everything built is listed as outstanding until it is promoted", () => {
    const index = buildIndex([{ output: output("A", "B"), raisedBy: raisedBy("TASK-039") }]);
    expect(outstanding(index)).toHaveLength(2);
    expect(index.candidates.every((c) => c.promotedTo === undefined)).toBe(true);
  });

  test("the same candidate raised by two steps of one task is listed once", () => {
    const index = buildIndex([
      { output: output("Shared cache"), raisedBy: raisedBy("TASK-039", "design") },
      { output: output("Shared cache"), raisedBy: raisedBy("TASK-039", "implement") },
    ]);
    expect(index.candidates).toHaveLength(1);
  });

  test("a built index validates against its schema", () => {
    const index = buildIndex([{ output: output("Shared cache"), raisedBy: raisedBy("TASK-039") }]);
    expect(() => assertValidIndex(index)).not.toThrow();
  });
});

// AC-2
describe("promotion", () => {
  const built = () => buildIndex([{ output: output("Shared cache", "Retry policy"), raisedBy: raisedBy("TASK-039") }]);

  test("promoting records the ADR path", () => {
    const after = promote(built(), "TASK-039/shared-cache", ".nit/adr/0008-shared-cache.md");
    expect(after.candidates[0]!.promotedTo).toBe(".nit/adr/0008-shared-cache.md");
  });

  test("a promoted candidate is no longer outstanding", () => {
    const after = promote(built(), "TASK-039/shared-cache", ".nit/adr/0008-shared-cache.md");
    expect(outstanding(after).map((c) => c.id)).toEqual(["TASK-039/retry-policy"]);
  });

  test("promoting marks the candidate accepted", () => {
    const after = promote(built(), "TASK-039/shared-cache", ".nit/adr/0008-shared-cache.md");
    expect(after.candidates[0]!.status).toBe("accepted");
  });

  // Without this, a rebuild would silently un-promote everything: the step
  // outputs never learn that a candidate became a record, so a build that
  // trusted only them would report a settled decision as still open.
  test("a promotion survives the next build", () => {
    const after = promote(built(), "TASK-039/shared-cache", ".nit/adr/0008-shared-cache.md");
    const rebuilt = buildIndex(
      [{ output: output("Shared cache", "Retry policy"), raisedBy: raisedBy("TASK-039") }],
      after
    );
    expect(rebuilt.candidates[0]!.promotedTo).toBe(".nit/adr/0008-shared-cache.md");
    expect(outstanding(rebuilt)).toHaveLength(1);
  });

  test("promoting an id the index does not hold fails, listing what is outstanding", () => {
    expect(() => promote(built(), "TASK-039/typo", ".nit/adr/0008.md")).toThrow(
      /No candidate "TASK-039\/typo"[\s\S]*TASK-039\/shared-cache/
    );
  });

  test("re-promoting to a different record fails rather than overwriting", () => {
    const after = promote(built(), "TASK-039/shared-cache", ".nit/adr/0008-shared-cache.md");
    expect(() => promote(after, "TASK-039/shared-cache", ".nit/adr/0009-other.md")).toThrow(
      /already promoted to \.nit\/adr\/0008-shared-cache\.md/
    );
  });

  test("promoting to the same record again is a no-op, not an error", () => {
    const after = promote(built(), "TASK-039/shared-cache", ".nit/adr/0008-shared-cache.md");
    expect(() => promote(after, "TASK-039/shared-cache", ".nit/adr/0008-shared-cache.md")).not.toThrow();
  });
});

describe("the outstanding report", () => {
  const index = buildIndex([{ output: output("Shared cache"), raisedBy: raisedBy("TASK-039", "design") }]);

  test("it shows what a reader needs to decide, not only the id", () => {
    const text = renderOutstanding(index);
    for (const fragment of [
      "TASK-039/shared-cache",
      "Shared cache",
      "why Shared cache came up",
      "what was decided about Shared cache",
      "PHASE-4 / TASK-039 / design",
      "proposed",
    ]) {
      expect(text).toContain(fragment);
    }
  });

  test("a promoted candidate is absent from the report", () => {
    const after = promote(index, "TASK-039/shared-cache", ".nit/adr/0008.md");
    expect(renderOutstanding(after)).toBe("No outstanding ADR candidates.");
  });

  test("an explicit status is shown rather than the default", () => {
    const withStatus: AdrIndex = {
      candidates: [
        { ...candidate("X"), id: "TASK-1/x", raisedBy: raisedBy("TASK-1"), status: "rejected" },
      ],
    };
    expect(renderOutstanding(withStatus)).toContain("[rejected]");
  });
});

// AC-4 (ADR-0007) — a field nothing reads is a claim the project cannot keep.
describe("every field the index schema declares has a consumer", () => {
  const schema = JSON.parse(readFileSync(resolveSchema("adr-index")!, "utf8"));
  const candidateProps = schema.properties.candidates.items.properties;

  const consumers: Record<string, (i: AdrIndex) => unknown> = {
    id: (i) => promote(i, i.candidates[0]!.id, ".nit/adr/0008.md"),
    title: (i) => renderOutstanding(i),
    context: (i) => renderOutstanding(i),
    decision: (i) => renderOutstanding(i),
    status: (i) => renderOutstanding(i),
    raisedBy: (i) => renderOutstanding(i),
    promotedTo: (i) => outstanding(i),
  };

  test("the consumer map covers the schema exactly", () => {
    expect(Object.keys(consumers).sort()).toEqual(Object.keys(candidateProps).sort());
  });

  test.each(Object.keys(consumers))("removing %s changes what its consumer produces", (field) => {
    // `status` is optional and defaults to "proposed" in the report, so a
    // fixture that omits it cannot show whether the field is read at all.
    const raised = { adrCandidates: [candidate("Shared cache", { status: "rejected" })] };
    const full = buildIndex([{ output: raised, raisedBy: raisedBy("TASK-039") }]);
    const promoted = promote(full, "TASK-039/shared-cache", ".nit/adr/0008.md");
    const withField = field === "promotedTo" ? promoted : full;
    const stripped: AdrIndex = {
      candidates: withField.candidates.map((c) => {
        const copy = { ...c } as Record<string, unknown>;
        delete copy[field];
        return copy as (typeof withField.candidates)[number];
      }),
    };
    const before = JSON.stringify(consumers[field]!(withField) ?? null);
    let after: string;
    try {
      after = JSON.stringify(consumers[field]!(stripped) ?? null);
    } catch {
      after = "threw";
    }
    expect(after).not.toBe(before);
  });

  test("raisedBy names the task, step and phase, and requires the first two", () => {
    expect(Object.keys(candidateProps.raisedBy.properties).sort()).toEqual([
      "phaseId",
      "stepId",
      "taskId",
    ]);
    expect(candidateProps.raisedBy.required.sort()).toEqual(["stepId", "taskId"]);
  });
});

describe("the schema rejects what it should", () => {
  test("a candidate with no raisedBy is invalid — an untraceable candidate is not usable", () => {
    expect(() => assertValidIndex({ candidates: [{ ...candidate("X"), id: "TASK-1/x" }] })).toThrow(
      /validation failed/
    );
  });

  test("an unknown field is rejected", () => {
    expect(() =>
      assertValidIndex({
        candidates: [{ ...candidate("X"), id: "TASK-1/x", raisedBy: raisedBy("TASK-1"), owner: "me" }],
      })
    ).toThrow(/validation failed/);
  });

  test("an empty index is valid — a project with no candidates is a normal project", () => {
    expect(() => assertValidIndex({ candidates: [] })).not.toThrow();
  });
});

// The command, exercised as a caller would.
describe("nit adr-index", () => {
  function workspace(): { dir: string; phases: string; index: string; adr: string } {
    const dir = mkdtempSync(join(tmpdir(), "adr-index-"));
    const phases = join(dir, "phases");
    // A promotion names a record that exists; the fixture writes one.
    const adr = join(dir, "0008-shared-cache.md");
    writeFileSync(adr, "# 0008 — Shared cache\n");
    for (const [phase, task, step, titles] of [
      ["PHASE-4", "TASK-039", "STEP-002-design", ["Shared cache"]],
      ["PHASE-4", "TASK-040", "STEP-003-implement", ["Retry policy"]],
      ["PHASE-5", "TASK-041", "STEP-002-design", ["Log format"]],
    ] as [string, string, string, string[]][]) {
      const stepDir = join(phases, phase, "tasks", task, step);
      mkdirSync(stepDir, { recursive: true });
      writeFileSync(join(stepDir, "output.json"), JSON.stringify(output(...titles)));
    }
    return { dir, phases, index: join(dir, "index.json"), adr };
  }

  const read = (p: string): AdrIndex => JSON.parse(readFileSync(p, "utf8"));

  test("it scans the phases tree and writes a valid index", async () => {
    const w = workspace();
    expect(await runAdrIndex(["--phases-dir", w.phases, "--index", w.index])).toBe(0);
    const index = read(w.index);
    expect(index.candidates.map((c) => c.id).sort()).toEqual([
      "TASK-039/shared-cache",
      "TASK-040/retry-policy",
      "TASK-041/log-format",
    ]);
    expect(() => assertValidIndex(index)).not.toThrow();
  });

  test("the step id comes from the step directory, not from its number", async () => {
    const w = workspace();
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index]);
    const byTask = Object.fromEntries(read(w.index).candidates.map((c) => [c.raisedBy.taskId, c.raisedBy.stepId]));
    expect(byTask["TASK-039"]).toBe("design");
    expect(byTask["TASK-040"]).toBe("implement");
  });

  test("--phase narrows the scan", async () => {
    const w = workspace();
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index, "--phase", "PHASE-5"]);
    expect(read(w.index).candidates.map((c) => c.id)).toEqual(["TASK-041/log-format"]);
  });

  test("--promote records the path and rebuilding keeps it", async () => {
    const w = workspace();
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index]);
    expect(
      await runAdrIndex(["--index", w.index, "--promote", "TASK-039/shared-cache", "--to", w.adr])
    ).toBe(0);
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index]);
    const promoted = read(w.index).candidates.find((c) => c.id === "TASK-039/shared-cache")!;
    expect(promoted.promotedTo).toBe(w.adr);
  });

  // RV-2 — the index's claim is that a record was written. A path to a file
  // nobody wrote makes it assert something false, and the reader who trusts it
  // stops looking for a decision that was never recorded.
  test("--promote to a record that does not exist fails, and changes nothing", async () => {
    const w = workspace();
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index]);
    const before = readFileSync(w.index, "utf8");
    expect(
      await runAdrIndex(["--index", w.index, "--promote", "TASK-039/shared-cache", "--to", join(w.dir, "nope.md")])
    ).toBe(2);
    expect(readFileSync(w.index, "utf8")).toBe(before);
  });

  test("--promote without --to fails rather than guessing", async () => {
    const w = workspace();
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index]);
    expect(await runAdrIndex(["--index", w.index, "--promote", "TASK-039/shared-cache"])).toBe(2);
  });

  test("promoting an unknown candidate exits non-zero and leaves the index alone", async () => {
    const w = workspace();
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index]);
    const before = readFileSync(w.index, "utf8");
    expect(await runAdrIndex(["--index", w.index, "--promote", "TASK-039/nope", "--to", w.adr])).toBe(2);
    expect(readFileSync(w.index, "utf8")).toBe(before);
  });

  test("a project with no step outputs yet gets an empty index, not an error", async () => {
    const dir = mkdtempSync(join(tmpdir(), "adr-index-empty-"));
    const phases = join(dir, "phases");
    mkdirSync(phases, { recursive: true });
    const index = join(dir, "index.json");
    expect(await runAdrIndex(["--phases-dir", phases, "--index", index])).toBe(0);
    expect(read(index).candidates).toEqual([]);
  });

  // RV-1 — "nothing outstanding" and "never built" are different answers, and
  // only one of them means a reader can stop looking.
  test("--outstanding against an index that was never built says so", async () => {
    const w = workspace();
    expect(await runAdrIndex(["--index", w.index, "--outstanding"])).toBe(2);
    expect(existsSync(w.index)).toBe(false);
  });

  // RV-3 — the index is committed. Scan order must not decide its line order,
  // or a rebuild produces a diff that says nothing changed.
  test("the index is ordered by phase, task and step, not by scan order", async () => {
    const w = workspace();
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index]);
    const first = readFileSync(w.index, "utf8");
    expect(read(w.index).candidates.map((c) => c.raisedBy.taskId)).toEqual([
      "TASK-039",
      "TASK-040",
      "TASK-041",
    ]);
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index]);
    expect(readFileSync(w.index, "utf8")).toBe(first);
  });

  // RV-4 — one malformed step output costs its own candidates, not the report
  // on every other task's. Declared, per the same rule nit:phase-summary follows.
  test("an unparseable step output is declared, and the rest still index", async () => {
    const w = workspace();
    const broken = join(w.phases, "PHASE-4", "tasks", "TASK-042", "STEP-002-design");
    mkdirSync(broken, { recursive: true });
    writeFileSync(join(broken, "output.json"), "{ not json");
    const said: string[] = [];
    const log = console.log;
    console.log = (...a: unknown[]) => void said.push(a.join(" "));
    try {
      expect(await runAdrIndex(["--phases-dir", w.phases, "--index", w.index])).toBe(0);
    } finally {
      console.log = log;
    }
    expect(read(w.index).candidates).toHaveLength(3);
    // Declared, not silently dropped: a report that hides what it could not read
    // is worse than one that admits a gap.
    expect(said.join("\n")).toContain("TASK-042/STEP-002-design/output.json");
  });

  test("--outstanding reports without rebuilding", async () => {
    const w = workspace();
    await runAdrIndex(["--phases-dir", w.phases, "--index", w.index]);
    const before = readFileSync(w.index, "utf8");
    expect(await runAdrIndex(["--index", w.index, "--outstanding"])).toBe(0);
    expect(readFileSync(w.index, "utf8")).toBe(before);
  });
});

// AC-3 — the split is settled: one directory, and nit:init creates only what it uses.
describe("the adr directory is the only one", () => {
  const initSkill = readFileSync(join(ROOT, ".claude/skills/init/SKILL.md"), "utf8");

  test("nit:init does not create a decisions directory", () => {
    expect(initSkill).not.toMatch(/\.nit\/decisions/);
  });

  test("this workspace has no decisions directory", () => {
    expect(existsSync(join(ROOT, ".nit/decisions"))).toBe(false);
  });

  test("the index defaults to living beside the records it indexes", async () => {
    const dir = mkdtempSync(join(tmpdir(), "adr-default-"));
    mkdirSync(join(dir, "phases"), { recursive: true });
    const src = readFileSync(join(ROOT, "cli/src/commands/adr-index.ts"), "utf8");
    expect(src).toContain('join(".nit", "adr", "index.json")');
  });
});
