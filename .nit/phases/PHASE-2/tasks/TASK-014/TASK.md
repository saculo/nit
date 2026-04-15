# TASK-014 — Skill Composition Engine

<task>

  <meta>
    <id>TASK-014</id>
    <phase>PHASE-2</phase>
    <title>Skill Composition Engine</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>draft</status>
  </meta>

  <user-story>
    As a nit supervisor preparing to dispatch a specialist,
    I want a skill composition engine that resolves the layered skill list for a task and step,
    So that agents receive the correct combination of base, language, custom, step-override, and global skills.
  </user-story>

  <scope>
    <in-scope>
    - Layered skill resolution per PRD Section 9: Layer 1 (base step skill from archetype) + Layer 2 (language skill from modules.json languageId) + Layer 3 (custom skills from modules.json customSkills + stepOverrides + global custom skills from registry/skills.json)
    - Cross-module union resolution: for cross-module-change tasks targeting multiple modules, union of all language + custom skills from all target modules (per U-3)
    - Writes routing.json per task to .nit/phases/PHASE-NNN/tasks/TASK-NNN/routing.json
    - routing.json validated against routing.schema.json from TASK-001
    - Missing skill files (.claude/skills/<name>/SKILL.md) skipped gracefully — no error, agent works with available layers
    - Step-level override support: stepOverrides[currentStep].addSkills merged into skill list
    </in-scope>
    <out-of-scope>
    - nit:resolve-routing and nit:explain-routing commands (PHASE-3)
    - nit:add-skill interactive creation (PHASE-4)
    - Supervisor dispatch logic (TASK-007) — this task only resolves the skill list
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a task targeting a Java module with customSkills ["spring-boot", "ddd"] at the implement step,
      When skill composition is resolved,
      Then routing.json contains skill list: nit:implement, java, spring-boot, ddd (in layer order).
    </criterion>
    <criterion id="AC-2">
      Given a task targeting a Java module with stepOverrides review.addSkills ["security-checklist"] at the review step,
      When skill composition is resolved,
      Then routing.json includes security-checklist in addition to the base, language, and custom skills.
    </criterion>
    <criterion id="AC-3">
      Given a cross-module-change task targeting module A (Java, spring-boot) and module B (TypeScript, nestjs),
      When skill composition is resolved,
      Then routing.json contains the union: base step skill + java + typescript + spring-boot + nestjs.
    </criterion>
    <criterion id="AC-4">
      Given a module with languageId "go" but no .claude/skills/go/SKILL.md file exists,
      When skill composition is resolved,
      Then the missing go language skill is skipped without error and routing.json contains only the available skills.
    </criterion>
    <criterion id="AC-5">
      Given global custom skills ["code-conventions"] in registry/skills.json,
      When skill composition is resolved for any task,
      Then routing.json includes code-conventions in the skill list.
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
    TASK-002 in PHASE-2 (archetype definitions needed to determine base step skill per step)
    TASK-003 in PHASE-2 (modules.json and registry/skills.json must exist with correct structure)
  </dependencies>

  <open-questions>
    None
  </open-questions>

</task>
