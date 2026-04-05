# TASK-010 — Archetype Definitions with Inheritance

<task>

  <meta>
    <id>TASK-010</id>
    <phase>PHASE-2</phase>
    <title>Archetype Definitions with Inheritance</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>done</status>
  </meta>

  <user-story>
    As a nit supervisor,
    I want archetype JSON files defining step sequences with single-level inheritance,
    So that workflow sequences are data-driven and new task types can inherit from a common base without duplication.
  </user-story>

  <scope>
    <in-scope>
    - base.json (abstract parent archetype) with default 5-step sequence (analyze, design, implement, review, qa), role assignments, approval flags, and rejection routing
    - 6 concrete archetypes inside CLI package (archetypes/): backend-feature, frontend-feature, infra-change, cross-module-change, bugfix, architecture-decision
    - Each concrete archetype uses extends, engineerRole, and overrides (removeSteps, addSteps, step modifications) as defined in PRD Section 4.1.2
    - Inheritance resolver logic: load parent, merge overrides, replace $engineer and $detect placeholders, produce flat step list
    - Single-level inheritance constraint enforced (per R-4)
    - CLI command: `npx nit archetype <name>` that resolves inheritance and returns the flat step list as JSON
    - All archetype files validated against archetype.schema.json from TASK-001
    </in-scope>
    <out-of-scope>
    - Multi-level inheritance
    - User-defined custom archetypes (not in v2 scope)
    - Runtime $detect resolution (that is the supervisor's responsibility in TASK-007)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the base.json archetype,
      When `npx nit archetype base` is executed,
      Then the command rejects the request because base is marked abstract and cannot be used directly.
    </criterion>
    <criterion id="AC-2">
      Given the backend-feature.json archetype that extends base,
      When `npx nit archetype backend-feature` is executed,
      Then the output is a flat JSON step list with 5 steps (analyze, design, implement, review, qa) where the implement step has role "backend-engineer" replacing the $engineer placeholder.
    </criterion>
    <criterion id="AC-3">
      Given the bugfix.json archetype that removes analyze and sets design approval to false,
      When `npx nit archetype bugfix` is executed,
      Then the output is a flat JSON step list with 4 steps (design, implement, review, qa) where design has approval=false and engineerRole uses $detect placeholder.
    </criterion>
    <criterion id="AC-4">
      Given the cross-module-change.json archetype that adds a boundary-check step after implement,
      When `npx nit archetype cross-module-change` is executed,
      Then the output is a flat JSON step list with 6 steps in order: analyze, design, implement, boundary-check, review, qa.
    </criterion>
    <criterion id="AC-5">
      Given an archetype file with extends pointing to a non-abstract archetype,
      When inheritance resolution is attempted with more than one level of depth,
      Then the resolver rejects it with an error indicating single-level inheritance only.
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
    TASK-001 in PHASE-2 (archetype.schema.json must exist for validation)
  </dependencies>

  <open-questions>
    None
  </open-questions>

</task>
