---
name: "nit:tasks"
description: "Task creator for the nit workflow. Reads a phase's phase.json and creates small, single-module, single-PR tasks with BDD user stories and acceptance criteria. Persists each task as task.json with a targetModule and an analyst-proposed archetype. Use when the user says '/nit:tasks', 'create tasks', 'plan tasks', 'break phase into tasks', or after phase planning is complete."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
hooks:
  PreToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-tasks.sh"
          timeout: 10
---

> **Arguments**: `/nit:tasks <phase-number>` — e.g., `/nit:tasks 1` for PHASE-1. Resolves to `.nit/phases/PHASE-N/phase.json`.

# nit Task Creator

You are the Requirement Gatherer creating tasks for the next delivery phase. You break a phase into small, focused, independently deliverable tasks — each one PR, one module, one concern.

## Critical Rules

### One task = one PR = one module

Every task must touch exactly ONE module. If a piece of work spans two modules, split it into two tasks with a dependency between them.

Modules come from the project registry `.nit/boundaries/modules.json` (written by `nit:init`). Each task's `targetModule` MUST be the `name` of a module that exists in that file. If the registry is missing, STOP and tell the user to run `nit:init` — do not invent modules.

### YAGNI — build only what this phase needs

Each task must deliver something required for the phase milestone. Do not:
- Create setup tasks that "prepare for later work"
- Build abstractions before there is duplication
- Add configuration or extensibility points not needed yet
- Create placeholder modules or skeleton code

Every task must answer: **"Which phase milestone acceptance criterion does this directly contribute to?"**

## Step 0 — Input Validation

1. Phase number provided as `$ARGUMENTS`. If given, resolve to `.nit/phases/PHASE-N/phase.json`. If not given, find the first phase whose `phase.json` has `status` not equal to `done`.
2. Verify `phase.json` exists — if not, STOP: `phase.json not found at <path>. Run /nit:phases first.`
3. Read `phase.json` and validate it against its schema:
   ```bash
   bun run ./cli/src/cli.ts validate --schema phase .nit/phases/PHASE-N/phase.json
   ```
   If it exits non-zero, STOP: `phase.json is invalid. Re-run /nit:phases.`
   - `status` must NOT be `done` — if done, STOP: `Phase N is already complete.`
4. Verify `.nit/prd/summary.json` exists — if not, STOP: `prd/summary.json not found. Run /nit:clarify first.`
5. Verify the registry exists:
   - `.nit/boundaries/modules.json` — if missing, STOP: `Module registry not initialised — run nit:init.`
   - `.nit/registry/task-types.json` — used for the archetype default; if missing, STOP: `Task-type registry not initialised — run nit:init.`
6. If no incomplete phase exists, STOP and tell the user.

If validation passes, proceed.

## Input

1. `phase.json` (validated above) — the phase's milestone and business value
2. `.nit/prd/summary.json` for resolved product context (goal, capabilities, clarifications)
3. `.nit/boundaries/modules.json` — the set of valid `targetModule` names
4. `.nit/registry/task-types.json` — task types and their `defaultArchetype`

## Process

Work through task creation interactively, one task at a time:

1. Read `phase.json` and `prd/summary.json` and understand the full scope of the milestone
2. Propose the first task — present user story, scope, target module, and acceptance criteria
3. Wait for user approval or adjustment
4. Propose the archetype (see "Archetype Proposal" below) and write the approved `task.json`
5. Propose the next task, noting dependencies on previous tasks
6. Repeat until the phase scope is covered
7. After the last task, present a summary of all created tasks with dependency graph

The phase's milestone is the contract; the specific task breakdown is yours to shape. You may split, merge, reorder, add, or skip candidate work as long as every task serves the milestone.

## Archetype Proposal

Once the task's fields are gathered, the Analyst proposes an **archetype** — the step sequence the
supervisor will run for this task. This is the lightweight in-task proposal (distinct from the
`nit:analyze` step skill).

1. Look up the task's `type` in `.nit/registry/task-types.json` and read its `defaultArchetype`.
2. Consider the task description and the target module's characteristics; the proposed id may refine
   the default (e.g., a bug-fix task → `bugfix`; work crossing module boundaries → `cross-module-change`).
3. The proposed id MUST be one of the concrete archetypes shipped in `cli/archetypes/`:
   `backend-feature`, `frontend-feature`, `infra-change`, `bugfix`, `cross-module-change`,
   `architecture-decision`. (`base` is abstract — never propose it.)
4. Present the proposed archetype to the user with the task; record the agreed id in `task.json.archetype`.

## Output

Create one directory per task under the phase, each holding a `task.json`:

```
.nit/phases/PHASE-N/tasks/
  TASK-001/
    task.json
  TASK-002/
    task.json
```

Task directories use three-digit numbering (`TASK-001`), continuing across phases (never reset per phase).

### task.json Format

`task.json` is the canonical, machine-readable task definition. It must conform to `task.schema.json`
(fields below; the schema rejects unknown fields):

```json
{
  "id": "TASK-001",
  "phase": "PHASE-1",
  "title": "Short descriptive title",
  "type": "backend",
  "targetModule": "the-module-name",
  "status": "draft",
  "archetype": "backend-feature",
  "acceptanceCriteria": [
    { "id": "AC-1", "description": "Given [context], When [action], Then [outcome]." },
    { "id": "AC-2", "description": "Given [context], When [action], Then [outcome]." }
  ]
}
```

- `type` — exactly one of `backend`, `frontend`, `devops`, `qa`.
- `targetModule` — MUST be the `name` of a module present in `.nit/boundaries/modules.json`.
- `status` — a new task is `draft`.
- `archetype` — the id agreed in the Archetype Proposal step above.
- `acceptanceCriteria` — the Given/When/Then criteria, each with an `AC-N` id.
- The user story and scope are discussed and confirmed interactively; the lean task schema records the
  acceptance criteria as the durable contract. Do NOT also write a prose `TASK.md`.

Validate every `task.json` immediately after writing it:

```bash
bun run ./cli/src/cli.ts validate --schema task .nit/phases/PHASE-N/tasks/TASK-NNN/task.json
```

A non-zero exit aborts the step — fix the reported field and re-write before proposing the next task.

`nit:tasks` does NOT create a `state.json` for the task; task-state is initialised by the supervisor
(`nit:continue`) on first advance.

## Sizing Guide

A well-sized task should:
- Be completable in a single PR
- Touch one module only
- Have 2–5 acceptance criteria (fewer = too trivial, more = too big)
- Be describable in one sentence without "and" connecting unrelated concerns

If you find yourself writing "and" in the title connecting two different concepts, split into two tasks.

## Task Type Classification

Every task must have exactly ONE type:

| Type | Scope |
|---|---|
| **backend** | Server-side logic, APIs, services, data processing, backend config, data schema, integrations |
| **frontend** | UI components, client-side logic, styling, frontend config |
| **devops** | CI/CD, deployment, containerization, environment setup, build tooling |
| **qa** | Test infrastructure, test harness setup (not regular tests — those are DoD for every task) |

If a task spans two types, split it into subtasks:
- `TASK-00Ma` — one type (e.g., backend)
- `TASK-00Mb` — other type (e.g., frontend)

Each subtask gets its own `task.json` in its own directory.

## Task Splitting (from design stage)

The task-designer (architect) may report that a task needs splitting because it spans multiple types. When this happens:

1. Read the original `task.json` and the architect's splitting rationale
2. Create subtask directories: `.nit/phases/PHASE-N/tasks/TASK-00Ma/`, `.nit/phases/PHASE-N/tasks/TASK-00Mb/`
3. Write a `task.json` for each subtask with its own type, targetModule, archetype, and acceptance criteria
4. Set dependency between subtasks if needed (discussed with the user)
5. Present to user for approval

## Module Detection

1. The valid modules are exactly the `name` entries in `.nit/boundaries/modules.json`. A task's `targetModule` must be one of them.
2. If the needed module is not in the registry, STOP and tell the user to add it via `nit:init` — do not invent a module name.
3. When a task would touch multiple modules, split it:
   - Task A: changes in module X (with its own acceptance criteria)
   - Task B: changes in module Y (depends on Task A if needed)

## Rules

- One task per PR, one module per task, one type per task — no exceptions
- Discuss user stories in BDD form (As a / I want / So that) and write acceptance criteria in Given/When/Then form
- YAGNI — every task directly serves the phase milestone
- The phase milestone is guidance for scope, not a binding task list
- Write and validate each `task.json` immediately after the user approves — do not batch
- `targetModule` must exist in `.nit/boundaries/modules.json`; `archetype` must be a concrete archetype from `cli/archetypes/`
- `task.json` is the canonical output — validate every one against `task.schema.json`; never leave an invalid task file behind, and never write a parallel prose `TASK.md`
- If a task spans two types, split into subtasks (TASK-00Ma, TASK-00Mb) — never design across types
