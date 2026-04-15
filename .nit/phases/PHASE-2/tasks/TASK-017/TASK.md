# TASK-017 — Rewrite nit:design and nit:implement for JSON Output

<task>

  <meta>
    <id>TASK-017</id>
    <phase>PHASE-2</phase>
    <title>Rewrite nit:design and nit:implement for JSON Output</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>draft</status>
  </meta>

  <user-story>
    As a specialist agent executing design or implement steps,
    I want nit:design and nit:implement skills to produce JSON step output following step-output.schema.json,
    So that all step artifacts are structured, schema-validated, and consumable by the supervisor state machine.
  </user-story>

  <scope>
    <in-scope>
    - nit:design rewrite: reads input.json from step directory, produces output.json with design-result embedded in step-output format (architecture decisions, component design, interface contracts, file plan)
    - nit:implement rewrite: reads input.json from step directory, produces output.json with implementation-result embedded in step-output format (files changed, implementation notes, test results)
    - Both skills write output.json to their respective step directory (STEP-NNN-design/, STEP-NNN-implement/)
    - Output follows step-output.schema.json with appropriate $defs/$ref for the embedded result type
    - Skills read context from previous step outputs (e.g., implement reads design output)
    </in-scope>
    <out-of-scope>
    - nit:review and nit:qa step output rewrites (PHASE-3)
    - Validation hook execution (TASK-010) — the skills produce output, validation runs separately
    - State tracking updates (TASK-007 supervisor handles that)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a task at the design step with input.json containing task requirements and analysis context,
      When nit:design completes,
      Then STEP-NNN-design/output.json exists, contains a design-result with architecture decisions and component design, and validates against step-output.schema.json.
    </criterion>
    <criterion id="AC-2">
      Given a task at the implement step with input.json containing design output and task requirements,
      When nit:implement completes,
      Then STEP-NNN-implement/output.json exists, contains an implementation-result with files changed and implementation notes, and validates against step-output.schema.json.
    </criterion>
    <criterion id="AC-3">
      Given the nit:implement skill executing,
      When it reads context from previous steps,
      Then it loads design output from STEP-NNN-design/output.json and uses it to inform implementation decisions.
    </criterion>
    <criterion id="AC-4">
      Given either nit:design or nit:implement producing output,
      When the output contains adrCandidates (architectural decisions worth recording),
      Then the adrCandidates array is included in the step-output.json per the adr-candidate $def in the schema.
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
    TASK-001 in PHASE-2 (step-output.schema.json with $defs for design-result and implementation-result)
  </dependencies>

  <open-questions>
    None
  </open-questions>

</task>
