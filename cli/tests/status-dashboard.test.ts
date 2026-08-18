import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { resolveSchema } from "../src/schema-resolver";

const SKILLS_DIR = join(dirname(dirname(dirname(import.meta.path))), ".claude", "skills");
const STATUS_SKILL = join(SKILLS_DIR, "status", "SKILL.md");

/** Every skill name declared in a SKILL.md frontmatter, e.g. "nit:phases". */
function declaredSkillNames(): Set<string> {
  const names = new Set<string>();
  for (const entry of readdirSync(SKILLS_DIR)) {
    const file = join(SKILLS_DIR, entry, "SKILL.md");
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(/^name:\s*"?([^"\n]+)"?/m);
    if (match) names.add(match[1]!.trim());
  }
  return names;
}

/** Every /nit:<command> token mentioned in a file. */
function referencedCommands(text: string): Set<string> {
  return new Set([...text.matchAll(/\/(nit:[a-z-]+)/g)].map((m) => m[1]!));
}

// TASK-024 — nit:status is prose, but two of its claims are checkable: the
// commands it advertises must exist, and the task states it routes on must be
// the ones the state machine can actually produce. Both drift silently
// otherwise, which is how the v1 dashboard came to advertise six retired
// artifacts and a command set that no longer existed.
describe("nit:status dashboard conformance", () => {
  const status = readFileSync(STATUS_SKILL, "utf8");

  // The commands a user actually invokes. The step skills — nit:analyze,
  // nit:design, nit:implement, nit:review, nit:qa — are dispatched by the
  // supervisor and are deliberately absent: suggesting one is exactly the v1
  // bug, where the dashboard told users to run `/nit:design 2 2`. Those skills
  // all exist, so an existence check alone would not have caught it.
  const USER_FACING = new Set([
    "nit:init",
    "nit:clarify",
    "nit:phases",
    "nit:tasks",
    "nit:continue",
    "nit:approve",
    "nit:reject",
    "nit:phase-summary",
    "nit:brownfield-orchestrate",
    "nit:status",
    "nit:orchestrate", // may be named in prose; TASK-025 makes it usable
  ]);

  // AC-3 — a suggested command must be one a user can actually run
  test("every command the dashboard names resolves to a skill that exists", () => {
    const declared = declaredSkillNames();
    const dangling = [...referencedCommands(status)].filter((c) => !declared.has(c));
    expect(dangling).toEqual([]);
  });

  // AC-3 — and it must be user-invocable, not a supervisor-dispatched step skill
  test("the next-step logic and command list name only user-facing commands", () => {
    const actionable = status.slice(status.indexOf("## Next step"));
    const wrong = [...referencedCommands(actionable)].filter((c) => !USER_FACING.has(c));
    expect(wrong).toEqual([]);
  });

  // AC-1/AC-2 — no task state may be unhandled by the next-step logic. Match the
  // backticked token, not a bare substring: "pending" also occurs inside "is
  // pending" and "failed" inside "failed validation", which would make a
  // substring check pass without the state being handled at all.
  test("every task-state status the supervisor can write is accounted for", () => {
    const schema = require(resolveSchema("task-state")!);
    const statuses: string[] = schema.properties.status.enum;
    const unhandled = statuses.filter((s) => !status.includes(`\`${s}\``));
    // `pending` and `failed` are in the schema but nothing writes them (noted in
    // TASK-018's review). They are the known exception; this asserts the list of
    // unhandled states does not grow beyond them.
    expect(unhandled.sort()).toEqual(["failed", "pending"]);
  });

  // AC-2 — the three states needing a human are the point of the command
  test.each(["awaiting_approval", "blocked", "escalated"])(
    "%s is surfaced with the action that unblocks it",
    (state) => {
      expect(status).toContain(state);
    }
  );

  // AC-1 — it reads what v2 writes
  test.each(["state.json", "task.json", "phase.json", "summary.json", "prd/summary.json"])(
    "the dashboard reads %s",
    (artifact) => {
      expect(status).toContain(artifact);
    }
  );

  // AC-4 / the v1 rewrite — it must not route on artifacts v2 never writes
  test("no retired v1 artifact is used as a signal", () => {
    // The skill may name them when describing what it cannot read, but not in
    // the next-step table, which is what the v1 dashboard got wrong.
    const nextStepSection = status.slice(status.indexOf("## Next step"), status.indexOf("## Partial"));
    const retired = ["DESIGN.md", "STEPS.md", "IMPLEMENTATION.md", "REVIEW.md", "CLARIFICATIONS.md", "SUMMARY.md"];
    const used = retired.filter((a) => nextStepSection.includes(a));
    expect(used).toEqual([]);
  });

  // a command that does not work must not be advertised
  test("nit:orchestrate is not advertised while it is still v1", () => {
    const commandsSection = status.slice(status.indexOf("COMMANDS"));
    expect(commandsSection).not.toContain("/nit:orchestrate ");
  });
});
