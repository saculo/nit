---
phase: PHASE-3
date: 2026-08-19
status: recorded
---

# 0002 — Phase 3: Review, QA, and Boundary Enforcement — Learning Record

## Context

PHASE-3 was planned as the phase that adds the pipeline's quality gates: rewrite `nit:review`, add
`nit:qa`, enforce module boundaries, automate ADR triggers, and add routing introspection commands.

It delivered something adjacent and larger. A survey at the start found that four skills still read the
prose artifacts ADR-0005 retired, one step skill did not exist at all, and `nit:init` was scaffolding
v1 artifact types into every new project. The phase became the v1-to-v2 migration, and then — because
every review found something — the phase that fixed six defects nobody had planned for.

**Delivered**: the complete migration (TASK-021 through TASK-026), the blocked-step contract
(TASK-018), and four defect fixes (TASK-027 through TASK-029, with TASK-030 and TASK-031 filed).
**Not delivered**: boundary enforcement, ADR trigger automation, and the three routing introspection
commands — six of sixteen success criteria, none of them started.

Ten tasks done, two filed and open. Ten reviews, one rework cycle. 242 tests, up from 96.

## What Worked

**Verifying conformance tests by injecting the failure they guard.** Adopted after TASK-024, where the
first check asserted every advertised command resolves to a skill that exists — which *passes* for
`/nit:design`, the exact bug it was written to catch. Since then every prose-conformance check has been
verified by breaking the thing it protects and confirming a failure. That discipline caught a second
bad test and, in TASK-026, found a real defect on the check's first run. A conformance test that has
never been seen to fail is a guess.

**Verifying acceptance criteria through the CLI rather than the test harness.** TASK-029's real proof
was not its nine unit tests but a scripted five-step archetype run showing two approvals instead of
five. TASK-028's was a `bugfix` task dispatching `infra-engineer`. Unit tests assert the mechanism; the
CLI run asserts the outcome the task exists for, and twice the CLI run surfaced something the unit
tests could not have.

**Filing findings as tasks instead of absorbing them.** Six of the twelve tasks in this phase were
filed by a review rather than planned: 027, 028, 029, 030, 031, and the AC-6 rescope in 018. Each was
recorded with a reproduction and acceptance criteria at the moment it was understood, which is when the
context is cheapest. None was fixed inside the task that found it, and that restraint is why the
diffs stayed reviewable.

**Small, sequenced tasks with a review between each.** Ten tasks, ten reviews, one rework cycle. The
low rework rate is not evidence of low defect density — 58 findings were raised — it is evidence that
finding them at review is cheaper than finding them at rework.

## What Didn't

**Reviewing tasks in isolation missed defects that only appear in combination.** TASK-029 made the
per-step approval flag effective; that immediately made TASK-027's territory reachable, because
`boundary-check` was gated but unrejectable and nothing had ever parked there before. TASK-027 in turn
exposed that gating and routing had to be consistent. Each task was reviewed against its own criteria
and passed. The interaction was found by probing beyond the criteria, not by the process.

**The reviewer and the implementer were the same session, throughout.** Every review states this, and
the mitigation cited — CodeRabbit as the external pass — stopped being true at TASK-021. CodeRabbit has
reported "Review skipped: manual review required for this OSS repository" for eight consecutive pull
requests. The reviews found 58 findings and fixed or filed all of them, so the process has value, but
no independent reader has seen any code in this phase. This is the phase's largest unmitigated risk and
it was carried, not solved.

**The phase's own planned scope was displaced and never re-decided.** Six success criteria — boundary
enforcement, ADR triggers, routing introspection — were untouched. That was the right call task by
task, because a pipeline that cannot complete a task is more urgent than one that cannot lint module
boundaries. But it was never made as a decision. The phase drifted rather than being re-scoped, and the
milestone is not reached as a direct result.

**A destructive git operation was used as a cheap undo.** In TASK-026, `git checkout` on a file with
uncommitted changes reverted that task's main edit silently. It was caught only because a test kept
failing after the supposed restore. On a task whose subject was deletion, this came close to shipping a
partial change.

## Patterns

**One root cause produced four defects: a declared contract that nothing consumes.**

| Task | The declaration | What read it |
|---|---|---|
| TASK-027 | `rejectionRouting` targets | validated only for keys, never targets |
| TASK-028 | `$detect` placeholder role | nothing resolved it |
| TASK-029 | per-step `approval` flag | nothing read it |
| TASK-030 | phase success criteria | nothing produces them — the inverse |

Three are schema or archetype fields that the supervisor ignored; the fourth is a consumer requiring
data no producer writes. Every one resolved cleanly, validated successfully, and failed at runtime or
silently did nothing. None was caught by a test, because the tests asserted what the code did rather
than that the declarations were honoured.

The recurrence is the finding. Four instances in one phase, all discovered by review rather than by a
passing suite, says the schemas and the code drift apart by default and nothing notices. The remedy is
a conformance test per declared field asserting something consumes it — the same shape of test this
phase adopted for skill prose, applied to data.

**A second pattern, smaller: guarantees documented in the wrong place.** TASK-028's resolved-role
guarantee existed in code but not in `nit:continue`, where the consumer reads. TASK-027's rejection
invariant was enforced in the resolver but absent from `archetype.schema.json`, where an author looks.
TASK-023's `summary.json` was declared as an input to `nit:status` and never used. Each was found by
asking "where would someone look for this?" rather than "is this correct?".

**Reviews found roughly six findings per task, consistently** — 58 across ten reviews, ranging from
four to seven, with no downward trend as the phase progressed. The rate did not fall as the codebase
got healthier, which suggests the reviews were finding what was there rather than exhausting a fixed
backlog of defects.

## Quantitative

- **Tasks**: 12 total — 10 done, 2 open (TASK-030, TASK-031). None blocked or escalated.
- **Origin**: 6 planned at phase start, 6 filed by reviews mid-phase.
- **Reviews**: 10, all `approved`. 1 rework cycle (TASK-017, carried in from PHASE-2).
- **Findings**: 58 raised. 15 fixed within the reviewing task, 6 routed or filed as new tasks, the rest recorded as notes.
- **Tests**: 96 → 242 (+146). 12 test files, up from 8. Zero failures at every commit.
- **Success criteria**: 16 total — 10 met, 6 unmet, all six unmet being unstarted planned scope.
- **ADRs**: 1 written (ADR-0006, settling design Q-4 after two deferrals), 1 candidate proposed.

## Recommendations

**PHASE-3 is not finished; decide explicitly whether to finish it.** Six criteria are unmet and the
milestone is not reached. The honest options are to continue the phase with the boundary, ADR-trigger,
and routing work, or to re-scope PHASE-3 to what it actually became — the migration phase — and move
the remainder to a new phase. Either is defensible; drifting into PHASE-4 without choosing is not.

**Close TASK-031 before the pipeline is used in earnest.** `nit:reject` documents its `--comment` as
"the specialist's rework context" and it never reaches the specialist. TASK-029 removed the human
checkpoint that used to compensate, so a rejected review now sends a blind rework straight back to the
same reviewer. This is the one open defect that degrades the pipeline's day-to-day behaviour.

**Close TASK-030 before running another phase summary.** This summary had to derive its criteria from
`PHASE.md` prose because `phase.json` has nowhere to put them. Every future phase hits the same wall.

**Adopt a conformance test per declared schema field, as an ADR.** The four-defect pattern above is the
strongest evidence this phase produced. A test asserting that something reads each archetype and schema
field would have caught three of them before they shipped.

**PHASE-4's `nit:status` run-log integration must be re-planned.** TASK-024 rewrote that skill onto v2
artifacts; the v1 dashboard PHASE-4 was planned against no longer exists.

**PHASE-4's distribution work now has no source tree to copy.** ADR-0006 deleted `.nit/skills/` and
`.nit/agents/`, and `nit:init` no longer populates skills or agents anywhere. `bunx @nit/cli install`
must ship `.claude/` definitions from the package, which was implied but is now load-bearing.

**Restore an independent reviewer.** Either re-enable CodeRabbit for this repository or have a second
person read the diffs. Every finding in this phase was self-generated on self-written code, and the two
CLI changes — TASK-028 and TASK-029 — alter supervisor behaviour for every task.

**Migrate this repository's own `.nit/` workspace.** Deliberately out of scope in TASK-026, and now the
binding constraint on nit's usefulness to itself: this summary's machine-readable half is nearly empty
because the workspace has no `task.json`, no `state.json`, and no step outputs to aggregate. The tool
degraded honestly, exactly as designed — and what it honestly reports is that it cannot see its own
project.
