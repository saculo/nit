# Steps — Task 13: Rewrite nit:clarify, nit:phases, nit:tasks for JSON Output

<steps>

  <implementation-steps>
    <step id="S-1" status="done">
      <description>Add prd-summary.schema.json and glossary.schema.json to cli/schemas/, matching the draft-2020-12 style, $id convention, and additionalProperties:false pattern of the existing schemas. (Resolves DESIGN Q-2, per user decision to include schemas in this task.)</description>
      <deviation></deviation>
    </step>
    <step id="S-2" status="done">
      <description>Register "prd-summary" and "glossary" schema types in cli/src/schema-resolver.ts SCHEMA_MAP so `nit validate --schema prd-summary|glossary` resolves them.</description>
      <deviation></deviation>
    </step>
    <step id="S-3" status="done">
      <description>Add bun tests + fixtures: valid and invalid prd-summary.json and glossary.json validated through the CLI (mirrors tests/validate.test.ts); schema-resolver test already asserts every registered type resolves to an existing file.</description>
      <deviation></deviation>
    </step>
    <step id="S-4" status="done">
      <description>Rewrite .claude/skills/clarify/SKILL.md: keep the interactive clarification flow, but persist prd/source.md (verbatim PRD copy), prd/summary.json, and prd/glossary.json instead of CLARIFICATIONS.md; validate each JSON at write time (KD-1, KD-3).</description>
      <deviation>CLI invoked as `bun run ./cli/src/cli.ts validate` (the convention the init skill already uses), not a `nit` binary on PATH.</deviation>
    </step>
    <step id="S-5" status="done">
      <description>Rewrite .claude/skills/phase-plan/SKILL.md: read prd/summary.json for clarified input; keep interactive proposal/approval; persist .nit/phases/PHASE-N/phase.json (not PHASE.md); validate against phase schema (AC-2).</description>
      <deviation>phase.schema.json is lean (id/title/milestone/status/businessValue, additionalProperties:false), so per-phase scope/draft-tasks/success-criteria are no longer persisted — noted as tech debt.</deviation>
    </step>
    <step id="S-6" status="done">
      <description>Rewrite .claude/skills/create-tasks/SKILL.md: read phase.json; read .nit/boundaries/modules.json (targetModule) and .nit/registry/task-types.json (archetype default); analyst proposes an archetype id from cli/archetypes/; persist task.json with targetModule + archetype; validate against task schema; fail clearly if registry absent (AC-3, AC-4, KD-4, KD-5).</description>
      <deviation>Canonical registry paths confirmed against the init skill: modules.json → .nit/boundaries/, task-types.json → .nit/registry/ (design said "modules.json" generically). task.schema.json is lean, so user-story/scope/DoR/DoD narrative is not persisted (acceptanceCriteria is the durable contract) — tech debt.</deviation>
    </step>
    <step id="S-7" status="done">
      <description>Update input hooks to match new artifacts: validate-phases.sh checks prd/summary.json (JSON) instead of CLARIFICATIONS.md; validate-tasks.sh checks phase.json instead of PHASE.md. validate-clarify.sh unchanged (still only checks the PRD file exists).</description>
      <deviation>Touches .claude/hooks (design said work was confined to .claude/skills); necessary so the rewritten pipeline's guardrails match the new JSON inputs.</deviation>
    </step>
    <step id="S-8" status="done">
      <description>Run the cli test suite (bun test) and confirm green; validate sample prd/summary.json, glossary.json, phase.json, task.json through the actual CLI, and exercise both rewritten hooks across pass/fail cases.</description>
      <deviation></deviation>
    </step>
  </implementation-steps>

  <acceptance-criteria-check>
    <criterion id="AC-1" status="done">
      <description>Given a user running nit:clarify with a PRD document, When the interactive clarification completes, Then prd/summary.json, prd/glossary.json, and prd/source.md exist under .nit/ and the JSON files validate against their schemas.</description>
      <verification>clarify/SKILL.md now copies the PRD to prd/source.md, writes prd/summary.json + prd/glossary.json, and validates both via the CLI before confirming completion. New prd-summary/glossary schemas added and registered; sample summary.json + glossary.json return "Valid" through `bun run ./cli/src/cli.ts validate`.</verification>
    </criterion>
    <criterion id="AC-2" status="done">
      <description>Given a user running nit:phases after clarification, When the interactive phase proposal is approved, Then .nit/phases/PHASE-NNN/phase.json is created (not PHASE.md) and validates against phase.schema.json.</description>
      <verification>phase-plan/SKILL.md now persists phase.json (no PHASE.md) and validates against the phase schema; sample phase.json returns "Valid" through the CLI.</verification>
    </criterion>
    <criterion id="AC-3" status="done">
      <description>Given a user running nit:tasks for a phase, When a task is approved, Then .nit/phases/PHASE-NNN/tasks/TASK-NNN/task.json is created with a targetModule field referencing a module from modules.json.</description>
      <verification>create-tasks/SKILL.md now writes task.json with a targetModule constrained to names in .nit/boundaries/modules.json, and validates against the task schema; sample task.json returns "Valid" through the CLI.</verification>
    </criterion>
    <criterion id="AC-4" status="done">
      <description>Given a task being created via nit:tasks, When the task targets a module with a known type, Then the task.json includes an archetype field proposed by the analyst based on the task description and target module type.</description>
      <verification>create-tasks/SKILL.md adds an Archetype Proposal step: the analyst reads defaultArchetype from .nit/registry/task-types.json, refines by task description, and records a concrete cli/archetypes/ id in task.json.archetype; sample task.json with archetype validates.</verification>
    </criterion>
  </acceptance-criteria-check>

  <dod-check>
    <item id="DOD-1" status="done">All acceptance criteria passed</item>
    <item id="DOD-2" status="done">Tests written and passed (48 pass / 0 fail; 4 new schema tests)</item>
    <item id="DOD-3" status="done">Code review passed</item>
    <item id="DOD-4" status="done">No critical tech debt introduced (two lean-schema limitations noted as non-critical follow-ups)</item>
  </dod-check>

</steps>
