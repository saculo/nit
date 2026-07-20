# Steps — TASK-019: Archetype Definitions with Inheritance

<steps>

  <implementation-steps>
    <step id="S-1" status="done">
      <description>Update archetype.schema.json to match PRD structure: steps with id/role/approval fields, rejectionRouting as step-to-step map, conditional requirement of steps (required only when abstract or no extends)</description>
      <deviation></deviation>
    </step>
    <step id="S-2" status="done">
      <description>Create the 7 archetype JSON files in cli/archetypes/ matching PRD Section 4.1.2 exactly: base.json (abstract), backend-feature.json, frontend-feature.json, infra-change.json, bugfix.json, architecture-decision.json, cross-module-change.json</description>
      <deviation></deviation>
    </step>
    <step id="S-3" status="done">
      <description>Implement the archetype resolver module (src/archetype-resolver.ts) with pure functions: loadArchetype, validateArchetype, resolveArchetype, replacePlaceholders. Enforce abstract rejection and single-level inheritance constraints.</description>
      <deviation></deviation>
    </step>
    <step id="S-4" status="done">
      <description>Implement the archetype CLI command (src/commands/archetype.ts) and register it in cli.ts</description>
      <deviation></deviation>
    </step>
    <step id="S-5" status="done">
      <description>Write unit tests for the archetype resolver covering: inheritance resolution, override ordering (removeSteps, step mods, addSteps), placeholder replacement, abstract rejection, single-level inheritance enforcement</description>
      <deviation></deviation>
    </step>
    <step id="S-6" status="done">
      <description>Write integration tests for the archetype CLI command covering all 5 acceptance criteria scenarios</description>
      <deviation></deviation>
    </step>
    <step id="S-7" status="done">
      <description>Run full test suite and verify all tests pass</description>
      <deviation></deviation>
    </step>
  </implementation-steps>

  <acceptance-criteria-check>
    <criterion id="AC-1" status="done">
      <description>Given the base.json archetype, When `npx nit archetype base` is executed, Then the command rejects the request because base is marked abstract and cannot be used directly.</description>
      <verification>Integration test "rejects abstract base archetype with exit code 1" passes: exit code 1, stderr contains "abstract" and "cannot be used directly". Also verified manually via CLI.</verification>
    </criterion>
    <criterion id="AC-2" status="done">
      <description>Given the backend-feature.json archetype that extends base, When `npx nit archetype backend-feature` is executed, Then the output is a flat JSON step list with 5 steps (analyze, design, implement, review, qa) where the implement step has role "backend-engineer" replacing the $engineer placeholder.</description>
      <verification>Integration test "resolves backend-feature with 5 steps and backend-engineer role" passes: 5 steps in correct order, implement.role = "backend-engineer". Also verified manually via CLI.</verification>
    </criterion>
    <criterion id="AC-3" status="done">
      <description>Given the bugfix.json archetype that removes analyze and sets design approval to false, When `npx nit archetype bugfix` is executed, Then the output is a flat JSON step list with 4 steps (design, implement, review, qa) where design has approval=false and engineerRole uses $detect placeholder.</description>
      <verification>Integration test "resolves bugfix with 4 steps, design approval false, $detect role" passes: 4 steps, design.approval=false, engineerRole="$detect", implement.role="$detect". Also verified manually via CLI.</verification>
    </criterion>
    <criterion id="AC-4" status="done">
      <description>Given the cross-module-change.json archetype that adds a boundary-check step after implement, When `npx nit archetype cross-module-change` is executed, Then the output is a flat JSON step list with 6 steps in order: analyze, design, implement, boundary-check, review, qa.</description>
      <verification>Integration test "resolves cross-module-change with 6 steps including boundary-check after implement" passes: 6 steps in exact order. Also verified manually via CLI.</verification>
    </criterion>
    <criterion id="AC-5" status="done">
      <description>Given an archetype file with extends pointing to a non-abstract archetype, When inheritance resolution is attempted with more than one level of depth, Then the resolver rejects it with an error indicating single-level inheritance only.</description>
      <verification>Integration test "resolver rejects multi-level inheritance" passes: creates a temp archetype extending backend-feature (which extends base), resolveArchetype rejects with "Single-level inheritance only" error.</verification>
    </criterion>
  </acceptance-criteria-check>

  <dod-check>
    <item id="DOD-1" status="done">All acceptance criteria passed</item>
    <item id="DOD-2" status="done">Tests written and passed — 44 tests across 4 files, 0 failures</item>
    <item id="DOD-3" status="done">Code review passed</item>
    <item id="DOD-4" status="done">No critical tech debt introduced</item>
  </dod-check>

</steps>
