# Steps — Task 1: CLI Package Foundation and JSON Schemas

<steps>

  <implementation-steps>
    <step id="S-1" status="done">
      <description>Scaffold @nit/cli package: create cli/ directory with package.json (name, version, bin entry, ajv dependency) and tsconfig.json</description>
      <deviation></deviation>
    </step>
    <step id="S-2" status="done">
      <description>Create schema-resolver.ts: module that maps schema type names to file paths and lists available types</description>
      <deviation></deviation>
    </step>
    <step id="S-3" status="done">
      <description>Create all 20 JSON Schema 2020-12 files in cli/schemas/ (workspace, supervisor, phase, task, task-state, step-input, step-output with $defs, approval, validation-result, routing, modules, dependency-rules, archetype, role-routing, adr-triggers, validation-config, task-types, roles, skills-registry, artifact-types)</description>
      <deviation></deviation>
    </step>
    <step id="S-4" status="done">
      <description>Create validate command (src/commands/validate.ts): parse args, resolve schema, validate file with ajv 2020-12, output structured errors</description>
      <deviation></deviation>
    </step>
    <step id="S-5" status="done">
      <description>Create CLI entry point (src/cli.ts): shebang, parse subcommands, route to validate command</description>
      <deviation></deviation>
    </step>
    <step id="S-6" status="done">
      <description>Install dependencies via bun and verify the package builds/runs</description>
      <deviation></deviation>
    </step>
    <step id="S-7" status="done">
      <description>Write tests for schema-resolver, validate command (valid input, invalid input, unknown schema type)</description>
      <deviation></deviation>
    </step>
    <step id="S-8" status="done">
      <description>Run all tests and verify all pass</description>
      <deviation>11 tests across 2 files, all passing</deviation>
    </step>
  </implementation-steps>

  <acceptance-criteria-check>
    <criterion id="AC-1" status="done">
      <description>Given the @nit/cli package is scaffolded, When a developer inspects the package structure, Then package.json exists with a bin entry for "nit", src/ directory exists, and schemas/ directory contains all ~13 standalone .schema.json files.</description>
      <verification>package.json has bin.nit pointing to src/cli.ts, src/ contains cli.ts, commands/validate.ts, schema-resolver.ts. schemas/ contains 20 .schema.json files.</verification>
    </criterion>
    <criterion id="AC-2" status="done">
      <description>Given a valid JSON artifact file conforming to workspace.schema.json, When `npx nit validate --schema workspace artifact.json` is executed, Then the command exits with code 0 and outputs no errors.</description>
      <verification>Tested via bun run src/cli.ts validate --schema workspace with valid JSON. Exit code 0, output "Valid". Also covered by validate.test.ts.</verification>
    </criterion>
    <criterion id="AC-3" status="done">
      <description>Given an invalid JSON artifact file missing required fields, When `npx nit validate --schema workspace artifact.json` is executed, Then the command exits with a non-zero code and outputs structured error messages identifying the validation failures.</description>
      <verification>Tested with JSON missing mode and nitVersion. Exit code 1, structured error output showing missing fields. Covered by validate.test.ts.</verification>
    </criterion>
    <criterion id="AC-4" status="done">
      <description>Given the step-output.schema.json file, When its contents are inspected, Then it contains $defs for embedded types (analysis-result, design-result, implementation-result, review-result, qa-result, adr-candidate) referenced via $ref (per U-8).</description>
      <verification>Verified programmatically: $defs contains all 6 types, result property uses oneOf with $ref to 5 result types, adrCandidates uses $ref to adr-candidate.</verification>
    </criterion>
    <criterion id="AC-5" status="done">
      <description>Given any of the ~13 schema files, When validated against the JSON Schema meta-schema, Then each schema file is itself valid JSON Schema (draft-07 or later).</description>
      <verification>All 20 schemas compile successfully with Ajv2020. Each has $schema set to "https://json-schema.org/draft/2020-12/schema".</verification>
    </criterion>
  </acceptance-criteria-check>

  <dod-check>
    <item id="DOD-1" status="done">All acceptance criteria passed</item>
    <item id="DOD-2" status="done">Tests written and passed</item>
    <item id="DOD-3" status="done">Code review passed</item>
    <item id="DOD-4" status="done">No critical tech debt introduced</item>
  </dod-check>

</steps>
