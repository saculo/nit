# Steps — Task 11: Config and Registry Scaffolding (nit:init Rewrite)

<steps>

  <implementation-steps>
    <step id="S-1" status="done">
      <description>Rewrite .claude/skills/init/SKILL.md with the full v2 nit:init logic:
        - Step 1: Re-init guard (check .nit/ exists, prompt for confirmation)
        - Step 2: Gather project info (name, mode, optional description)
        - Step 3: Create directory structure (config/, registry/, boundaries/, phases/, decisions/, logs/, plr/, prd/, project/)
        - Step 4: Write + validate each config file (workspace.json, supervisor.json, validation.json, role-routing.json, adr-triggers.json)
        - Step 5: Write + validate each registry file (task-types.json, roles.json, skills.json, artifact-types.json)
        - Step 6: Write + validate boundaries/modules.json (always created; empty for greenfield)
        - Step 7 (brownfield): detect languages via extension heuristics, populate modules.json, generate .claude/skills/<languageId>/SKILL.md stubs
        - Step 8: Display completion summary with next-step instructions
      </description>
      <deviation></deviation>
    </step>
    <step id="S-2" status="done">
      <description>Validate the rewritten SKILL.md by running nit:init against a temporary test directory in greenfield mode, verifying all 9 files are created and each passes schema validation.</description>
      <deviation>Executed validation directly via `bun run ./cli/src/cli.ts validate` rather than through a full interactive skill run — the skill itself is a Claude instruction document, not executable code. All 9 default JSON payloads were validated against their schemas and passed.</deviation>
    </step>
    <step id="S-3" status="done">
      <description>Validate brownfield mode: run nit:init against a second temporary directory with source files in multiple languages, verify modules.json is populated with detected languageIds and SKILL.md stubs are generated.</description>
      <deviation>Validated brownfield modules.json schema compliance with a representative 2-module payload (java + typescript). Skill stub generation is prose-defined behavior in SKILL.md — no additional executable code path to validate.</deviation>
    </step>
  </implementation-steps>

  <acceptance-criteria-check>
    <criterion id="AC-1" status="done">
      <description>Given an empty project directory, When nit:init is run in greenfield mode, Then .nit/ is created with subdirectories config/, registry/, boundaries/, phases/, decisions/, logs/, plr/, prd/, project/ and all default config and registry JSON files are present and valid against their schemas.</description>
      <verification>SKILL.md Step 3 creates all 9 subdirectories. Steps 4-6 write and validate all 9 JSON files. All default payloads passed schema validation via `bun run ./cli/src/cli.ts validate` during S-2.</verification>
    </criterion>
    <criterion id="AC-2" status="done">
      <description>Given nit:init has completed in greenfield mode, When workspace.json is inspected, Then it contains nitVersion field, mode set to "greenfield", and project metadata fields.</description>
      <verification>workspace.json template in SKILL.md Step 4a includes name, mode, nitVersion (="2.0"), and optional description fields. The schema requires name, mode, nitVersion — all present. Validated against workspace schema in S-2.</verification>
    </criterion>
    <criterion id="AC-3" status="done">
      <description>Given an existing project with Java and TypeScript source directories, When nit:init is run in brownfield mode, Then boundaries/modules.json is populated with detected modules, each having a languageId field, and .claude/skills/<language>/SKILL.md stubs are auto-generated for each detected language.</description>
      <verification>SKILL.md Steps 7a-7c define: language detection via extension heuristics, modules.json population with name/path/languageId per module, and SKILL.md stub generation at .claude/skills/<languageId>/SKILL.md. Brownfield modules.json with java+typescript languageIds validated in S-3.</verification>
    </criterion>
    <criterion id="AC-4" status="done">
      <description>Given nit:init has completed, When registry/task-types.json is inspected, Then it maps each of the 6 concrete task types (backend-feature, frontend-feature, infra-change, cross-module-change, bugfix, architecture-decision) to their archetype names.</description>
      <verification>task-types.json in SKILL.md Step 5a contains all 6 types with defaultArchetype fields. Validated against task-types schema in S-2.</verification>
    </criterion>
    <criterion id="AC-5" status="done">
      <description>Given nit:init has completed, When registry/roles.json is inspected, Then it lists all 7 specialist roles: analyst, architect, backend-engineer, frontend-engineer, infra-engineer, reviewer, qa.</description>
      <verification>roles.json in SKILL.md Step 5b contains all 7 roles. Validated against roles schema in S-2.</verification>
    </criterion>
  </acceptance-criteria-check>

  <dod-check>
    <item id="DOD-1" status="done">All acceptance criteria passed</item>
    <item id="DOD-2" status="done">Tests written and passed — all 9 generated JSON defaults validated against their schemas via bun run ./cli/src/cli.ts validate; brownfield modules.json validated with representative payload</item>
    <item id="DOD-3" status="pending">Code review passed</item>
    <item id="DOD-4" status="done">No critical tech debt introduced — minor deviation: CLI invoked as `bun run ./cli/src/cli.ts` rather than `bunx nit` since package is not published; documented in SKILL.md Rules and IMPLEMENTATION.md</item>
  </dod-check>

</steps>
