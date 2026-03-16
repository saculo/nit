# Task 3 — Orchestration and Utility Skills

<task>

  <meta>
    <id>TASK-003</id>
    <phase>PHASE-1</phase>
    <title>Orchestration and Utility Skills</title>
    <type>devops</type>
    <module>.nit/skills</module>
    <status>done</status>
  </meta>

  <user-story>
    As a nit workflow user,
    I want orchestration and utility skills,
    So that I can run the full pipeline end-to-end, initialize workspaces, and check project status.
  </user-story>

  <scope>
    <in-scope>
    - nit:orchestrate — full pipeline orchestration dispatching agents in sequence with approval gates
    - nit:init — workspace initialization with greenfield/brownfield mode selection, directory creation, config generation
    - nit:status — project status dashboard showing phase/task tree, next step suggestion, available commands
    - Orchestration skill wires review (nit:review) and phase completion (nit:phase-summary) steps
    - Orchestration skill handles rework flow, task splitting, and type-based engineer routing
    - Init skill defers ecosystem detection to nit:implement
    </in-scope>
    <out-of-scope>
    - CLI-based init (interactive Bun CLI)
    - Provider adapter generation during init
    - CLAUDE.md / AGENTS.md auto-generation
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the .nit/skills/ directory,
      When listing skill directories,
      Then e2e-orchestration, init, and status skill directories exist with SKILL.md files.
    </criterion>
    <criterion id="AC-2">
      Given the nit:orchestrate skill,
      When reading its workflow steps,
      Then all pipeline steps are wired: clarify → phases → tasks → design → implement → review → phase-summary.
    </criterion>
    <criterion id="AC-3">
      Given the nit:init skill,
      When invoked in a git repository,
      Then it creates .nit/ directory structure with config/nit.yaml containing the selected mode.
    </criterion>
    <criterion id="AC-4">
      Given the nit:status skill,
      When invoked on an initialized workspace,
      Then it displays phase/task tree with statuses, suggests the next step, and lists all available /nit:* commands including init, phase-summary, and brownfield-orchestrate.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - All 3 skill SKILL.md files created with correct frontmatter
  - Orchestration skill references all pipeline steps without placeholders
  </definition-of-done>

  <dependencies>
    task-2 in phase-1
  </dependencies>

  <open-questions>
  </open-questions>

</task>
