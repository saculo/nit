---
status: proposed
date: 2026-07-24
decision-makers: [architect]
---

# 0005 — Step skills emit output.json as the sole canonical step artifact

## Context and Problem Statement

The v1 step skills persist human-prose Markdown: `nit:design` writes `DESIGN.md`, `nit:implement`
writes `STEPS.md` and `IMPLEMENTATION.md`, `nit:review` writes `REVIEW.md`. The v2 supervisor
(TASK-015) validates and ingests a step's result from `output.json` against `step-output.schema.json`,
and the approval/rejection machinery (TASK-016) keys off that validated output.

TASK-013 already settled the same question for the *planning* skills (KD-1: JSON canonical, Markdown
rendered on demand). The step skills now face it too, and the answer must be settled once rather than
re-argued per skill: `nit:design` and `nit:implement` are rewritten in TASK-017, `nit:review` and
`nit:qa` follow in PHASE-3. Whichever way this goes, it must be uniform — a pipeline where some steps
are machine-readable and others are prose is the worst of both.

## Decision Drivers

- The supervisor must consume every step's result without parsing prose.
- Two representations of the same result drift, and drift silently.
- Later steps need to read earlier steps' results programmatically (implement reads design).
- Humans still need to review what a step decided, in PRs and in the terminal.

## Considered Options

- Option 1 — `output.json` only; human views rendered on demand by `nit:status`
- Option 2 — Dual output: `output.json` plus the existing Markdown artifact
- Option 3 — Markdown canonical, with a generated JSON projection

## Decision Outcome

Chosen option: "Option 1", because it gives the supervisor one validated source of truth per step and
removes the drift surface entirely. It also matches the precedent already set for planning artifacts in
TASK-013 (KD-1) and the shape of the first rewritten step skill, `nit:analyze` (TASK-016), which emits
`output.json` and nothing else.

Every step skill therefore:

1. reads `input.json` from its step directory (`STEP-NNN-<stepId>/`),
2. writes exactly one canonical artifact, `output.json`, in that same directory,
3. validates it against `step-output.schema.json` at write time (ADR-0003) before finishing,
4. records every other file it produced in the field its result type provides: source files the step
   created, modified, or deleted go in `result.filesChanged[]`; non-source outputs and commit
   references — notes, generated fixtures, the implementation commit — go in `artifacts[]`, by path.

Prose files are not written by step skills. Human-readable views are rendered from `output.json`.

### Consequences

- Good, because the supervisor, approval flow, and validation hooks all operate on one schema-checked
  artifact per step.
- Good, because a later step can read an earlier step's result directly instead of parsing prose.
- Good, because the rewritten skills collapse from hundreds of lines of prose-templating instructions
  to a short procedure plus an output shape.
- Bad, because reviewing a raw `output.json` in a diff is less pleasant than reading Markdown, until
  `nit:status` rendering covers step output.
- Bad, because anything the schema has no field for has nowhere to go; the schema must be extended
  additively as steps need new fields, rather than the skill quietly writing prose instead.

### Confirmation

For each rewritten step skill: the step directory contains `output.json` and no prose artifact, and
`nit validate --schema step-output <path>` exits zero. Reviewers check that the skill's documented
output shape uses only fields present in `step-output.schema.json`.

## Pros and Cons of the Options

### Option 1 — output.json only

- Good, because there is exactly one source of truth per step
- Good, because it is consistent with TASK-013 KD-1 and the `nit:analyze` precedent
- Bad, because human readability depends on rendering tooling that is not fully built yet

### Option 2 — Dual output

- Good, because artifacts stay readable in a diff with no tooling
- Bad, because the two representations drift and authority becomes ambiguous
- Bad, because every step skill must write and keep in sync two artifacts forever

### Option 3 — Markdown canonical + JSON projection

- Good, because it preserves the current authoring experience
- Bad, because it requires a prose parser per step type, which is exactly what v2 set out to remove
- Bad, because projection failures are silent: the JSON can be stale or lossy with no signal

## More Information

- ADR-0002 — JSON Schema 2020-12 with ajv (validation dialect and library)
- ADR-0003 — validate generated files at write time
- ADR-0004 — supervisor state machine as tested CLI code
- TASK-013 DESIGN.md, KD-1 — the same decision for planning artifacts
- TASK-016 — `nit:analyze`, the first step skill built this way
