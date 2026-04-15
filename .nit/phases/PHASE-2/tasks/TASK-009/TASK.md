# TASK-009 — CLI Package Foundation and JSON Schemas

<task>

  <meta>
    <id>TASK-009</id>
    <phase>PHASE-2</phase>
    <title>CLI Package Foundation and JSON Schemas</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>done</status>
  </meta>

  <user-story>
    As a nit developer,
    I want a scaffolded @nit/cli package containing all JSON Schema files and a validate command,
    So that all downstream tasks can reference schemas for validation and the CLI package structure is established.
  </user-story>

  <scope>
    <in-scope>
    - Scaffold @nit/cli package structure (package.json with bin entry, src/, schemas/)
    - All ~13 standalone JSON Schema files inside the package (schemas/): workspace, phase, task, task-state, step-input, step-output (with $defs for analysis-result, design-result, implementation-result, review-result, qa-result, adr-candidate), approval, validation, routing, modules, dependency-rules, archetype, supervisor, role-routing, adr-triggers, task-types, roles, skills, artifact-types
    - Schema validation command: `npx nit validate --schema <type> <file>` using check-jsonschema or ajv-cli internally
    - Support both bunx and npx invocation (per R-5)
    </in-scope>
    <out-of-scope>
    - Archetype JSON files (TASK-002)
    - Validation hook scripts (TASK-010)
    - CLI install/update commands (PHASE-4)
    - Publishing to npm registry
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the @nit/cli package is scaffolded,
      When a developer inspects the package structure,
      Then package.json exists with a bin entry for "nit", src/ directory exists, and schemas/ directory contains all ~13 standalone .schema.json files.
    </criterion>
    <criterion id="AC-2">
      Given a valid JSON artifact file conforming to workspace.schema.json,
      When `npx nit validate --schema workspace artifact.json` is executed,
      Then the command exits with code 0 and outputs no errors.
    </criterion>
    <criterion id="AC-3">
      Given an invalid JSON artifact file missing required fields,
      When `npx nit validate --schema workspace artifact.json` is executed,
      Then the command exits with a non-zero code and outputs structured error messages identifying the validation failures.
    </criterion>
    <criterion id="AC-4">
      Given the step-output.schema.json file,
      When its contents are inspected,
      Then it contains $defs for embedded types (analysis-result, design-result, implementation-result, review-result, qa-result, adr-candidate) referenced via $ref (per U-8).
    </criterion>
    <criterion id="AC-5">
      Given any of the ~13 schema files,
      When validated against the JSON Schema meta-schema,
      Then each schema file is itself valid JSON Schema (draft-07 or later).
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
    None
  </dependencies>

  <open-questions>
    <question id="Q-1">Which JSON Schema draft version should be used across all schemas (draft-07, 2019-09, 2020-12)?</question>
    <question id="Q-2">Should the validate command use check-jsonschema (Python dependency) or ajv-cli (Node dependency)? The choice affects install requirements.</question>
  </open-questions>

</task>
