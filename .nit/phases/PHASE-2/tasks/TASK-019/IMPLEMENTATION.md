# Implementation — TASK-019: Archetype Definitions with Inheritance

<implementation>

  <summary>
    Implemented the archetype system with single-level inheritance as specified in PRD Section 4.1.2.
    Created 7 archetype JSON files (1 abstract base + 6 concrete) in cli/archetypes/, a pure-function
    resolver module at src/archetype-resolver.ts, and a CLI command at src/commands/archetype.ts
    registered in cli.ts.

    The resolver loads an archetype, validates it against archetype.schema.json using the existing ajv
    infrastructure, resolves single-level inheritance by loading the parent and applying overrides in
    order (removeSteps, step property modifications, addSteps), replaces $engineer placeholders with
    the archetype's engineerRole value (preserving $detect as-is), and returns a flat resolved step list
    with rejection routing metadata.

    The archetype.schema.json was updated to match the PRD's actual structure: steps with id/role/approval
    fields, rejectionRouting as a step-to-step map, overrides with removeSteps/addSteps/steps sections,
    and conditional requirement of steps (only required when extends is absent).
  </summary>

  <files-changed>
    <file action="modified">cli/schemas/archetype.schema.json</file>
    <file action="created">cli/archetypes/base.json</file>
    <file action="created">cli/archetypes/backend-feature.json</file>
    <file action="created">cli/archetypes/frontend-feature.json</file>
    <file action="created">cli/archetypes/infra-change.json</file>
    <file action="created">cli/archetypes/bugfix.json</file>
    <file action="created">cli/archetypes/architecture-decision.json</file>
    <file action="created">cli/archetypes/cross-module-change.json</file>
    <file action="created">cli/src/archetype-resolver.ts</file>
    <file action="created">cli/src/commands/archetype.ts</file>
    <file action="modified">cli/src/cli.ts</file>
    <file action="created">cli/tests/archetype-resolver.test.ts</file>
    <file action="created">cli/tests/archetype-command.test.ts</file>
  </files-changed>

  <deviations>
    The archetype.schema.json from TASK-009 was updated significantly to match the PRD's actual
    archetype structure. The original schema had steps with id/type/role/required/description fields
    and rejectionRouting with targetStep/maxRetries — neither matched the PRD. Updated to use
    id/role/approval for steps, a step-to-step map for rejectionRouting, and proper overrides
    structure. This is a minor deviation (S-1) since the schema needed to reflect the actual data
    model specified in the PRD.
  </deviations>

  <tech-debt>
    None. The ajv instance is created per invocation, which is acceptable for CLI usage.
    The TASK-009 review already noted this as a future optimization for when the supervisor
    calls the resolver in a loop.
  </tech-debt>

  <self-check>
    Final verification summary:
    - AC-1: pass — abstract base archetype rejected with clear error message
    - AC-2: pass — backend-feature resolves to 5 steps with backend-engineer role on implement
    - AC-3: pass — bugfix resolves to 4 steps with design.approval=false and $detect role
    - AC-4: pass — cross-module-change resolves to 6 steps with boundary-check after implement
    - AC-5: pass — multi-level inheritance rejected with "Single-level inheritance only" error
    - DoD items: all done except code review (pending reviewer)
    - Test suite: 44 tests, 0 failures across 4 files
  </self-check>

</implementation>
