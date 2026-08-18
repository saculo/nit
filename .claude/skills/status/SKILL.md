---
name: "nit:status"
description: "Project status dashboard for the nit workflow. Reads the v2 artifacts — prd/summary.json, phase.json, task.json, each task's state.json, and a completed phase's summary.json — and shows where every task stands, which ones are waiting on a human, and the single next action. Use when the user says '/nit:status', 'show status', 'project status', 'what next', or wants an overview of workflow progress."
allowed-tools: Read, Glob, Grep
---

> **Arguments**: `/nit:status` — no arguments required.

# nit Status Dashboard

Show where the project actually is. A dashboard that lists work is mildly useful; a dashboard that
shows **which tasks have stopped and are waiting on a person** is the reason to run this at all. Lead
with that.

You are strictly read-only. Never write, edit, or repair anything you find — a status command that
mutates state cannot be trusted to report it.

## Inputs

Read only what v2 writes:

| File | Gives you |
|---|---|
| `.nit/config/nit.yaml` or `.nit/config/workspace.json` | project name, mode |
| `.nit/prd/summary.json` | goal, and whether any `clarifications[].answer` is still empty |
| `.nit/phases/PHASE-N/phase.json` | phase `title`, `milestone`, `status` |
| `.nit/phases/PHASE-N/summary.json` | a closed phase's `milestone.reached` and outstanding criteria |
| `.nit/phases/PHASE-N/tasks/TASK-NNN/task.json` | task `title`, `type`, `targetModule`, `archetype` |
| `.nit/phases/PHASE-N/tasks/TASK-NNN/state.json` | **the pipeline position** — `currentStepId`, `stepOrder`, `status`, `reopenCount`, `repairRequired` |
| `STEP-NNN-<stepId>/output.json` | a blocked task's `result.reason` and `result.explanation` |
| `STEP-NNN-<stepId>/approval.json` | whether a step was approved, rejected, or is pending |
| `STEP-NNN-<stepId>/validation.json` | why a step failed validation, including the `no-output` case |

Step directories are named by position in `state.json.stepOrder`: index 0 is `STEP-001-<stepOrder[0]>`,
index 1 is `STEP-002-<stepOrder[1]>`, and so on. Derive the names from `stepOrder` rather than globbing,
so a directory left behind by an earlier archetype is not mistaken for progress.

`state.json` is the source of truth for where a task is. `task.json.status` is the planning status and
may lag; when they disagree, report `state.json` and note the disagreement.

## Reading a task's position

For each task with a `state.json`:

1. `status` gives the headline. `currentStepId` and its index in `stepOrder` give the position — render
   it as `step 3/5 implement`.
2. For each step before the current one, an `output.json` means it produced a result and an
   `approval.json` with `status: "approved"` means it passed its gate.
3. `reopenCount > 0` means the current step has failed validation that many times; show it, because a
   task at 2 of 3 is about to escalate and that is worth seeing before it does.
4. `repairRequired: true` means the step is reopened with `repairErrors` — it is in progress, not idle.
5. For a `blocked` task, read the current step's `output.json` and show `result.reason` and
   `result.explanation`. If there is no `output.json`, the reason is in `validation.json` — that is the
   `no-output` case, where the specialist wrote nothing at all.

## The three states that need a person

These are why the command exists. Give them their own section, above the full listing, and never bury
them in it:

| status | Means | What unblocks it |
|---|---|---|
| `awaiting_approval` | A step produced a valid result and is parked for a decision | `/nit:approve` or `/nit:reject` |
| `blocked` | A specialist reported it cannot proceed | A human decision — fix the cause, then the manual transition documented in `nit:continue` |
| `escalated` | The reopen budget was exhausted; the step failed validation `maxReopenCount` times | Manual intervention; the accumulated errors are in `validation.json` |

If none exist, say so explicitly — "nothing is waiting on you" is information.

## Reading a closed phase

When a phase has a `summary.json`, it has been through `nit:phase-summary`, and two of its fields
change what you show:

- `milestone.reached: false` — the phase was summarised and came up short. Show the phase as
  `milestone not reached` and list the `unmet` criteria beneath it. This is the one phase-level thing
  that needs a person, so it belongs with the tasks that do.
- `unreadable[]` — the summary itself declared tasks it could not read. Carry those into **NOT READ**
  rather than re-deriving them; the summary already did that work.

A phase whose `phase.json` says `done` while its `summary.json` says `milestone.reached: false` is a
contradiction — `nit:phase-summary` sets the status only when the milestone is reached, so one of the
two was hand-edited. Report both values and say they disagree; do not pick a winner.

## Output

```
nit — <project name>                                    mode: greenfield
═══════════════════════════════════════════════════════════════════════

PRD           goal in one line                          clarifications: 12/12 answered

WAITING ON YOU
  TASK-024  awaiting_approval  step 4/5 review     → /nit:approve 3 24
  TASK-029  blocked            step 2/5 design     → needs-splitting: spans backend and frontend
  TASK-031  escalated          step 3/5 implement  → reopened 4× on schema errors

PHASE-2  Deterministic Supervisor and Core Pipeline    in-progress · milestone not reached
  SC-3 unmet  2 of 10 validation hooks are not executable
  TASK-017  Rewrite nit:design and nit:implement    backend   done       5/5
PHASE-3  Review, QA, and Boundary Enforcement                     in-progress
  TASK-021  Rewrite nit:review for JSON output      devops    done       5/5
  TASK-024  Rewrite nit:status for v2 artifacts     devops    awaiting_approval  4/5 review
  TASK-025  Rewrite nit:orchestrate                 devops    not started
PHASE-4  Skill Creation, Distribution, and Polish                 planned

NOT READ
  PHASE-1  recorded as v1 prose (PHASE.md); no phase.json

NEXT   /nit:approve 3 24   — TASK-024's review step is waiting on you

COMMANDS
  /nit:init                    initialise the workspace
  /nit:clarify <prd>           clarify the PRD
  /nit:phases                  plan delivery phases
  /nit:tasks <phase>           create tasks for a phase
  /nit:continue <p> <t>        advance a task by one step
  /nit:approve <p> <t>         approve the current step
  /nit:reject <p> <t>          reject the current step and reopen
  /nit:phase-summary <phase>   close a completed phase
  /nit:brownfield-orchestrate  analyse an existing codebase
  /nit:status                  this dashboard
```

Adapt the layout to the terminal and to what exists — drop empty sections rather than printing empty
headings, and do not invent columns for data the workspace does not have.

Do not advertise `/nit:orchestrate` yet. It still routes on `<type>` read from `DESIGN.md` and
dispatches an agent that no longer exists; listing it would send someone at a command that cannot
work. Add it once TASK-025 lands.

## Next step

Name exactly one action — the most immediate. Work down this list and stop at the first match:

| # | Condition | Next |
|---|---|---|
| 1 | No `.nit/` | `/nit:init` |
| 2 | Any task `escalated` | manual: read that step's `validation.json` |
| 3 | Any task `blocked` | manual: resolve the reason, then the transition in `nit:continue` |
| 4 | Any task `awaiting_approval` | `/nit:approve <p> <t>` (or `/nit:reject`) |
| 5 | No `prd/summary.json` | `/nit:clarify <prd>` |
| 6 | `prd/summary.json` has an empty `answer` | `/nit:clarify` |
| 7 | No `phase.json` anywhere | `/nit:phases` |
| 8 | The active phase has no tasks | `/nit:tasks N` |
| 9 | A task has no `state.json` | `/nit:continue N M` — it has not started |
| 10 | A task is `in-progress` | `/nit:continue N M` |
| 11 | Every task in the phase is `done`, no `summary.json` | `/nit:phase-summary N` |
| 12 | The phase is `done` and a later phase has no tasks | `/nit:tasks N+1` |
| 13 | Every phase is `done` | "All phases complete." |

Rows 2–4 sit above the planning rows deliberately. A halted task is more urgent than unplanned work,
and the older ordering — which walked the pipeline from clarification forwards — would have sent
someone to write tasks while an escalated one sat unnoticed.

## Partial and v1 workspaces

`nit:init` does not migrate v1 workspaces, so a project may hold `PHASE.md` and `TASK.md` prose
instead of `phase.json` and `task.json`. This repository's own PHASE-1 and PHASE-2 are exactly that.

Report what you could not read; never render an empty dashboard as though the project were empty:

- A phase directory with no `phase.json` — list it under **NOT READ** with what was found instead
- A task with no `task.json` — same
- A task with `task.json` but no `state.json` — that is not unreadable, it is **not started**; say so
- If `.nit/` exists but holds no phases at all, say that rather than printing an empty listing

Do not parse v1 prose to fill the v2 columns. A guess presented as status is worse than a stated gap,
because the reader has no way to tell them apart.

## Rules

- Read only. Never write, edit, or repair.
- `state.json` is the truth about where a task is; `task.json.status` is planning intent.
- Lead with what is waiting on a person; that section is the point of the command.
- Show `reopenCount` when it is above zero — an escalation is worth seeing before it happens.
- Name exactly one next step, from the v2 command set only.
- Derive step directory names from `stepOrder`, not by globbing.
- Declare what you could not read; never omit it silently.
- Do NOT parse v1 prose into v2 fields.
- Do NOT advertise commands that do not work yet.
