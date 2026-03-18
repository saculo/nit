---
name: "nit:status"
description: "Project status dashboard for the nit workflow. Shows all phases and tasks with their current status, suggests the next step, and lists available /nit:* commands. Use when the user says '/nit:status', 'show status', 'project status', 'what next', or wants an overview of workflow progress."
allowed-tools: Read, Glob, Grep
---

> **Arguments**: `/nit:status` — no arguments required.

# nit Status Dashboard

Show the current state of the nit workflow by reading all phase and task artifacts.

## Process

1. Check if `.nit/` directory exists. If not:
   ```
   nit workspace not initialized.
   Start with: /nit:clarify <prd-file>
   ```

2. Check for `.nit/CLARIFICATIONS.md` — note if present and whether all answers are filled.

3. Scan `.nit/phases/` for all phase directories. For each phase:
   - Read PHASE.md `<meta>` — extract `<title>` and `<status>`
   - Scan `tasks/` subdirectory for task directories
   - For each task, read TASK.md `<meta>` — extract `<title>`, `<type>`, `<status>`
   - Check which artifacts exist: DESIGN.md, STEPS.md, IMPLEMENTATION.md, REVIEW.md

4. Display the dashboard:

```
nit — Project Status
═══════════════════════

Clarifications: done

Phases:
  phase-1: Title                          [done]
  phase-2: Title                          [in-progress]
    task-1: Title (backend)               [done]       REVIEW.md ✓
    task-2: Title (frontend)              [in-progress] DESIGN.md ✓
    task-3: Title (backend)               [draft]
  phase-3: Title                          [draft]

Next step: /nit:implement 2 2

Available commands:
  /nit:init                         Initialize nit workspace
  /nit:clarify [prd]                Analyze PRD
  /nit:phases [prd]                 Plan delivery phases
  /nit:tasks <phase>                Create tasks for a phase
  /nit:design <p> <t>               Design a task
  /nit:implement <p> <t>            Implement a task
  /nit:review <p> <t>               Review an implementation
  /nit:phase-summary <phase>        Summarize completed phase
  /nit:orchestrate [prd]            Full automated pipeline
  /nit:brownfield-orchestrate       Analyze existing codebase
  /nit:status                       This dashboard
```

## Next Step Suggestion

Determine by finding the first incomplete item in the workflow:

1. No `.nit/` directory → `/nit:init`
2. No `.nit/CLARIFICATIONS.md` → `/nit:clarify`
3. No phases → `/nit:phases`
4. Phase with status `draft` and no tasks → `/nit:tasks N`
5. Task with status `draft` and no DESIGN.md → `/nit:design N M`
6. Task with DESIGN.md but no IMPLEMENTATION.md → `/nit:implement N M`
7. Task with IMPLEMENTATION.md but no REVIEW.md → `/nit:review N M`
8. Task with status `rework` → `/nit:implement N M` (rework)
9. All tasks in current phase done but no SUMMARY.md → `/nit:phase-summary N`
10. Phase done → next phase: `/nit:tasks N+1`
11. All phases done → "All phases complete!"

Show only ONE next step — the most immediate action needed.
