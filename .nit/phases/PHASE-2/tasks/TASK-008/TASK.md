# TASK-008 — nit:approve, nit:reject, and nit:analyze

<task>

  <meta>
    <id>TASK-008</id>
    <phase>PHASE-2</phase>
    <title>nit:approve, nit:reject, and nit:analyze</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>draft</status>
  </meta>

  <user-story>
    As a user controlling task progression,
    I want approve and reject commands that update approval state and advance or reopen steps, and an analyze step skill for the analyst role,
    So that approval gates work correctly per archetype configuration and the analyze step can produce structured analysis output.
  </user-story>

  <scope>
    <in-scope>
    - nit:approve skill: writes approval.json with status=approved, approvedBy, timestamp, comment; advances state.json to next step; if last step, marks task complete
    - nit:reject skill: writes approval.json with status=rejected, comment; applies rejection routing per archetype definition (per PRD Section 11); reopens target step with rejection context
    - nit:analyze skill: new step skill for analyst role; reads task.json and project context; produces analysis-result embedded in step-output.json (analysis of requirements, risks, archetype recommendation per U-11)
    - All outputs validated against their respective schemas
    </in-scope>
    <out-of-scope>
    - Auto-advance logic (supervisor handles that in TASK-007)
    - nit:review step skill (PHASE-3)
    - nit:qa step skill (PHASE-3)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a task at the design step with status awaiting_approval,
      When nit:approve is run with a comment,
      Then approval.json is written with status=approved and timestamp, and state.json advances currentStepId to the next step in the archetype.
    </criterion>
    <criterion id="AC-2">
      Given a task at the review step with status awaiting_approval,
      When nit:reject is run with a comment,
      Then approval.json is written with status=rejected, and state.json reopens the implement step (per default rejection routing: reject review -> reopen implement).
    </criterion>
    <criterion id="AC-3">
      Given a task at the last step of its archetype with status awaiting_approval,
      When nit:approve is run,
      Then state.json is updated with status="completed" and a completedAt timestamp.
    </criterion>
    <criterion id="AC-4">
      Given a task at the analyze step dispatched to the analyst agent,
      When the analyst completes nit:analyze,
      Then STEP-NNN-analyze/output.json contains an analysis-result with requirements analysis, identified risks, and a proposed archetype, validating against step-output.schema.json.
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
    TASK-007 in PHASE-2 (supervisor creates state.json and step directories that approve/reject operate on)
  </dependencies>

  <open-questions>
    <question id="Q-1">Should nit:approve and nit:reject accept task and step IDs as arguments (e.g., nit:approve TASK-001 STEP-002) or operate on the current active step by default?</question>
  </open-questions>

</task>
