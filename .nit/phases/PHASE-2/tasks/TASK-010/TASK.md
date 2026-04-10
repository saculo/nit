# TASK-010 — Validation Hooks, nit:status, and Integration Testing

<task>

  <meta>
    <id>TASK-010</id>
    <phase>PHASE-2</phase>
    <title>Validation Hooks, nit:status, and Integration Testing</title>
    <type>devops</type>
    <module>@nit/cli + .claude/skills</module>
    <status>draft</status>
  </meta>

  <user-story>
    As a user running the nit pipeline end-to-end,
    I want validation hooks that enforce schema correctness as hard guardrails, a rewritten nit:status command reading JSON state, and integration testing proving the full analyze-design-implement flow works,
    So that the v2 system is verified as a working end-to-end pipeline with enforceable validation.
  </user-story>

  <scope>
    <in-scope>
    - Validation hook scripts inside CLI package (hooks/): validate-*.sh scripts that call `npx nit validate` to validate step output against schemas
    - Hooks are the hard guardrail layer — supervisor cannot bypass them (per PRD Section 4.1.6)
    - Hook scripts registered as Claude Code hooks (PreToolUse or similar triggers)
    - nit:status skill rewrite: reads state.json and step directories to display current task state, step progress, validation results, and approval history in a structured format
    - Integration testing: end-to-end flow through analyze, design, implement using one archetype (e.g., backend-feature) to verify all pieces work together
    - Support both bunx and npx in hook scripts (per R-5)
    </in-scope>
    <out-of-scope>
    - Boundary enforcement hooks (PHASE-3)
    - Run logging display in nit:status (PHASE-4)
    - nit:review and nit:qa step integration (PHASE-3)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a validation hook script for step output,
      When an agent produces output.json after a step,
      Then the hook automatically runs `npx nit validate --schema step-output output.json` and blocks the step if validation fails.
    </criterion>
    <criterion id="AC-2">
      Given a task with state.json showing step progress through analyze and design,
      When nit:status is run,
      Then it displays the current step, overall status, step-by-step progress with timestamps, and any validation errors or approval decisions.
    </criterion>
    <criterion id="AC-3">
      Given a freshly created task with backend-feature archetype,
      When the full flow is executed: nit:continue (analyze) -> nit:approve -> nit:continue (design) -> nit:approve -> nit:continue (implement),
      Then each step produces valid output.json, state.json correctly tracks progression, and all step directories contain input.json, output.json, validation.json, and approval.json.
    </criterion>
    <criterion id="AC-4">
      Given a hook script,
      When inspected for CLI invocation,
      Then it uses npx (with bunx fallback or vice versa) to invoke the nit validate command, not direct schema validation tools.
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
    TASK-001 in PHASE-2 (schemas and validate command)
    TASK-007 in PHASE-2 (supervisor state machine)
    TASK-008 in PHASE-2 (approve/reject commands for integration test)
    TASK-009 in PHASE-2 (design/implement skills for integration test)
  </dependencies>

  <open-questions>
    <question id="Q-1">Which Claude Code hook trigger points should be used for validation hooks (PreToolUse, PostToolUse, or a custom mechanism)?</question>
    <question id="Q-2">Should integration testing be a separate QA task or part of this task's definition of done?</question>
  </open-questions>

</task>
