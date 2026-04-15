# TASK-015 — Deterministic Supervisor (nit:continue)

<task>

  <meta>
    <id>TASK-015</id>
    <phase>PHASE-2</phase>
    <title>Deterministic Supervisor (nit:continue)</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>draft</status>
  </meta>

  <user-story>
    As a user advancing a task through the pipeline,
    I want a deterministic supervisor skill (nit:continue) that reads state and archetype to compute the next step, dispatches the correct agent with composed skills, validates output, and tracks state,
    So that task progression is data-driven, repeatable, and does not depend on hardcoded prose logic.
  </user-story>

  <scope>
    <in-scope>
    - State machine logic: read state.json + resolved archetype to compute next step (per PRD Section 8)
    - Build input.json for the current step (what the specialist receives)
    - Dispatch agent via Agent tool with skill list from routing.json (per U-1)
    - Validate output.json via CLI (`npx nit validate`) after agent completes
    - Write approval.json with status=pending, update state.json to awaiting_approval
    - Repair/reopen flow: validation failure sets repairRequired=true, reopens step with error context in input.json; maxReopenCount=3 from supervisor.json (per U-7), then escalate to user
    - Step numbering based on resolved archetype position (per U-6)
    - Create step directories: STEP-NNN-<stepId>/ with input.json, output.json, validation.json, approval.json
    - --dry-run mode: shows resolved archetype, skill composition, step input without dispatching agent
    - state.json tracking: currentStepId, stepOrder, status, reopenCount, repairRequired, timestamps
    </in-scope>
    <out-of-scope>
    - Approve/reject commands (TASK-008)
    - ADR trigger heuristics (PHASE-3)
    - Boundary/dependency-rules validation (PHASE-3)
    - Run logging (PHASE-4)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a task with no state.json and a backend-feature archetype,
      When nit:continue is run,
      Then state.json is created with currentStepId="analyze", stepOrder listing all 5 steps, STEP-001-analyze/input.json is built, the analyst agent is dispatched, and upon successful output validation, approval.json is written with status=pending and state.json is updated to status="awaiting_approval".
    </criterion>
    <criterion id="AC-2">
      Given a task with state.json showing analyze step approved,
      When nit:continue is run,
      Then the supervisor advances to the design step, creates STEP-002-design/input.json, dispatches the architect agent with skills from routing.json, and upon successful output validation, approval.json is written with status=pending and state.json is updated to status="awaiting_approval".
    </criterion>
    <criterion id="AC-3">
      Given the agent produces an output.json that fails schema validation,
      When nit:continue processes the output,
      Then validation.json is written with errors, state.json is updated with repairRequired=true and reopenCount incremented, and the step is reopened with error context in a new input.json.
    </criterion>
    <criterion id="AC-4">
      Given a step has been reopened 3 times (reaching maxReopenCount),
      When validation fails again,
      Then the supervisor stops, sets status to "escalated", and reports accumulated validation errors to the user.
    </criterion>
    <criterion id="AC-5">
      Given a task with a backend-feature archetype,
      When nit:continue --dry-run is run,
      Then the supervisor prints the resolved archetype (flat step list), skill composition from routing.json, and the step input that would be built, but does not dispatch any agent or write state changes.
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
    TASK-002 in PHASE-2 (archetype definitions and inheritance resolver)
    TASK-006 in PHASE-2 (skill composition engine produces routing.json)
  </dependencies>

  <open-questions>
    <question id="Q-1">How does the supervisor handle the first run when neither state.json nor routing.json exist yet? Does it create both, or should routing.json be pre-created by nit:tasks?</question>
  </open-questions>

</task>
