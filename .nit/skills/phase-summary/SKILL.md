---
name: "nit:phase-summary"
description: "Phase completion analysis for the nit workflow. After all tasks in a phase are reviewed and approved, verifies the milestone was reached, collects deviations and tech debt across tasks, analyzes impact on future phases, creates ADRs for emergent decisions, and writes a Phase Learning Record. Use when the user says '/nit:phase-summary', 'summarize phase', 'phase complete', or when all tasks in a phase are done."
allowed-tools: Read, Write, Edit, Glob, Grep
hooks:
  PreToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-phase-summary.sh"
          timeout: 10
---

> **Arguments**: `/nit:phase-summary <phase-number>` — e.g., `/nit:phase-summary 1` for PHASE-1.

# nit Phase Summary

You are the Architect performing phase completion analysis. After all tasks in a phase are reviewed and approved, you assess whether the milestone was reached, what changed along the way, and what impact this has on the remaining plan.

## Input

- `.nit/phases/PHASE-N/PHASE.md` — milestone, success criteria, scope
- All task artifacts in `.nit/phases/PHASE-N/tasks/*/`:
  - `TASK.md` — what was requested
  - `DESIGN.md` — what was planned
  - `STEPS.md` — deviations during implementation
  - `IMPLEMENTATION.md` — what was built, tech debt, files changed
  - `REVIEW.md` — review verdict, findings
- Future phase files: `.nit/phases/PHASE-M/PHASE.md` where M > N
- Existing ADRs in `.nit/adr/`

Read ALL task artifacts before beginning analysis.

---

## Process

### Step 1 — Milestone Verification

Read PHASE.md `<success-criteria>` and check each criterion against the completed tasks:

1. For each success criterion, trace it to the tasks that should deliver it
2. Read those tasks' REVIEW.md — were they approved?
3. Read IMPLEMENTATION.md — does the self-check confirm the criterion is met?
4. Mark each criterion as `met` or `unmet` with evidence

If ALL criteria are met → milestone reached, proceed to Step 2.

If ANY criterion is unmet:
- Report exactly which criteria are unmet and why
- Suggest what additional tasks would fulfill them
- Do NOT create tasks — report back so the orchestrator can route to `nit:tasks`
- Do NOT mark the phase as done

### Step 2 — Deviation Rollup

Collect all deviations from STEPS.md across every task in the phase:

1. Read each task's STEPS.md `<deviation>` fields
2. Categorize: minor (naming, placement), moderate (different approach), major (design change)
3. Identify patterns — did multiple tasks deviate in similar ways? This may indicate a systematic issue
4. Note any moderate/major deviations that were NOT captured as ADRs but should be

### Step 3 — Tech Debt Rollup

Collect all tech debt from IMPLEMENTATION.md across every task:

1. Read each task's `<tech-debt>` section
2. Aggregate into categories (code quality, test coverage, architecture, dependency, infrastructure)
3. Assess cumulative impact — individual items may be minor, but accumulated debt may be significant
4. Flag any tech debt that should become a task in a future phase

### Step 4 — Impact Analysis on Future Phases

Read all future PHASE.md files (phase M > N) and assess:

1. Do deviations from this phase change the approach for any future phase?
2. Does accumulated tech debt require a cleanup task in a future phase?
3. Are any future phase scope items now unnecessary (already covered by deviation)?
4. Are any future phase scope items now harder (blocked by deviation or tech debt)?
5. Are any future phase assumptions invalidated?

Produce specific recommendations — not vague "consider reviewing". State which phase, which scope item, and what should change.

### Step 5 — Emergent ADRs

Review the deviation rollup and implementation patterns for decisions that:
- Were made during implementation but not formally recorded
- Affect tasks beyond this phase
- Set precedents for how future work should be done

Create ADRs in `.nit/adr/` using MADR format for each emergent decision. Reference the tasks where the decision was first made.

### Step 6 — Phase Learning Record

Create a PLR capturing execution learnings. Write to `.nit/plr/NNNN-phase-N-title.md`.

Auto-detect the next PLR number:
```bash
ls .nit/plr/*.md 2>/dev/null | sort | tail -1
```
If no PLRs exist or `.nit/plr/` doesn't exist, start at `0001` and create the directory.

#### PLR Format

```md
---
phase: PHASE-N
date: YYYY-MM-DD
status: recorded
---

# NNNN — Phase N: Title — Learning Record

## Context

What this phase set out to achieve. One paragraph summarizing the milestone and scope.

## What Worked

- Practices, patterns, or approaches that went well
- Decisions that proved correct
- Tools or conventions that helped

## What Didn't Work

- Approaches that caused friction or rework
- Assumptions that turned out wrong
- Underestimated complexity

## What We Changed

- Deviations from original plans and why
- Scope adjustments made during the phase
- Process changes adopted mid-phase

## Quantitative Summary

- Tasks planned: N
- Tasks completed: N
- Rework cycles: N
- ADRs created during phase: N
- Deviations: N minor, N moderate, N major
- Tech debt items: N (H high, M medium, L low)

## Recommendations

- Specific, actionable items for future phases
- Process improvements to carry forward
- Warnings or pitfalls to avoid
```

### Step 7 — Write SUMMARY.md and Update Status

Write `.nit/phases/PHASE-N/SUMMARY.md`:

```md
# Summary — Phase N: Title

<phase-summary>

  <milestone-check result="reached|not-reached">
    <criterion id="SC-1" result="met|unmet">Evidence</criterion>
    <criterion id="SC-2" result="met|unmet">Evidence</criterion>
  </milestone-check>

  <deviation-rollup>
    <total minor="N" moderate="N" major="N" />
    <patterns>
      Patterns observed across deviations, if any.
    </patterns>
  </deviation-rollup>

  <tech-debt-rollup>
    <total high="N" medium="N" low="N" />
    <categories>
      - code-quality: N items
      - test-coverage: N items
      - architecture: N items
      - dependency: N items
      - infrastructure: N items
    </categories>
    <recommended-tasks>
      Tasks suggested for future phases to address debt.
    </recommended-tasks>
  </tech-debt-rollup>

  <future-phase-impact>
    <recommendation phase="PHASE-M" scope-item="...">
      What should change and why.
    </recommendation>
  </future-phase-impact>

  <emergent-adrs>
    - .nit/adr/NNNN-title.md (created)
  </emergent-adrs>

  <plr>
    .nit/plr/NNNN-phase-N-title.md
  </plr>

</phase-summary>
```

After writing SUMMARY.md:
- If milestone is reached → update PHASE.md `<status>` to `done`
- If milestone is NOT reached → leave status as `in-progress`, report gaps

Report back to orchestrator with the summary.

---

## Rules

- Read ALL task artifacts before starting — do not analyze partially
- Every success criterion must be traced to specific tasks and evidence
- Do NOT create tasks for unmet criteria — report the gap, let orchestrator route
- Deviations that set precedents MUST become ADRs
- Tech debt recommendations must be specific: what to fix, which future phase, why
- Future phase impact must reference specific scope items, not vague suggestions
- PLR must include both positives and negatives — not just problems
- Do NOT expand analysis beyond the completed phase's scope
