# Implementation — Task 13: Rewrite nit:clarify, nit:phases, nit:tasks for JSON Output

<implementation>

  <summary>
    The three planning skills now persist validated JSON artifacts instead of prose Markdown, while
    their interactive flows are unchanged (KD-1).

    - **nit:clarify** copies the PRD verbatim to `.nit/prd/source.md`, seeds `.nit/prd/summary.json`
      (goal, audience, capabilities, clarifications with empty answers), fills each answer as the
      interactive Q&A proceeds, collects domain terms into `.nit/prd/glossary.json`, and validates both
      JSON files against their schemas before confirming completion. No `CLARIFICATIONS.md` is written.
    - **nit:phases** reads `prd/summary.json` (replacing `CLARIFICATIONS.md`), and writes one
      `phase.json` per phase (replacing `PHASE.md`), validating each against `phase.schema.json`.
    - **nit:tasks** reads `phase.json`, the module registry (`.nit/boundaries/modules.json`), and the
      task-type registry (`.nit/registry/task-types.json`); the analyst proposes a concrete archetype;
      and it writes one `task.json` per task with `targetModule` + `archetype`, validated against
      `task.schema.json`. It does not create `state.json` (KD-5).

    Validation uses the existing CLI (`bun run ./cli/src/cli.ts validate --schema <type> <file>`), the
    same invocation the init skill uses (per ADR-0003, validate at write time). Per the user's decision
    on open question Q-2, the two missing PRD schemas were added in this task so AC-1's validation clause
    passes; they were registered in the CLI schema resolver and covered by tests. The two input hooks
    that guard these skills were updated to check the new JSON artifacts so the pipeline's guardrails
    stay consistent with its outputs.
  </summary>

  <files-changed>
    <file action="created">cli/schemas/prd-summary.schema.json</file>
    <file action="created">cli/schemas/glossary.schema.json</file>
    <file action="modified">cli/src/schema-resolver.ts</file>
    <file action="modified">cli/tests/validate.test.ts</file>
    <file action="modified">.claude/skills/clarify/SKILL.md</file>
    <file action="modified">.claude/skills/phase-plan/SKILL.md</file>
    <file action="modified">.claude/skills/create-tasks/SKILL.md</file>
    <file action="modified">.claude/hooks/validate-phases.sh</file>
    <file action="modified">.claude/hooks/validate-tasks.sh</file>
  </files-changed>

  <deviations>
    - **Included the two PRD schemas in this task (Q-2).** DESIGN's summary said "no CLI/runtime code
      changes," but per the user's explicit decision, `prd-summary.schema.json` and `glossary.schema.json`
      were added to `cli/schemas/` and registered in `cli/src/schema-resolver.ts`. This makes the task
      touch the `cli` module in addition to `.claude/skills`. AC-1 fully passes as a result.
    - **CLI invocation form.** The skills invoke the validator as `bun run ./cli/src/cli.ts validate`
      (matching the existing init skill) rather than a `nit` binary on PATH — there is no installed `nit`
      binary in this repo.
    - **Registry paths.** DESIGN referred to "modules.json"/"task-types.json" generically. Confirmed
      against the init skill: `modules.json` lives at `.nit/boundaries/modules.json`; `task-types.json`
      at `.nit/registry/task-types.json`. The skills reference these canonical paths.
    - **Hooks updated (outside .claude/skills).** `validate-phases.sh` now checks `prd/summary.json`
      (valid JSON + all clarifications answered) instead of `CLARIFICATIONS.md`; `validate-tasks.sh`
      checks `phase.json` (valid JSON + status ≠ done) instead of `PHASE.md`. Without this the rewritten
      pipeline would be internally inconsistent (a skill emits JSON that its own input hook rejects).
      `validate-clarify.sh` is unchanged (it only checks the PRD file exists).
  </deviations>

  <tech-debt>
    The schemas delivered by TASK-001 are intentionally lean and `additionalProperties:false`, so some
    prose planning content is no longer persisted:
    - `phase.schema.json` has no fields for per-phase scope, draft-tasks, or success-criteria. These are
      now discussed interactively and materialised by `nit:tasks` from the milestone + PRD summary, but
      not stored in `phase.json`.
    - `task.schema.json` has no fields for the user story, scope, DoR/DoD, dependencies, or open
      questions. `acceptanceCriteria` is the durable machine-readable contract; the BDD narrative is
      confirmed interactively but not persisted.
    Neither is a correctness defect against the ACs. If richer machine-readable planning records are
    wanted, the phase/task schemas should be extended in a follow-up (natural companion to TASK-017,
    which rewrites nit:design/nit:implement for JSON and will consume task.json).
  </tech-debt>

  <self-check>
    - AC-1: pass — prd/source.md + prd/summary.json + prd/glossary.json produced and validated; new
      schemas added, registered, and unit-tested; sample summary.json/glossary.json return "Valid".
    - AC-2: pass — phase.json (not PHASE.md) written and validated against phase.schema.json; sample
      returns "Valid".
    - AC-3: pass — task.json written with targetModule constrained to .nit/boundaries/modules.json and
      validated against task.schema.json; sample returns "Valid".
    - AC-4: pass — Archetype Proposal step records a concrete cli/archetypes/ id in task.json.archetype
      based on task-type default + task description.
    - DoD: acceptance criteria passed; tests written and green (48 pass / 0 fail, incl. 4 new schema
      tests); both rewritten hooks exercised across pass/fail cases; no critical tech debt (two lean-schema
      limitations recorded above); code review pending reviewer.
  </self-check>

</implementation>
