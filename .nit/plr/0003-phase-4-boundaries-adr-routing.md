---
phase: PHASE-4
date: 2026-08-23
status: recorded
---

# 0003 — Phase 4: Boundary Enforcement, ADR Automation, and Routing Introspection — Learning Record

## Context

The phase set out to make the pipeline opinionated about the code it produces: enforce module
boundaries during validation, record architectural decisions without being asked, and explain its own
skill routing.

Twelve tasks, all `done`. Six of the seven success criteria are met. The seventh — `adrCandidates`
appearing in step output without the specialist being asked — is **unmet**, and the reason is the
single most important fact about this phase: **no task in this project has ever run through the
supervisor.** Every task in PHASE-4, including the twelve that built the supervisor's newest
mechanisms, was executed by hand. There are no `state.json` files, no `STEP-NNN-*/output.json`, and
therefore nothing for the ADR index to scan. It reports zero candidates over the whole repository, and
that is the correct answer.

What the phase delivered is a set of mechanisms verified as *declarations* — schema-valid, resolvable,
dispatchable, covered by 636 tests — and unverified as *behaviour*. That distinction is worth carrying
into PHASE-5 unchanged, because every review in this phase restated it and nothing in this phase could
close it.

## What Worked

**Verification by reversion.** Every task confirmed its mechanisms by breaking them and counting
failures. It repeatedly earned its cost:

- In TASK-041 it revealed that hardcoding the step list *inside the command* changed nothing, because
  only the helper was covered. A test was added; without the reversion the gap would have shipped.
- In TASK-040 it revealed a false green — a timestamp test that passed with the mechanism removed,
  because both runs landed in the same millisecond — and then revealed that the fix had two redundant
  halves, neither individually pinned. One was deleted.
- It has now caught defects in the *tests* twice (TASK-036's RV-2, TASK-040's RV-3), which is a class
  of defect ordinary test runs cannot catch by construction.

**Building the query before the prose.** TASK-036, TASK-037 and TASK-040 each found that a skill
would have had to re-derive logic in prose, and each answered with a command the skill reads a verdict
from. ADR-0004 held every time it was tested, and the pattern is now reflexive: five commands were
added this phase, and every one has a skill that calls it, asserted by a conformance test.

**Making a mechanism visible found bugs the mechanism was not looking for.** TASK-040's routing trace
existed to explain composition; it exposed a duplicate-skill defect present since the resolver was
written. TASK-041's skill listing existed to inventory skills; it exposed that `nit:init` never
scaffolds language skills on the greenfield path. Neither was findable before something listed every
candidate side by side.

**Small, sequential tasks with review between each.** Twelve tasks, twelve PRs, twenty-two review
findings fixed before merge. No task required rework after merge.

## What Didn't

**The phase never exercised what it built.** SC-4 is unmet not because the work is missing but because
nothing has run. Three skills now instruct specialists to emit `adrCandidates`; whether a specialist
does is unknown and unknowable from here. The same limit applies more quietly to boundary enforcement,
trigger evaluation, and routing composition — all are tested against hand-written fixtures shaped like
what the schema promises, never against what the pipeline emits. The cause is that the project builds
the pipeline with a process that is not the pipeline.

**Two criteria were delivered through a different interface than they name.** SC-5 and SC-6 name
`nit:explain-routing` and `nit:skills` — skills, invocable as `/nit:...`. Both were built as CLI
commands. That is the better place for deterministic logic (ADR-0004) and it is not what the criterion
says: a user typing `/nit:skills` gets nothing. The capability is real and tested; the invocation
surface is not the one planned.

**Two tasks were substantially completed by other tasks before they ran.** TASK-042 satisfied all
three of TASK-033's criteria as a side effect of fixing a registry key. Earlier in the project,
TASK-036 did the same to part of TASK-035. Both times it was noticed by reading criteria, not by any
mechanism. Task dependencies now exist (TASK-043) but express *ordering*, not *overlap*.

## Patterns

**1. Every single task crossed a module boundary. Twelve of twelve.**

Measured from the git history, excluding each task's own record under
`.nit/phases/*/tasks/<id>/` (the exclusion TASK-035 built for exactly this reason):

| target | tasks | every one also touched |
|---|---|---|
| `@nit/cli` | 8 | `.claude/skills/` and usually `.nit/` |
| `@nit/skills` | 2 | `cli/src/` |
| `@nit/workspace` | 2 | `cli/` and `.claude/` |

Not one task stayed inside its module. This is no longer evidence that task planning is sloppy — a
rule that nothing has ever satisfied is not being violated, it is wrong. The model conflates two
different relations: `@nit/skills -> @nit/cli` is permitted and means *may depend on*, while what
actually happens is *changed a file in*. A skill that gains a new command must change the command and
the skill together, in one PR, because shipping either alone leaves the tree inconsistent. The
three-module split does not describe a unit of change in this repository; it describes a unit of
*layering*.

Raised as an ADR candidate. It is the phase's clearest finding and the one most likely to be wrong to
ignore, because boundary enforcement now exists and would block work if any project turned it on.

**2. "Two sources, one question" — three times, in three unrelated places.**

- TASK-036: `nit boundaries` reported violations from a different input set than the gate enforced.
- TASK-040: `nit continue` silently degraded to base-skill-only dispatch where the introspection
  commands failed loudly, on the same input.
- TASK-043: readiness read `task.json.status` while the supervisor writes `state.json.status`.

Each was found by asking "what else answers this question?" — never by a test, because each side was
individually correct. This is the highest-yield review question this project has, and it should be a
standing check rather than a thing three reviewers happened to think of.

**3. Four fields were declared and read by nothing.**

`template` (TASK-039), `moduleSkills` (TASK-041), the archetype-keyed `task-types.json`
(TASK-042), and the `qa` engineer that no archetype could reach (TASK-033). ADR-0007 predicted this
class and it kept appearing anyway — which suggests the ADR needs a mechanism, not just agreement.
The related failure mode is worse: TASK-042's registry key *had* a consumer, and the lookup silently
missed. A missing default is indistinguishable from an analyst exercising judgement, so it appeared to
work for as long as it existed.

**4. Prose conformance tests catch deletion and renaming, not misuse.**

Every skill change this phase is guarded by tests asserting the prose names a command, states an
ordering, or shows a field. Those found two real defects (TASK-038's unexecutable ordering,
TASK-041's stub-creation loophole) and cannot in principle find guidance that is followable and wrong.
Worth remembering when reading the test count.

## Quantitative

- **Tasks**: 12 planned, 12 done, 0 blocked, 0 escalated.
- **Success criteria**: 6 met, 1 unmet (SC-4). Milestone not reached.
- **Review verdicts**: 12 approved, 0 rework-requested. 22 findings fixed before merge —
  9 major, 13 minor — plus 2 findings against the tests themselves.
- **Tests**: 636 passing, 0 failing, up from 340 at the start of the phase (+296).
- **Boundary crossings**: 12 of 12 tasks.
- **Declared-but-unread fields retired**: 4.
- **New CLI commands**: 6 (`boundaries`, `adr-triggers`, `adr-index`, `explain-routing`,
  `resolve-routing`, `skills`, `deps` — 7 counting `deps`).
- **Step outputs produced by the pipeline**: 0.
- **ADR candidates in the index**: 0, because of the above.
- **CodeRabbit reviews**: 0 across 25 consecutive pull requests. Every finding in this phase is
  self-generated, which is a standing weakness in the review process, not a strength of the code.

## Recommendations

1. **PHASE-5, SC-8 (full pipeline end-to-end)** — this is now the highest-value item in the plan, and
   it is the only one that can close SC-4. Run it on a task in *this* repository before running it on
   a fixture project: everything this phase built is verified against fixtures already, and what is
   missing is evidence from real step outputs.
2. **PHASE-5 planning, before anything else** — settle the module model. Either split `@nit/cli` and
   `@nit/skills` into one module (they change together, always), or change dependency rules to
   distinguish "may depend on" from "may change". Boundary enforcement is opt-in today; the moment a
   project enables it, the 12-of-12 pattern becomes 12 blocked tasks.
3. **PHASE-5, SC-1 (`nit:add-skill`)** — `nit skills` already enumerates skills by layer and reports
   declared-but-absent ones. Build `add-skill` on top of it rather than beside it, or there will be
   two answers to "what skills exist".
4. **PHASE-5, SC-2/SC-3 (install and update)** — `nit:init` scaffolds language-skill stubs only on the
   brownfield path, so every greenfield workspace declares a `languageId` per module and has no skill
   for it. This repository has exactly that gap today. Fix it in the install/init work rather than
   leaving `nit skills --missing` to report it forever.
5. **Any phase adding a user-facing capability** — decide whether `/nit:<name>` invocation is part of
   the contract. SC-5 and SC-6 named skills and got commands; the substance was delivered and the
   surface was not, and nobody noticed until this summary.
