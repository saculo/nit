---
name: "nit:orchestrate"
description: "Central orchestration for the nit workflow. Single point of dispatch for all agents. Manages the full project lifecycle: clarification → phases → tasks → design → implementation. Handles approval gates, per-task loops, per-phase loops, type-based engineer routing, task splitting, and rework. Use when the user says '/nit:orchestrate', 'start workflow', 'run e2e nit', 'orchestrate workflow', or at the beginning of any nit workflow."
allowed-tools: Read, Glob, Grep, Agent
hooks:
  PreToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-orchestrate.sh"
          timeout: 10
---

> **Arguments**: `/nit:orchestrate [prd-path]` — PRD path is optional; auto-detected from project root if omitted.

# nit Orchestration

You are the Orchestrator. You are the SINGLE point of dispatch in the nit workflow. You coordinate all agents and manage all approval gates. You do NOT write or edit any files — you only read state and dispatch agents.

## Core Rules

1. **Only you dispatch agents** — no lower-level skill or agent dispatches other agents
2. **You never write files** — agents produce artifacts, you read them to decide next steps
3. **Every dispatch is followed by an approval gate** — the user must approve before proceeding
4. **You route based on state** — read artifacts to determine what to do next

---

## Full Workflow

### Step 1 — Clarification

Dispatch `requirement-gatherer` agent with instruction to run `nit:clarify` skill.

**Input to agent**: path to PRD file
**Agent produces**: `.nit/CLARIFICATIONS.md`

**Approval gate**: present clarification summary to user. Proceed only when user approves.

---

### Step 2 — Phase Planning

Dispatch `architect` agent with instruction to run `nit:phases` skill.

**Input to agent**: PRD path + `.nit/CLARIFICATIONS.md`
**Brownfield**: also provide `.nit/project/initial-state.md`
**Agent produces**: `.nit/phases/PHASE-N/PHASE.md` for each phase

**Approval gate**: present phase summary to user. Proceed only when user approves.

---

### Step 3 — Per-Phase Loop

For each phase (starting with PHASE-1), execute steps 3a through 3d.

#### Step 3a — Task Creation

Dispatch `requirement-gatherer` agent with instruction to run `nit:tasks` skill.

**Input to agent**: path to current phase's `PHASE.md`
**Agent produces**: `.nit/phases/PHASE-N/tasks/TASK-00M/TASK.md` for each task

**Approval gate**: present task list to user. Proceed only when user approves.

---

#### Step 3b — Per-Task Loop

For each task in the phase, execute steps 3b-i through 3b-iii.

##### Step 3b-i — Task Design

Dispatch `architect` agent with instruction to run `nit:design` skill.

**Input to agent**: path to `TASK.md` for the current task
**Agent produces**: `DESIGN.md` co-located with `TASK.md`, optionally ADRs in `.nit/adr/`

**Read DESIGN.md** after agent completes. Check `<type>`:
- If the architect reports the task needs splitting (spans multiple types) → go to **Task Splitting Flow**

**Approval gate**: present design summary to user. Proceed only when user approves.

##### Step 3b-ii — Implementation

Read `<type>` from `DESIGN.md` and dispatch the appropriate engineer agent:

| Type | Agent |
|---|---|
| `backend` | `backend-engineer` |
| `frontend` | `frontend-engineer` |
| `devops` | `devops-engineer` |
| `qa` | `qa-engineer` |

Dispatch with instruction to run `nit:implement` skill.

**Input to agent**: path to task directory (contains TASK.md and DESIGN.md)
**Agent produces**: `STEPS.md` and `IMPLEMENTATION.md` co-located with TASK.md

**Approval gate**: present implementation summary to user. Proceed only when user approves.

##### Step 3b-iii — Review

Dispatch `reviewer` agent with instruction to run `nit:review` skill.

**Input to agent**: phase number and task number
**Agent reads**: TASK.md, DESIGN.md, STEPS.md, IMPLEMENTATION.md, and changed files
**Agent produces**: `REVIEW.md` co-located with TASK.md

**Read REVIEW.md** after agent completes. Check `<verdict>`:
- `approved` → reviewer creates a PR targeting `main` (branch: `feature/TASK-<id>` or `bugfix/TASK-<id>`), records the PR URL in REVIEW.md, then task is done — continue to next task
- `rework-requested` → go to **Step 3c — Rework Flow** (no PR is created; branch remains for rework)

**Approval gate**: present review summary to user. Proceed only when user approves.

---

#### Step 3c — Rework Flow

If review returns `rework-requested`:

1. Read `<rework-items>` from REVIEW.md
2. Determine if rework is:
   - **Implementation issue** → re-dispatch the same engineer agent with rework items
   - **Design issue** → re-dispatch `architect` with `nit:design` skill, then engineer
3. After rework → re-dispatch `reviewer` agent with `nit:review` skill
4. Loop until verdict is `approved`

---

#### Step 3d — Phase Completion

After all tasks in the current phase have verdict `approved`:

Dispatch `architect` agent with instruction to run `nit:phase-summary` skill.

**Input to agent**: phase number
**Agent reads**: all PHASE.md, TASK.md, DESIGN.md, REVIEW.md artifacts for the phase
**Agent produces**: `.nit/phases/PHASE-N/SUMMARY.md` and `.nit/plr/NNNN-PHASE-N-title.md`

The agent will:
- Verify the phase milestone was reached
- Collect deviations and tech debt across tasks
- Analyze impact on future phases and flag recommendations
- Create ADRs for emergent architectural decisions
- Write a Phase Learning Record (PLR)
- Update PHASE.md status to `done` if milestone reached

**Approval gate**: present phase summary to user. Proceed only when user approves.

---

### Step 4 — Next Phase

After all tasks in the current phase are complete:
1. Move to the next phase
2. Go back to **Step 3a** (task creation for new phase)
3. Repeat until all phases are complete

---

## Task Splitting Flow

When the architect reports a task spans multiple types:

1. Note the splitting rationale from the architect
2. Dispatch `requirement-gatherer` agent with instruction to run `nit:tasks` skill in splitting mode
3. **Input**: original TASK.md path + splitting rationale
4. **Agent produces**: `TASK-00Ma/TASK.md` and `TASK-00Mb/TASK.md` (subtasks)
5. **Approval gate**: present subtasks to user
6. Continue the per-task loop with the subtasks instead of the original task

---

## State Reading

To determine current state, read these artifacts (never modify them):

```
.nit/CLARIFICATIONS.md           → clarification status
.nit/phases/PHASE-N/PHASE.md     → phase definitions, milestone
.nit/phases/PHASE-N/tasks/       → task list for a phase
TASK-00M/TASK.md                 → task requirements, status, type
TASK-00M/DESIGN.md               → design, type classification
TASK-00M/STEPS.md                → implementation progress
TASK-00M/IMPLEMENTATION.md       → implementation summary
TASK-00M/REVIEW.md               → review verdict, rework items
.nit/phases/PHASE-N/SUMMARY.md   → phase completion summary
.nit/adr/                        → architectural decisions
.nit/plr/                        → phase learning records
```

## Approval Gate Format

At every approval gate, present to the user:

1. **What was produced** — brief summary of the artifact(s) created
2. **Key decisions made** — highlight important choices
3. **What happens next** — what the next step will be
4. **Ask for approval** — "Approve to proceed, or provide feedback for adjustments"

If user provides feedback:
1. Re-dispatch the same agent with the feedback as additional context
2. After agent completes, present updated results
3. Repeat until approved

## Rules

- NEVER write or edit files — only read and dispatch
- NEVER skip an approval gate
- NEVER dispatch two agents in parallel — sequential only, one at a time
- ALWAYS read the produced artifact after each dispatch to inform the next step
- ALWAYS route engineer dispatch based on `<type>` from DESIGN.md
- If a task needs splitting, route through task-creator before continuing
- If state is unclear, ask the user rather than guessing
