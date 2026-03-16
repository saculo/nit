# Task 4 — Brownfield Analysis Skills

<task>

  <meta>
    <id>TASK-004</id>
    <phase>PHASE-1</phase>
    <title>Brownfield Analysis Skills</title>
    <type>devops</type>
    <module>.nit/skills</module>
    <status>done</status>
  </meta>

  <user-story>
    As a nit workflow user working on an existing codebase,
    I want brownfield analysis skills,
    So that the system can generate an initial-state snapshot of my repository before planning begins.
  </user-story>

  <scope>
    <in-scope>
    - nit:brownfield-orchestrate — orchestrator coordinating architect and engineer agents with human review gates
    - nit:brownfield-analyze — architect-level analysis (module discovery, ecosystem detection, architecture patterns)
    - nit:brownfield-snapshot — engineer-level analysis (code conventions, hot spots, tech debt, toolchain)
    - Two-agent flow: architect writes initial-state.md → human review → engineer adds sections → human review
    - Re-dispatch with feedback on rejection
    - Initial-state template with XML structure
    </in-scope>
    <out-of-scope>
    - CLI-based initial-state refresh command
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the .nit/skills/ directory,
      When listing brownfield skill directories,
      Then brownfield-initial-orchestration, architect-initial-analysis, and engineer-initial-analysis exist with SKILL.md files.
    </criterion>
    <criterion id="AC-2">
      Given the nit:brownfield-orchestrate skill,
      When reading its flow,
      Then it follows a 6-step process: dispatch architect → present to human → human review → dispatch engineer → present to human → human review.
    </criterion>
    <criterion id="AC-3">
      Given the nit:brownfield-analyze skill,
      When invoked on a repository with code,
      Then it produces .nit/project/initial-state.md with module-index, per-module architecture analysis, and system-level analysis sections.
    </criterion>
    <criterion id="AC-4">
      Given the nit:brownfield-snapshot skill,
      When invoked after the architect has written initial-state.md,
      Then it adds code-conventions, hot-spots, tech-debt, and toolchain sections per module plus a system-wide tech-debt-summary.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - All 3 brownfield skill SKILL.md files have nit:* namespace frontmatter
  - Initial-state template examples exist
  </definition-of-done>

  <dependencies>
    task-1 in phase-1
  </dependencies>

  <open-questions>
  </open-questions>

</task>
