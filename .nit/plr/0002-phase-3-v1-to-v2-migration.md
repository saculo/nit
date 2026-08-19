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
every review found something — the phase that fixed five defects nobody had planned for.

**Delivered**: the complete migration (TASK-021 through TASK-026), the blocked-step contract
(TASK-018), and five defect fixes (TASK-027, TASK-028, TASK-029, TASK-031, with TASK-030 filed and
open).
**Not delivered**: boundary enforcement, ADR trigger automation, and the three routing introspection
commands — six of sixteen success criteria, none of them started.

Eleven tasks done, one open. Eleven reviews, one rework cycle. 263 tests, up from 96.

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
context is cheapest, and none was fixed inside the task that found it — that restraint is why the diffs
stayed reviewable. Four of the five filed tasks have since been closed, which is the evidence the
practice works: a finding recorded with a reproduction is one somebody can pick up later.

**Small, sequenced tasks with a review between each.** Eleven tasks, eleven reviews, one rework cycle.
The low rework rate is not evidence of low defect density — 63 findings were raised — it is evidence
that finding them at review is cheaper than finding them at rework.

## What Didn't

**Reviewing tasks in isolation missed defects that only appear in combination.** TASK-029 made the
per-step approval flag effective; that immediately made TASK-027's territory reachable, because
`boundary-check` was gated but unrejectable and nothing had ever parked there before. TASK-027 in turn
exposed that gating and routing had to be consistent. Each task was reviewed against its own criteria
and passed. The interaction was found by probing beyond the criteria, not by the process.

**The reviewer and the implementer were the same session, throughout.** Every review states this, and
the mitigation cited — CodeRabbit as the external pass — stopped being true at TASK-021. CodeRabbit has
reported "Review skipped: manual review required for this OSS repository" for ten consecutive pull
requests. The reviews found 63 findings and fixed or filed all of them, so the process has value, but
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

**A second pattern, and it kept recurring: guarantees documented in the wrong place.** TASK-028's
resolved-role guarantee existed in code but not in `nit:continue`, where the consumer reads. TASK-027's
rejection invariant was enforced in the resolver but absent from `archetype.schema.json`, where an
author looks. TASK-023's `summary.json` was declared as an input to `nit:status` and never used.
TASK-031's rework context was threaded into state and skills but not into `nit:continue`, in the very
task that fixed the primary pattern. Each was found by asking "where would someone look for this?"
rather than "is this correct?".

**And its inverse, found last: documentation that asserts a behaviour the code does not have.**
TASK-031 exists because `nit:reject` had always said its `--comment` "is the specialist's rework
context". It never reached the specialist. Nobody noticed across two phases because the sentence read
as a description rather than an unfulfilled promise. Prose asserting behaviour is a claim that can be
false, and nothing tests prose by default — which is precisely what the conformance tests adopted in
this phase exist to change.

**Reviews found roughly six findings per task, consistently** — 63 across eleven reviews, ranging from
four to seven, with no downward trend as the phase progressed. The rate did not fall as the codebase
got healthier, which suggests the reviews were finding what was there rather than exhausting a fixed
backlog of defects.

## Quantitative

- **Tasks**: 12 total — 11 done, 1 open (TASK-030). None blocked or escalated.
- **Origin**: 6 planned at phase start, 6 filed by reviews mid-phase; 5 of those 6 closed.
- **Reviews**: 11, all `approved`. 1 rework cycle (TASK-017, carried in from PHASE-2).
- **Findings**: 63 raised. 16 fixed within the reviewing task, 6 routed or filed as new tasks, the rest recorded as notes.
- **Tests**: 96 → 263 (+167). 12 test files, up from 8. Zero failures at every commit.
- **Success criteria**: 16 total — 10 met, 6 unmet, all six unmet being unstarted planned scope.
- **ADRs**: 1 written (ADR-0006, settling design Q-4 after two deferrals), 1 candidate proposed.

## Recommendations

**PHASE-3 is not finished; decide explicitly whether to finish it.** Six criteria are unmet and the
milestone is not reached. The honest options are to continue the phase with the boundary, ADR-trigger,
and routing work, or to re-scope PHASE-3 to what it actually became — the migration phase — and move
the remainder to a new phase. Either is defensible; drifting into PHASE-4 without choosing is not.

**Close TASK-030 before running another phase summary.** This summary had to derive its criteria from
`PHASE.md` prose because `phase.json` has nowhere to put them. Every future phase hits the same wall.

**Adopt a conformance test per declared schema field, as an ADR.** The four-defect pattern above is the
strongest evidence this phase produced. A test asserting that something reads each archetype and schema
field would have caught three of them before they shipped.

**PHASE-4's `nit:status` run-log integration must be re-planned.** TASK-024 rewrote that skill onto v2
artifacts; the v1 dashboard PHASE-4 was planned against no longer exists.

**Close the `context` shape before it grows further.** It now carries five fields — `taskId`,
`stepId`, `priorOutputs`, `repairErrors`, `reworkFrom` — and `step-input.schema.json` declares it as an
open object, so none of them is schema-enforced. A misspelled field name in a skill produces no
validation error. Not urgent, but each addition raises the cost of closing it.

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
