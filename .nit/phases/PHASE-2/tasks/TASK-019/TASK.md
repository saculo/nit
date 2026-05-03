# TASK-019 — Archetype Definitions with Inheritance

<task>

  <meta>
    <id>TASK-019</id>
    <phase>PHASE-2</phase>
    <title>Archetype Definitions with Inheritance</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>done</status>
  </meta>

  <user-story>
    As a nit developer running the deterministic supervisor,
    I want a set of archetype JSON files (abstract base + concrete archetypes) and a resolver that merges parent steps with child overrides into a flat step list,
    So that the supervisor can dispatch a known sequence of steps for any task type without runtime inheritance logic.
  </user-story>

  <scope>
    <in-scope>
    - 7 archetype JSON files in `cli/archetypes/`: 1 abstract `base.json` + 6 concrete (backend-feature, frontend-feature, infra-change, bugfix, architecture-decision, cross-module-change)
    - Pure-function resolver: load archetype, validate against `archetype.schema.json`, resolve single-level inheritance, apply override order (removeSteps → step modifications → addSteps), replace `$engineer` placeholder with `engineerRole`
    - CLI command `nit archetype <name>` outputting flat resolved step list as JSON
    - Enforce abstract rejection (cannot use abstract archetype directly) and single-level inheritance only
    - Preserve `$detect` placeholder in output (runtime resolution is supervisor's responsibility)
    </in-scope>
    <out-of-scope>
    - Runtime `$detect` resolution (TASK-015 supervisor)
    - ajv instance caching across invocations (deferred per TASK-009 review)
    - User-defined archetypes (PHASE-4)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the CLI package archetypes/ directory,
      When inspected,
      Then it contains base.json (abstract) and 6 concrete archetype JSON files all valid against archetype.schema.json.
    </criterion>
    <criterion id="AC-2">
      Given a concrete archetype name,
      When `npx nit archetype <name>` is executed,
      Then the command outputs a flat JSON object containing the resolved steps array, engineerRole, and rejectionRouting, with `$engineer` replaced by engineerRole and `$detect` preserved.
    </criterion>
    <criterion id="AC-3">
      Given the abstract base archetype,
      When `npx nit archetype base` is executed,
      Then the command exits with a non-zero code and rejects use of the abstract archetype.
    </criterion>
    <criterion id="AC-4">
      Given an archetype whose parent itself extends another archetype,
      When the resolver runs,
      Then it rejects multi-level inheritance with a clear error.
    </criterion>
    <criterion id="AC-5">
      Given a child archetype with overrides,
      When resolved,
      Then removeSteps is applied first, then step property modifications, then addSteps, producing a deterministic merged step list.
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
    - TASK-009 (CLI package foundation, archetype.schema.json, validate infrastructure)
  </dependencies>

  <open-questions>
    None
  </open-questions>

  <notes>
    Backfilled task record. The work was implemented and merged via PR #11 (commit d9b9584) before this TASK.md existed; the design/implementation/review artifacts were originally written into TASK-010/ by mistake and have been relocated here to align with the canonical task slot.
  </notes>

</task>
