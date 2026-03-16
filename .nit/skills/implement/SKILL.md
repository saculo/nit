---
name: "nit:implement"
description: "Common engineering workflow for all nit engineer types (backend, frontend, devops, qa). Checks DoR, creates STEPS.md, implements task following DESIGN.md, tracks acceptance criteria and DoD, produces IMPLEMENTATION.md. Use when the user says '/nit:implement', 'implement task', 'start implementation', 'engineer task', or when a task moves to implementation stage."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
hooks:
  PreToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-implement.sh"
          timeout: 10
---

> **Arguments**: `/nit:implement <phase> <task>` — e.g., `/nit:implement 1 2` for TASK-002 in PHASE-1. Resolves to `.nit/phases/PHASE-N/tasks/TASK-00M/`.

# nit Engineer Workflow

Common workflow for all engineer agents. This skill defines the implementation process from DoR check through DoD completion. The specific engineer type (backend, frontend, devops, qa) is determined by the task type in DESIGN.md.

## Input

- TASK.md at `.nit/phases/PHASE-N/tasks/TASK-00M/TASK.md`
- DESIGN.md at `.nit/phases/PHASE-N/tasks/TASK-00M/DESIGN.md`
- **Brownfield only**: relevant sections of `.nit/project/initial-state.md`

---

## Step 0 — Input Validation

Task directory path provided as `$ARGUMENTS` (resolved from phase/task numbers by the router).

### File existence

1. Verify TASK.md exists — if not, STOP: `TASK.md not found. Run /nit:tasks <phase> first.`
2. Verify DESIGN.md exists — if not, STOP: `DESIGN.md not found. Run /nit:design <phase> <task> first.`

### TASK.md structure

- Must contain `<task>` root, `<meta>` with `<id>`, `<type>`, `<status>`, `<module>`
- Must contain `<acceptance-criteria>` with at least one `<criterion>`
- Must contain `<definition-of-ready>` and `<definition-of-done>`
- `<status>` must be `ready` or `in-progress` — if `draft`, STOP: `Task is not ready. Complete design first.` If `done`, STOP: `Task is already complete.`

### DESIGN.md structure

- Must contain `<design>` root, `<type>`, `<summary>`, `<key-decisions>`
- Must contain at least one `<decision>` with `<description>` and `<rationale>`
- `<type>` must be one of: `backend`, `frontend`, `devops`, `qa`

If any validation fails, STOP with the specific error. Do not begin implementation.

## Step 1 — DoR Check

Read TASK.md and verify every Definition of Ready item:

- [ ] User story defined in BDD format (As a / I want / So that)
- [ ] Acceptance criteria defined in Given/When/Then format
- [ ] Dependencies identified
- [ ] No blocking open questions

If any DoR item is NOT satisfied, STOP. Report the specific failures. Do not begin implementation.

## Step 2 — Create STEPS.md

Read DESIGN.md and derive implementation steps. Create `.nit/phases/PHASE-N/tasks/TASK-00M/STEPS.md`:

```md
# Steps — Task M: Title

<steps>

  <implementation-steps>
    <step id="S-1" status="pending">
      <description>First implementation step derived from DESIGN.md</description>
      <deviation></deviation>
    </step>
    <step id="S-2" status="pending">
      <description>Second implementation step</description>
      <deviation></deviation>
    </step>
  </implementation-steps>

  <acceptance-criteria-check>
    <criterion id="AC-1" status="pending">
      <description>Given/When/Then copied from TASK.md</description>
      <verification></verification>
    </criterion>
    <criterion id="AC-2" status="pending">
      <description>Given/When/Then copied from TASK.md</description>
      <verification></verification>
    </criterion>
  </acceptance-criteria-check>

  <dod-check>
    <item id="DOD-1" status="pending">All acceptance criteria passed</item>
    <item id="DOD-2" status="pending">Tests written and passed</item>
    <item id="DOD-3" status="pending">Code review passed</item>
    <item id="DOD-4" status="pending">No critical tech debt introduced</item>
  </dod-check>

</steps>
```

Steps should be:
- Derived from DESIGN.md's summary and key decisions
- Small enough to complete and verify independently
- Ordered by dependency (what must exist before what)
- Include test-writing steps (not just code steps)

Write STEPS.md immediately, then proceed to implementation.

## Step 3 — Implement

Work through implementation steps one by one:

1. Implement the step
2. Update STEPS.md: set `status="done"` for the completed step
3. If deviating from DESIGN.md, fill in the `<deviation>` field with reasoning
4. Move to the next step
5. After all implementation steps are done, run tests

Follow standard conventions for the project's ecosystem.

### Deviation Protocol

| Severity | Definition | Action |
|---|---|---|
| Minor | Naming, file placement, small structural choice | Proceed, note in `<deviation>` |
| Moderate | Different approach needed, additional component | Note in `<deviation>`, flag in IMPLEMENTATION.md |
| Major | Design is wrong, scope change needed | STOP — report to orchestrator, do not proceed |

## Step 4 — Acceptance Criteria Verification

After implementation is complete, verify each acceptance criterion:

1. Read the Given/When/Then from TASK.md
2. Verify the criterion is satisfied (run the test, check the behavior)
3. Update STEPS.md: set `status="done"` and fill `<verification>` with how it was verified
4. If a criterion cannot be satisfied, STOP — report to orchestrator

All criteria must pass before proceeding.

## Step 5 — DoD Check

Verify each Definition of Done item:

1. All acceptance criteria passed → check STEPS.md AC section (all must be `done`)
2. Tests written and passed → run test suite, confirm green
3. Code review passed → this will be checked by reviewer (mark as `pending`)
4. No critical tech debt introduced → review own changes, note any debt

Update STEPS.md DoD items to `done` (except code review — stays `pending` until reviewer completes).

## Step 6 — Write IMPLEMENTATION.md

Create `.nit/phases/PHASE-N/tasks/TASK-00M/IMPLEMENTATION.md`:

```md
# Implementation — Task M: Title

<implementation>

  <summary>
    What was done and how. Key decisions made during implementation.
    How the design was realized in code.
  </summary>

  <files-changed>
    <file action="created">path/to/new-file</file>
    <file action="modified">path/to/changed-file</file>
    <file action="deleted">path/to/removed-file</file>
  </files-changed>

  <deviations>
    Any departures from DESIGN.md with reasoning.
    Reference step IDs from STEPS.md where deviations occurred.
    Empty if implementation matched design exactly.
  </deviations>

  <tech-debt>
    Technical debt introduced or discovered during implementation.
    Empty if none.
  </tech-debt>

  <self-check>
    Final verification summary:
    - AC-1: pass — [how verified]
    - AC-2: pass — [how verified]
    - DoD items: [status]
  </self-check>

</implementation>
```

## Step 7 — Git Commit

After IMPLEMENTATION.md is written, create a git commit for the implementation:

1. **Determine branch prefix**: Read `<type>` from TASK.md and the task title/user story.
   - Default prefix: `feature/`
   - Use `bugfix/` ONLY if the task title or user story explicitly mentions a bug fix
   - All types (`backend`, `frontend`, `devops`, `qa`) default to `feature/`
2. **Create branch**: `git checkout -b <prefix>TASK-<id>` (e.g., `feature/TASK-001` or `bugfix/TASK-001`)
3. **Stage relevant files**: Stage all source code files changed during implementation (listed in IMPLEMENTATION.md `<files-changed>`). Do NOT stage `.nit/` artifacts — only source code changes.
4. **Commit** with this structured message format:
   ```
   TASK-<id>: Short task title

   - Summary of what was implemented
   - Key changes made

   Phase: PHASE-N
   Type: backend|frontend|devops|qa
   ```
5. Do NOT push or create a PR — that happens after review.

## Step 8 — Report Completion

After the git commit is created:
1. Confirm all STEPS.md items are `done` (except code review)
2. Report to orchestrator that implementation is complete and ready for review
3. The orchestrator will transition the task status and spawn the reviewer

---

## Task Complete Condition

A task is complete from the engineer's perspective ONLY when:
- All implementation steps in STEPS.md are `done`
- All acceptance criteria are `done` with verification notes
- All DoD items are `done` (except code review — pending reviewer)
- IMPLEMENTATION.md is written with self-check section
- No major deviations are unresolved

If any of these are not met, the task is NOT ready for review.

## Rules

- Never skip the DoR check — if DoR fails, do not start
- Never skip the DESIGN.md check — if it's missing, do not start
- Always create STEPS.md before writing any code
- Update STEPS.md as you go — it is the living progress tracker
- Follow project conventions for the detected ecosystem
- Deviations from DESIGN.md must be documented with reasoning
- All acceptance criteria must be verified before declaring done
- Do NOT add features beyond acceptance criteria
- Do NOT refactor unrelated code — note as tech debt
- Do NOT mark code review DoD as done — that's the reviewer's job
