# TASK-011 — Config and Registry Scaffolding (nit:init Rewrite)

<task>

  <meta>
    <id>TASK-011</id>
    <phase>PHASE-2</phase>
    <title>Config and Registry Scaffolding (nit:init Rewrite)</title>
    <type>devops</type>
    <module>.nit</module>
    <status>draft</status>
  </meta>

  <user-story>
    As a user starting a new or existing project with nit v2,
    I want `nit:init` to scaffold the complete v2 .nit/ directory structure with default config and registry files,
    So that all downstream skills and the supervisor have the required project state files in place.
  </user-story>

  <scope>
    <in-scope>
    - Rewrite nit:init skill to scaffold v2 .nit/ directory: config/, registry/, boundaries/, phases/, decisions/, logs/, plr/, prd/, project/
    - Create default config files: workspace.json (with nitVersion field, mode greenfield/brownfield per U-4), supervisor.json (maxReopenCount=3 per U-7), validation.json, role-routing.json, adr-triggers.json
    - Create default registry files: task-types.json (with archetype mapping for all 6 concrete types), roles.json (7 roles per 4.1.9), skills.json, artifact-types.json (fixed ~20 types per Section 6)
    - Greenfield mode: no brownfield scan, modules registered manually via init prompts, empty modules.json
    - Brownfield mode: trigger brownfield scan, auto-populate boundaries/modules.json with detected modules, language auto-detection writing languageId, auto-generate .claude/skills/<language>/SKILL.md stubs (per R-6)
    - All generated files validated against their respective schemas from TASK-001
    </in-scope>
    <out-of-scope>
    - CLI install command (PHASE-4) — nit:init is a Claude Code skill, not a CLI command
    - Custom skill creation via nit:add-skill (PHASE-4)
    - Dependency-rules.json population (PHASE-3 boundary enforcement)
    - Agent file placement (TASK-004)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given an empty project directory,
      When nit:init is run in greenfield mode,
      Then .nit/ is created with subdirectories config/, registry/, boundaries/, phases/, decisions/, logs/, plr/, prd/, project/ and all default config and registry JSON files are present and valid against their schemas.
    </criterion>
    <criterion id="AC-2">
      Given nit:init has completed in greenfield mode,
      When workspace.json is inspected,
      Then it contains nitVersion field, mode set to "greenfield", and project metadata fields.
    </criterion>
    <criterion id="AC-3">
      Given an existing project with Java and TypeScript source directories,
      When nit:init is run in brownfield mode,
      Then boundaries/modules.json is populated with detected modules, each having a languageId field, and .claude/skills/<language>/SKILL.md stubs are auto-generated for each detected language.
    </criterion>
    <criterion id="AC-4">
      Given nit:init has completed,
      When registry/task-types.json is inspected,
      Then it maps each of the 6 concrete task types (backend-feature, frontend-feature, infra-change, cross-module-change, bugfix, architecture-decision) to their archetype names.
    </criterion>
    <criterion id="AC-5">
      Given nit:init has completed,
      When registry/roles.json is inspected,
      Then it lists all 7 specialist roles: analyst, architect, backend-engineer, frontend-engineer, infra-engineer, reviewer, qa.
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
    TASK-001 in PHASE-2 (JSON schemas must exist for validating generated config/registry files)
  </dependencies>

  <open-questions>
    <question id="Q-1">Should nit:init preserve any v1 .nit/ artifacts or do a clean scaffold (per A-2 v1 is fully replaced)?</question>
  </open-questions>

</task>
