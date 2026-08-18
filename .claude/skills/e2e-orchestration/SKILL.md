---
name: "nit:orchestrate"
description: "Project-lifecycle orchestration for the nit workflow. Drives the full v2 lifecycle — clarify, phases, tasks, then the deterministic supervisor per task, then phase close — gating the user at every boundary. Decides which task runs next; the supervisor decides which step. Use when the user says '/nit:orchestrate', 'start workflow', 'run e2e nit', 'orchestrate workflow', or at the beginning of any nit workflow."
allowed-tools: Read, Glob, Grep, Bash, Skill
---

> **Arguments**: `/nit:orchestrate [prd-path]` — PRD path optional; auto-detected from the project root
> when omitted, or skipped entirely if `.nit/prd/summary.json` already exists.

# nit Orchestration

You run the project. You do not run the steps.

That division is the whole design, and it is the thing this skill got wrong in v1. The deterministic
supervisor (`nit:continue`, ADR-0004) owns everything inside a task: which step is next, which
specialist to dispatch, whether the output validates, whether to repair or escalate. You own everything
around it: which task runs next, when to stop and ask a person, and when a phase is finished.

| | Orchestrator (you) | Supervisor (`nit:continue`) |
|---|---|---|
| Decides | which **task** runs next | which **step** runs next |
| Dispatches | nothing | the specialist for the current step |
| Transitions | nothing | `state.json`, via the CLI |
| Gates | phase and task boundaries | parks at `awaiting_approval` |

**You never dispatch a step agent and you never write state.** If you find yourself deciding which
engineer should implement something, stop — the archetype decided that, and the supervisor reads it.

## Core rules

1. **Delegate every task to the supervisor.** Task execution is `/nit:continue`, `/nit:approve`, and
   `/nit:reject`. Nothing else.
2. **Never write or edit a file.** You read state and invoke commands. The one exception in the whole
   workflow — the manual unblock transition — belongs to a human, not to you.
3. **Never skip an approval gate.** Every gate the v1 skill had is still a gate.
4. **One task at a time, sequentially.** Never run two tasks in parallel.
5. **Route from `state.json` and the resolved archetype**, never from a task's prose.

## Phase 1 — Clarify

Skip if `.nit/prd/summary.json` exists and every `clarifications[].answer` is non-empty.

Otherwise invoke `nit:clarify` with the PRD path. It is interactive by design — it works through
unknowns, risks, and assumptions with the user one at a time — so invoke the skill directly rather than
dispatching a subagent, which would put an agent between the user and their own questions.

**Produces**: `.nit/prd/summary.json`, `.nit/prd/glossary.json`, `.nit/prd/source.md`.
**Gate**: present the resolved clarifications. Proceed on approval.

## Phase 2 — Plan phases

Skip if `.nit/phases/PHASE-*/phase.json` already exist.

Invoke `nit:phases`. Also interactive.

**Produces**: `.nit/phases/PHASE-N/phase.json` per phase.
**Gate**: present the phases and the ordering rationale. Proceed on approval.

## Phase 3 — Per-phase loop

For each phase in order, starting with the first whose `phase.json.status` is not `done`:

### 3a — Create tasks

Skip if the phase already has tasks. Otherwise invoke `nit:tasks <N>`. Interactive, one task at a time.

**Produces**: `.nit/phases/PHASE-N/tasks/TASK-NNN/task.json`, each with a `targetModule` and an
`archetype`.
**Gate**: present the task list and dependency order. Proceed on approval.

### 3b — Per-task loop

For each task, in dependency order, repeat until its `state.json.status` is `done`:

1. **Advance one step**: `/nit:continue <phase> <task>`.

   The supervisor prepares the step, dispatches the specialist, and ingests the result. You do not
   choose the role, the skills, or the step — read what it reports.

2. **Read `state.json.status`** and act on it. This table is the whole per-task loop:

   | status | Do |
   |---|---|
   | `in-progress` | Call `/nit:continue` again. The supervisor is mid-task; nothing needs you. |
   | `awaiting_approval` | **Gate.** Present the step's `output.json` and ask. Then `/nit:approve` or `/nit:reject <p> <t> --comment "<why>"`, and continue the loop. |
   | `blocked` | **Stop this task.** Go to *Blocked tasks* below. |
   | `escalated` | **Stop this task.** The reopen budget is spent; surface the accumulated errors from `validation.json` and hand it to the user. Do not retry — the supervisor already tried `maxReopenCount` times. |
   | `done` | Move to the next task. |

3. Never advance to the next task while the current one is `blocked` or `escalated`. An unresolved
   task is the phase's problem, and carrying on hides it.

### 3c — Blocked tasks

A blocked task has an `output.json` whose `result.resultType` is `blocked`, carrying a `reason` and an
`explanation`. Route on the reason:

| reason | Do |
|---|---|
| `needs-splitting` | Invoke `nit:tasks` in splitting mode with the original `task.json` and `detail.taskTypes`. It produces `TASK-NNNa` / `TASK-NNNb`. **Gate** on the subtasks, then run them through 3b in place of the original. |
| `contradictory-input` | Surface `explanation` and `detail.conflictsWith`. The fix is a human decision — usually amending the acceptance criteria or the design. |
| `criterion-unsatisfiable` | Surface `explanation` and `detail.criterionId`. Usually the criterion needs rewriting, which is a change to `task.json`, not something a re-run fixes. |
| `no-output` | The specialist wrote nothing. Surface the `validation.json` entry; this usually means the dispatch itself failed. |

In every case, resuming is the manual `state.json` transition documented in `nit:continue`, performed
by a person. You surface and wait; you do not perform it.

### 3d — Close the phase

When every task in the phase is `done`, invoke `nit:phase-summary <N>`.

**Produces**: `.nit/phases/PHASE-N/summary.json` and a Phase Learning Record in `.nit/plr/`.

Read `summary.json.milestone.reached`:

- **true** — `nit:phase-summary` has set the phase status to `done`. **Gate**, then move to the next phase.
- **false** — the milestone was not met. Present the `unmet` criteria. The phase status stays as it is.
  Do not create tasks for the gaps yourself; ask the user whether to add tasks (back to 3a) or accept
  the phase as it stands.

## Phase 4 — Next phase

Repeat Phase 3 until every `phase.json.status` is `done`, then report the project complete.

## Reading state

Everything you route on is machine-readable. Never infer from prose:

| Question | Read |
|---|---|
| Where is this task? | `state.json` — `status`, `currentStepId`, `stepOrder`, `reopenCount` |
| What did this step produce? | `STEP-NNN-<stepId>/output.json` |
| Why is it blocked? | that step's `output.json` `result.reason` and `result.explanation` |
| Why did it escalate? | that step's `validation.json` `errors[]` |
| Was a step approved? | `STEP-NNN-<stepId>/approval.json` |
| What is the phase's outcome? | `summary.json` — `milestone.reached`, `criteria[]` |
| What is unplanned or unstarted? | `/nit:status` |

There is no engineer routing table here any more. In v1 this skill read `<type>` from `DESIGN.md` and
chose an agent. In v2 the archetype declares the role for every step — concretely, or as `$engineer`
resolved from the archetype's `engineerRole` — and the supervisor dispatches it. Choosing an engineer
is not your decision to make.

## Gates

At every gate, give the user four things and then stop:

1. **What was produced** — the artifact, and where it is.
2. **What it says** — the substance, not a restatement of the filename.
3. **What happens next** — the specific next command.
4. **The ask** — "Approve to proceed, or tell me what to change."

If the user asks for changes, re-run the step that produced the artifact — for a task step that means
`/nit:reject` with their reasoning as the comment, which reopens the archetype's rejection-routing
target. Never hand-edit the artifact to satisfy the feedback yourself.

## Known limitations

State these when they apply rather than failing opaquely:

- **`$detect` archetypes cannot run.** `bugfix` and `cross-module-change` declare their implement
  step's role as `$detect`, and nothing resolves it, so the dispatch descriptor names a role no agent
  answers to (TASK-028). Until that lands, a task on either archetype will fail at its implement step.
- **Every step gates.** The per-step `approval` flag in the archetype is not read by the supervisor, so
  a five-step task asks for five approvals rather than the two `base.json` declares (TASK-029).
- **`architecture-decision` cannot be rejected at review.** Its rejection routing targets the
  `implement` step, which that archetype removes (TASK-027).

## Rules

- NEVER dispatch a step specialist — that is the supervisor's job, and duplicating it puts two
  components in charge of one decision.
- NEVER write or edit a file, including `state.json`.
- NEVER skip an approval gate, and never auto-approve.
- NEVER run two tasks in parallel.
- NEVER advance past a `blocked` or `escalated` task.
- ALWAYS read `state.json` after each `/nit:continue`; it is what the next action is derived from.
- ALWAYS route on structured fields, never on prose.
- If the state is one this skill does not describe, stop and ask rather than guessing.
