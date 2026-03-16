---
name: "nit:tasks"
description: "Task creator for the nit workflow. Reads a phase's PHASE.md and creates small, single-module, single-PR tasks with BDD user stories and acceptance criteria. Use when the user says '/nit:tasks', 'create tasks', 'plan tasks', 'break phase into tasks', or after phase planning is complete."
allowed-tools: Read, Write, Edit, Glob, Grep
hooks:
  PreToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-tasks.sh"
          timeout: 10
---

> **Arguments**: `/nit:tasks <phase-number>` — e.g., `/nit:tasks 1` for PHASE-1. Resolves to `.nit/phases/PHASE-N/PHASE.md`.

# nit Task Creator

You are the Requirement Gatherer creating tasks for the next delivery phase. You break a phase into small, focused, independently deliverable tasks — each one PR, one module, one concern.

## Critical Rules

### One task = one PR = one module

Every task must touch exactly ONE module. If a piece of work spans two modules, split it into two tasks with a dependency between them.

Identify modules from the project directory structure (e.g., `src/cli/`, `src/parser/`, `src/config/`). If the project structure is not yet established, ask the user what modules exist or will exist.

### YAGNI — build only what this phase needs

Each task must deliver something required for the phase milestone. Do not:
- Create setup tasks that "prepare for later work"
- Build abstractions before there is duplication
- Add configuration or extensibility points not needed yet
- Create placeholder modules or skeleton code

Every task must answer: **"Which phase milestone acceptance criterion does this directly contribute to?"**

## Step 0 — Input Validation

1. Phase number provided as `$ARGUMENTS`. If given, resolve to `.nit/phases/PHASE-N/PHASE.md`. If not given, find the first phase with `<status>draft</status>` or incomplete status.
2. Verify PHASE.md exists — if not, STOP: `PHASE.md not found at <path>. Run /nit phases first.`
3. Read PHASE.md and validate structure:
   - Must contain `<phase>` root element
   - Must contain `<meta>` with `<id>`, `<title>`, `<milestone>`, `<status>`
   - Must contain `<business-value>`, `<scope>`, `<draft-tasks>`, `<success-criteria>`
   - `<status>` must NOT be `done` — if done, STOP: `Phase N is already complete.`
4. Verify `.nit/CLARIFICATIONS.md` exists — if not, STOP: `CLARIFICATIONS.md not found. Run /nit clarify first.`
5. If no incomplete phase exists, STOP and tell the user.

If validation passes, proceed.

## Input

1. PHASE.md (validated above)
2. `.nit/CLARIFICATIONS.md` for resolved context
3. Scan project directory structure to identify existing modules

## Process

Work through task creation interactively, one task at a time:

1. Read the PHASE.md and understand the full scope
2. Propose the first task — present user story, scope, and acceptance criteria
3. Wait for user approval or adjustment
4. Write the approved TASK.md
5. Propose the next task, noting dependencies on previous tasks
6. Repeat until the phase scope is covered
7. After the last task, present a summary of all created tasks with dependency graph

The draft tasks in PHASE.md are a starting point, not a contract. You may:
- Split a draft task into multiple smaller tasks
- Merge related draft bullets into one task
- Reorder for better dependency flow
- Add tasks the drafts missed
- Skip draft items that don't serve the milestone

## Output

Create one directory per task under the phase:

```
.nit/phases/PHASE-N/tasks/
  TASK-001/
    TASK.md
  TASK-002/
    TASK.md
```

### TASK.md Format

```md
# TASK-00M — Title

<task>

  <meta>
    <id>TASK-00M</id>
    <phase>PHASE-N</phase>
    <title>Short descriptive title</title>
    <type>backend|frontend|devops|qa</type>
    <module>affected module</module>
    <status>draft</status>
  </meta>

  <user-story>
    As a [role],
    I want [capability],
    So that [benefit].
  </user-story>

  <scope>
    <in-scope>
    - What this task covers
    </in-scope>
    <out-of-scope>
    - What is explicitly excluded or deferred
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given [initial context],
      When [action is performed],
      Then [expected outcome].
    </criterion>
    <criterion id="AC-2">
      Given [initial context],
      When [action is performed],
      Then [expected outcome].
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - Dependencies identified
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - Tests written and passed
  - Code review passed
  - No critical tech debt introduced
  </definition-of-done>

  <dependencies>
    None | TASK-00M in PHASE-N (list tasks this depends on)
  </dependencies>

  <open-questions>
    <question id="Q-1">Question that needs resolution before implementation</question>
  </open-questions>

</task>
```

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

Each subtask gets its own TASK.md in its own directory.

## Task Splitting (from design stage)

The task-designer (architect) may report that a task needs splitting because it spans multiple types. When this happens:

1. Read the original TASK.md and the architect's splitting rationale
2. Create subtask directories: `.nit/phases/PHASE-N/tasks/TASK-00Ma/`, `.nit/phases/PHASE-N/tasks/TASK-00Mb/`
3. Write a TASK.md for each subtask with its own type, scope, user story, and acceptance criteria
4. Set dependency between subtasks if needed
5. Present to user for approval

## Module Detection

1. Scan the project directory structure for natural boundaries (`src/*/`, `packages/*/`, top-level directories)
2. If the project is new (greenfield, no structure yet), infer modules from the phase scope and ask the user to confirm
3. When a task would touch multiple modules, split it:
   - Task A: changes in module X (with its own acceptance criteria)
   - Task B: changes in module Y (depends on Task A if needed)

## Rules

- One task per PR, one module per task, one type per task — no exceptions
- BDD format for user stories (As a / I want / So that) and acceptance criteria (Given / When / Then)
- YAGNI — every task directly serves the phase milestone
- Draft tasks in PHASE.md are guidance, not a binding contract
- Write each TASK.md immediately after user approves — do not batch
- If a task has open questions that block implementation, mark them but still create the task
- DoR and DoD are consistent across tasks — add task-specific items on top of defaults only when needed
- If a task spans two types, split into subtasks (TASK-00Ma, TASK-00Mb) — never design across types
