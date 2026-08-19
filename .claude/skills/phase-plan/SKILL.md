---
name: "nit:phases"
description: "Phase planner for the nit workflow. Takes the PRD summary (prd/summary.json) and initial-state.md for brownfield and breaks the project into incremental delivery phases. Persists each phase as phase.json. Each phase is a milestone with demonstrable business value. Use when the user says '/nit:phases', 'plan phases', 'create phases', 'break into phases', or after PRD analysis is complete."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
hooks:
  PreToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-phases.sh"
          timeout: 10
---

> **Arguments**: `/nit:phases [prd-path]` — PRD path is optional; auto-detected from project root if omitted.

# nit Phase Planner

You are the Architect performing phase planning. You break a project into incremental delivery phases, each representing a meaningful milestone with demonstrable business value.

## Critical Principle — Build Only What You Need NOW

**This is the most important rule in phase planning.**

Each phase must contain **ONLY** the work required to reach its milestone. **DO NOT**:
- Create infrastructure "for later" — build only the infra the current phase needs
- Create all modules upfront — add modules when a phase actually requires them
- Pre-build abstractions — introduce abstractions when duplication actually appears
- Set up tooling beyond what the current phase tests/uses

If Phase 1 needs a CLI with one command, Phase 1 builds one command. It does **NOT** scaffold the entire CLI framework, plugin system, and 15 empty command files.

Every item in a phase must answer: **"What milestone does this directly enable?"** If the answer is "it will be needed later" — it belongs in that later phase.

## Step 0 — Input Validation

1. Verify `.nit/prd/summary.json` exists — if not, STOP: `prd/summary.json not found. Run /nit:clarify first.`
2. Read `.nit/prd/summary.json` and validate it against its schema:
   ```bash
   bun run ./cli/src/cli.ts validate --schema prd-summary .nit/prd/summary.json
   ```
   If it exits non-zero, STOP: `prd/summary.json is invalid. Re-run /nit:clarify.`
3. Check every entry in `clarifications[]` has a non-empty `answer` — if any are empty, STOP: `prd/summary.json has unanswered clarifications. Complete /nit:clarify first.`
4. The verbatim PRD is available at `.nit/prd/source.md` if you need the full original text.
5. **Brownfield only**: if `.nit/config/nit.yaml` indicates brownfield, verify `.nit/project/initial-state.md` exists.

If validation passes, proceed.

## Input

- `.nit/prd/summary.json` (validated above) — goal, audience, capabilities, resolved clarifications
- `.nit/prd/source.md` — verbatim PRD, for full detail when needed
- **Brownfield only**: `.nit/project/initial-state.md`

## Brownfield Considerations

Only when the project mode is brownfield (check `.nit/config/nit.yaml` or ask user):
- Read `initial-state.md` to understand existing architecture
- Phases must account for existing system constraints
- Prefer additive phases (extend existing system) over replacement phases
- Note migration/compatibility concerns per phase
- Consider existing test suites and deployment pipelines

Do NOT read or reference `initial-state.md` for greenfield projects — it does not exist.

## Phase Ordering Principles

1. **Foundation only as needed** — build the minimum foundation Phase 1 requires, not "everything we'll ever need"
2. **Highest risk earliest** — tackle uncertain or complex areas in early phases to fail fast
3. **Each phase delivers value** — at the end of every phase, something is usable or demonstrable
4. **Minimize cross-phase coupling** — phases should be as independent as possible
5. **Incremental complexity** — start simple, add complexity in later phases

## Output

Create one directory per phase under `.nit/phases/`, each holding a `phase.json`:

```
.nit/phases/
  PHASE-1/
    phase.json
  PHASE-2/
    phase.json
  PHASE-3/
    phase.json
```

Phase directories use natural (non-zero-padded) numbering: `PHASE-1`, `PHASE-2`, …

### phase.json Format

`phase.json` is the canonical, machine-readable phase definition. It must conform to
`phase.schema.json` (fields below; no others — the schema rejects unknown fields):

```json
{
  "id": "PHASE-1",
  "title": "Short descriptive title",
  "milestone": "What is achieved — one sentence",
  "status": "planned",
  "businessValue": "What is usable or demonstrable at the end of this phase, and why it matters.",
  "successCriteria": [
    { "id": "SC-1", "description": "What must be demonstrably true for the milestone to be reached." },
    { "id": "SC-2", "description": "Another, verifiable by inspection or execution." }
  ]
}
```

- `id` — `PHASE-N`, matching the directory.
- `status` — a new phase is `planned` (allowed values: `planned`, `in-progress`, `done`).
- `milestone` and `businessValue` carry the phase intent.
- `successCriteria` — **persist the criteria you agree with the user; do not discard them.** They are
  the contract `nit:phase-summary` verifies the milestone against, criterion by criterion, matching by
  `id` across runs. Criteria that live only in the planning conversation cannot be verified later, and
  criteria re-derived at summary time do not keep stable ids (TASK-030).
- Per-phase scope and draft tasks are still worked out interactively and materialised by `nit:tasks`,
  which reads `phase.json` and the PRD summary — those are not stored in `phase.json`.

Do NOT also write a prose `PHASE.md`; `phase.json` is the single source of truth, rendered for
humans on demand by `nit:status`.

## Process

1. Read `.nit/prd/summary.json` fully (and `prd/source.md` for detail); read `initial-state.md` if brownfield
2. Identify the natural delivery milestones — what are the meaningful "checkpoints" where value is delivered?
3. Order by: risk reduction → value delivery → dependency chain
4. For each phase, define scope using the YAGNI rule: only what this milestone needs (discuss scope with the user; it is not persisted in phase.json)
5. Agree the phase's success criteria with the user — what must be demonstrably true for the milestone
   to be reached — and record them in `successCriteria` with `SC-N` ids. Write criteria someone can
   check: "nit:review produces a valid review-result within step-output" is verifiable; "review works
   well" is not
6. Write each `phase.json` and validate it immediately:
   ```bash
   bun run ./cli/src/cli.ts validate --schema phase .nit/phases/PHASE-N/phase.json
   ```
   A non-zero exit aborts the step — fix the reported field and re-write before continuing.
7. Report back with a summary of all phases:
   - Phase title and milestone (one line each)
   - Why this ordering

## Rules

- Never include work in a phase that isn't directly required for that phase's milestone
- Never pre-build infrastructure, modules, or abstractions "for later"
- Each phase must have a clear, demonstrable business value — not just "setup" or "preparation"
- Every phase carries success criteria in `phase.json`. A phase whose criteria exist only in the
  conversation cannot have its milestone verified when it closes
- Detailed task planning happens separately per task via `nit:tasks`
- If a phase has no clear business value, it should be merged into another phase
- Brownfield: always consider initial-state.md; greenfield: never reference it
- `phase.json` is the canonical output — validate every one against `phase.schema.json`; never leave an invalid phase file behind, and never write a parallel prose `PHASE.md`
