---
phase: PHASE-1
date: 2026-03-29
status: recorded
---

# 0001 — Phase 1: Workflow Layer Foundation — Learning Record

## Context

PHASE-1 set out to build the complete skill-based workflow layer for nit inside Claude Code — all agent personas, pipeline skills, orchestration, brownfield analysis, validation hooks, init placement, and one project-specific expertise skill (frontend). The milestone was: the full nit pipeline (init → clarify → phases → tasks → design → implement → review → phase-summary) is invocable manually or via orchestration.

## What Worked

- **Skill-per-step decomposition**: Each workflow step became its own standalone skill with clear input/output contracts. This made skills independently testable and invocable via `/nit:*` commands.
- **Agent persona separation**: Splitting into 7 distinct agents (architect, requirement-gatherer, reviewer, 4 engineers) with dedicated tool permissions and skill references gave each role a clear identity.
- **Validation hooks as enforcement**: Per-skill bash hooks (grep-based XML validation) caught structural issues before skills could produce malformed output. This pattern proved its value and is being promoted to the hard guardrail layer in v2.
- **Brownfield two-agent split**: Having the architect analyze structure first, then the engineer analyze implementation details, produced richer initial-state.md than a single-pass approach would.
- **MADR for ADRs**: Using the established MADR format for ADR-0001 (CodeRabbit) worked cleanly. ADRs remain Markdown, which is the right call for human-authored decisions.
- **Design-first approach**: Every task had a DESIGN.md before implementation, even for "simple" tasks like hook scripts. This caught issues early (e.g., TASK-001 deciding on 4 separate engineer agents vs. 1 generic).

## What Didn't Work

- **Missing implementation tracking artifacts**: No task produced STEPS.md, IMPLEMENTATION.md, or REVIEW.md. The pipeline was being built, so it couldn't be used to build itself — a classic bootstrapping problem. This means there's no formal record of deviations, tech debt, or review verdicts for any PHASE-1 task.
- **XML-in-Markdown for structured data**: While functional, the grep-based validation was fragile. Hooks couldn't validate nested structure or cross-field constraints. This directly motivated the JSON + JSON Schema decision in v2.
- **Dual file placement (.nit/ + .claude/)**: Skills, agents, and hooks were duplicated across both directories, requiring TASK-006 just to manage the copy. v2 eliminates this by putting core skills in `~/.claude/skills/nit/` and keeping `.nit/` for state only.
- **Fixed 4-type routing**: The backend/frontend/devops/qa enum forced TASK-007 (frontend skill) to be a special case with hardcoded skill references in the agent definition. v2's layered composition solves this.
- **Hook executability inconsistency**: 2 of 10 hooks (`validate-brownfield-orchestrate.sh`, `validate-init.sh`) are not executable in both `.nit/hooks/` and `.claude/hooks/`. Minor but indicates the init placement didn't consistently set permissions.

## What We Changed

- **TASK-007 added namespace convention decision (D-1b)**: During CodeRabbit review, the distinction between `nit:` prefix (core workflow) and plain names (project-specific) was formalized as a design decision, not originally planned.
- **TASK-008 was added mid-phase**: Replacing Claude Code Review with CodeRabbit was not in the original phase plan — it emerged from practical usage and was added as an additional task.
- **Frontend skill placed in .claude/ only**: Decision that project-specific skills don't belong in .nit/ was made during TASK-007, setting a precedent that influenced the entire v2 distribution model.

## Quantitative Summary

- Tasks planned: 6 (original draft-tasks in PHASE.md)
- Tasks completed: 8 (2 added: TASK-007 frontend skill, TASK-008 CodeRabbit)
- Rework cycles: 1 (TASK-007 had CodeRabbit review findings fixed)
- ADRs created during phase: 1 (ADR-0001: CodeRabbit for PR review)
- Deviations: 0 minor, 2 moderate (TASK-007 namespace decision, TASK-008 scope addition), 0 major
- Tech debt items: 3 (2 medium: non-executable hooks, missing implementation artifacts; 1 low: dual directory duplication)

## Recommendations

- **v2 must self-host early**: The bootstrapping problem (pipeline can't build itself) should be resolved by getting the v2 supervisor + JSON state working first, then using it to build subsequent features.
- **Fix hook permissions in nit:init**: Ensure all hooks are `chmod +x` during placement. This is a minor fix but affects hook enforcement reliability.
- **Implementation artifacts should be mandatory**: The absence of STEPS.md/IMPLEMENTATION.md/REVIEW.md for every task means the phase summary has no deviation or tech debt data to aggregate. v2's JSON step output solves this structurally.
- **Carry the namespace convention forward**: The `nit:` prefix for core vs. plain names for project-specific is a clean pattern. Formalize it in v2 documentation.
