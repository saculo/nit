# Task 2 — Core Pipeline Skills

<task>

  <meta>
    <id>TASK-002</id>
    <phase>PHASE-1</phase>
    <title>Core Pipeline Skills</title>
    <type>devops</type>
    <module>.nit/skills</module>
    <status>done</status>
  </meta>

  <user-story>
    As a nit workflow user,
    I want a skill for each step of the delivery pipeline,
    So that I can invoke each workflow step manually via /nit:* commands or have the orchestrator dispatch them.
  </user-story>

  <scope>
    <in-scope>
    - nit:clarify — PRD analysis and interactive clarification
    - nit:phases — phase planning from PRD + clarifications
    - nit:tasks — task creation for a given phase
    - nit:design — task design with DESIGN.md, ADRs, P3 diagrams
    - nit:implement — common engineer workflow (DoR check, STEPS.md, implementation, IMPLEMENTATION.md)
    - nit:review — 10-step review process producing REVIEW.md with verdict
    - nit:phase-summary — phase completion analysis, PLR creation, SUMMARY.md
    - Each skill has YAML frontmatter with name, description, allowed-tools, and hook configuration
    - Each skill has Step 0 defense-in-depth validation
    - XML-in-Markdown artifact formats for all outputs
    </in-scope>
    <out-of-scope>
    - CLI-based validation (skills use hooks + Step 0 instead)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the .nit/skills/ directory,
      When listing skill directories,
      Then 7 core pipeline skills exist: clarify, phase-plan, create-tasks, design, implement, task-review, phase-summary.
    </criterion>
    <criterion id="AC-2">
      Given any core pipeline skill,
      When reading its SKILL.md frontmatter,
      Then the name field uses the nit:* namespace and the hooks section references a per-skill validation script.
    </criterion>
    <criterion id="AC-3">
      Given the nit:clarify skill,
      When invoked with a PRD path,
      Then it produces .nit/CLARIFICATIONS.md with clarifications, unknowns, risks, and assumptions sections.
    </criterion>
    <criterion id="AC-4">
      Given the nit:review skill,
      When invoked on a task with all artifacts present,
      Then it produces REVIEW.md with a verdict of approved or rework-requested, and updates TASK.md status accordingly.
    </criterion>
    <criterion id="AC-5">
      Given the nit:phase-summary skill,
      When invoked on a completed phase,
      Then it produces SUMMARY.md, creates a PLR in .nit/plr/, and updates PHASE.md status.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - All 7 skill SKILL.md files created with correct frontmatter
  - All artifact output formats documented within each skill
  </definition-of-done>

  <dependencies>
    None
  </dependencies>

  <open-questions>
  </open-questions>

</task>
