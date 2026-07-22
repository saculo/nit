# Review — Task 13: Rewrite nit:clarify, nit:phases, nit:tasks for JSON Output

<review>

  <verdict>approved</verdict>

  <pr-url>https://github.com/saculo/nit/pull/16</pr-url>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      clarify/SKILL.md copies the PRD to `.nit/prd/source.md` (Step 0.6), seeds and fills
      `.nit/prd/summary.json` (Steps 2–3), writes `.nit/prd/glossary.json` (Step 4), and validates both
      JSON files via the CLI before confirming completion (Step 5). The two required schemas —
      `prd-summary.schema.json` and `glossary.schema.json` — were added to `cli/schemas/`, registered in
      the resolver, and exercised by valid/invalid fixtures. The CLI returns "Valid" (exit 0) for
      conforming files and "Validation failed" (exit 1) otherwise.
    </criterion>
    <criterion id="AC-2" result="pass">
      phase-plan/SKILL.md persists one `phase.json` per phase under `.nit/phases/PHASE-N/` (no `PHASE.md`)
      and validates each against `phase.schema.json` at write time (Process step 5). The documented
      phase.json shape conforms to the lean schema (id/title/milestone/status/businessValue,
      additionalProperties:false).
    </criterion>
    <criterion id="AC-3" result="pass">
      create-tasks/SKILL.md writes `task.json` with a `targetModule` constrained to `name` entries in
      `.nit/boundaries/modules.json`, stops with a clear message if the registry is absent, and validates
      against `task.schema.json`. Path and format match the AC.
    </criterion>
    <criterion id="AC-4" result="pass">
      create-tasks/SKILL.md adds an "Archetype Proposal" step: the analyst reads `defaultArchetype` from
      `.nit/registry/task-types.json`, refines by task description/module, and records a concrete
      `cli/archetypes/` id in `task.json.archetype`. All six concrete archetypes named in the skill
      (backend-feature, frontend-feature, infra-change, bugfix, cross-module-change, architecture-decision)
      exist on disk; `base` is correctly excluded.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria passed (Step 3).</item>
    <item id="DOD-2" result="pass">Test suite runs green: 48 pass / 0 fail (149 assertions). Four new tests
      cover valid + invalid prd-summary and glossary fixtures through the actual CLI with meaningful
      assertions (exit codes and stderr content).</item>
    <item id="DOD-3" result="pass">Code review passed (this review).</item>
    <item id="DOD-4" result="pass">No critical tech debt. The two lean-schema limitations (phase/task
      schemas do not persist prose scope/DoR/DoD) are inherited from TASK-001's schema design and recorded
      as non-critical follow-ups, not defects against the ACs.</item>
  </dod-check>

  <architecture-conformance result="pass">
    Implementation follows all five key decisions: JSON is the single canonical artifact with no parallel
    Markdown (KD-1); output locations match the v2 layout under `.nit/prd/`, `.nit/phases/...` (KD-2);
    every JSON file is validated at write time via the CLI per ADR-0003 (KD-3); archetype proposal is
    delegated to the analyst from the task-type default (KD-4); no `state.json` is created — that ownership
    stays with the supervisor (KD-5, resolving Q-1).

    Deviations are all declared and sound: (a) the two PRD schemas were added to the `cli` module per the
    user's explicit Q-2 decision so AC-1 can fully pass; (b) the validator is invoked as
    `bun run ./cli/src/cli.ts validate` matching the existing init skill, since no `nit` binary is
    installed; (c) canonical registry paths (`.nit/boundaries/modules.json`, `.nit/registry/task-types.json`)
    were confirmed against the init skill; (d) two input hooks were updated so the pipeline's guardrails
    match its new JSON outputs. Each is acceptable.
  </architecture-conformance>

  <security-check result="pass">
    No hardcoded secrets, injection vectors, or insecure defaults. The updated hooks use
    `set -euo pipefail` and parse input through `jq` safely; user-supplied phase numbers are regex-validated
    (`^[0-9]+$`) before use in a path. The CLI validator reads files and reports errors without leaking
    sensitive data.
  </security-check>

  <test-quality result="pass">
    The new schema tests map directly to AC-1's validation clause, asserting both the success path (exit 0,
    "Valid") and failure paths (exit 1, "Validation failed") with concrete valid/invalid fixtures — not just
    "no error thrown". AC-2/AC-3/AC-4 rest on the pre-existing phase/task schema coverage plus the
    instruction rewrites; the SKILL.md files are prose instructions and are not unit-testable, so no
    automated-test gap is charged against them.
  </test-quality>

  <scope-check result="pass">
    The task module is `.claude/skills`; the implementation also touched `cli/` (two schemas + resolver +
    tests) and `.claude/hooks/` (two guards). Both are necessary supporting changes, not feature creep: the
    PRD schemas are a direct prerequisite of AC-1 (approved by the user under Q-2), and the hook updates
    prevent the rewritten pipeline from emitting JSON that its own input guard would reject. No unrelated
    refactoring was introduced.
  </scope-check>

  <convention-guards>
    <guard description="No parallel prose Markdown written alongside JSON" result="pass">Each skill
      explicitly forbids writing CLARIFICATIONS.md / PHASE.md / TASK.md.</guard>
    <guard description="Validate every generated JSON at write time" result="pass">All three skills invoke
      the CLI validator immediately after writing and abort on non-zero exit.</guard>
    <guard description="Registry absence fails with a clear message, not a raw file-not-found" result="pass">
      create-tasks and phase-plan STOP with actionable "run nit:init"/"run /nit:clarify" messages.</guard>
    <guard description="Task numbering continues across phases, never resets" result="pass">create-tasks
      states three-digit numbering continues across phases.</guard>
  </convention-guards>

  <findings>
    - [note] The registry files (`.nit/boundaries/modules.json`, `.nit/registry/task-types.json`) are absent
      in this dogfooding repo — expected per DESIGN IP-2, and the skills correctly STOP rather than fail
      obscurely. AC-3/AC-4 were verified via sample task.json validation, which passes.
    - [note] `task.schema.json` does not *require* `targetModule` or `archetype`; the skill guarantees them
      by instruction. Enforcing them in the schema would be a hardening follow-up owned by TASK-001, out of
      scope here.
    - [suggestion] The lean phase/task schemas drop prose scope/DoR/DoD narrative. If richer machine-readable
      planning records are wanted later, extend the schemas as a companion to TASK-017 — as already noted in
      IMPLEMENTATION.md tech debt.
  </findings>

</review>
</content>
