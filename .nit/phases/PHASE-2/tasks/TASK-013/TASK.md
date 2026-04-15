# TASK-013 — Rewrite nit:clarify, nit:phases, nit:tasks for JSON Output

<task>

  <meta>
    <id>TASK-013</id>
    <phase>PHASE-2</phase>
    <title>Rewrite nit:clarify, nit:phases, nit:tasks for JSON Output</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>draft</status>
  </meta>

  <user-story>
    As a user running the nit planning pipeline,
    I want nit:clarify, nit:phases, and nit:tasks to produce JSON output files while preserving their interactive flows,
    So that downstream supervisor and skill composition can consume structured data instead of parsing Markdown.
  </user-story>

  <scope>
    <in-scope>
    - nit:clarify rewrite: interactive clarification flow preserved (per U-5), additionally produces prd/summary.json and prd/glossary.json, copies original PRD to prd/source.md
    - nit:phases rewrite: interactive proposal/approval flow preserved (per U-10), produces phase.json instead of PHASE.md
    - nit:tasks rewrite: interactive proposal/approval flow preserved (per U-10), produces task.json with targetModule field (per U-2), analyst proposes archetype (per U-11)
    - All JSON outputs validated against their respective schemas from TASK-001
    </in-scope>
    <out-of-scope>
    - nit:analyze step skill (TASK-008) — distinct from nit:tasks archetype proposal
    - Phase and task state tracking via state.json (TASK-007)
    - nit:phase-summary rewrite (PHASE-3)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a user running nit:clarify with a PRD document,
      When the interactive clarification completes,
      Then prd/summary.json, prd/glossary.json, and prd/source.md exist under .nit/ and the JSON files validate against their schemas.
    </criterion>
    <criterion id="AC-2">
      Given a user running nit:phases after clarification,
      When the interactive phase proposal is approved,
      Then .nit/phases/PHASE-NNN/phase.json is created (not PHASE.md) and validates against phase.schema.json.
    </criterion>
    <criterion id="AC-3">
      Given a user running nit:tasks for a phase,
      When a task is approved,
      Then .nit/phases/PHASE-NNN/tasks/TASK-NNN/task.json is created with a targetModule field referencing a module from modules.json.
    </criterion>
    <criterion id="AC-4">
      Given a task being created via nit:tasks,
      When the task targets a module with a known type,
      Then the task.json includes an archetype field proposed by the analyst based on the task description and target module type.
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
    TASK-001 in PHASE-2 (schemas for phase, task, prd-summary, glossary)
    TASK-003 in PHASE-2 (v2 .nit/ directory structure and modules.json must exist)
  </dependencies>

  <open-questions>
    <question id="Q-1">Should nit:tasks create an initial state.json for the task, or does that happen when nit:continue first runs?</question>
  </open-questions>

</task>
