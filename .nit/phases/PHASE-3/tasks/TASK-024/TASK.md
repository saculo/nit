# TASK-024 — Rewrite nit:status for v2 Artifacts

<task>

  <meta>
    <id>TASK-024</id>
    <phase>PHASE-3</phase>
    <title>Rewrite nit:status for v2 Artifacts</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>todo</status>
  </meta>

  <user-story>
    As someone returning to a project mid-pipeline,
    I want the status dashboard to read the artifacts v2 actually writes and tell me the one next action,
    So that I can see where every task really stands instead of a dashboard that reports nothing because it is looking for files the workflow stopped producing.
  </user-story>

  <scope>
    <in-scope>
    - Rewrite `.claude/skills/status/SKILL.md` to read `prd/summary.json`, `phase.json`, `task.json`, each task's `state.json`, and a completed phase's `summary.json`
    - Replace the v1 `SUMMARY.md` reference in the next-step logic: TASK-023 changed the phase summary artifact to `summary.json`, so the existing check looks for a file v2 never writes
    - Report per-task pipeline position from `state.json`: `currentStepId`, `status`, `reopenCount`, and which steps have an `output.json` and an approved `approval.json`
    - Surface the states that need a human distinctly — `awaiting_approval`, `blocked` (with its reason from the step output), and `escalated` — because these are the entire reason to run the command
    - Rewrite the "next step" suggestion against the v2 command set: `/nit:continue`, `/nit:approve`, `/nit:reject`, not `/nit:design N M`
    - Correct the command list at the bottom of the dashboard, which still advertises v1 commands
    - Degrade honestly on a v1 or partially migrated workspace: report what it cannot read rather than showing an empty dashboard
    </in-scope>
    <out-of-scope>
    - Run log history integration — PHASE-4, and it assumes this rewrite has already happened
    - A machine-readable status output; `nit:status` is a human-facing dashboard and stays prose
    - Modifying any state it reads — status is strictly read-only
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a workspace with v2 phases and tasks,
      When nit:status runs,
      Then every phase and task appears with its real status read from phase.json, task.json, and state.json, and no task is omitted because a v1 artifact is missing.
    </criterion>
    <criterion id="AC-2">
      Given a task parked at awaiting_approval, blocked, or escalated,
      When nit:status runs,
      Then that task is visibly distinguished from tasks in progress, and a blocked task shows the reason from its step output.
    </criterion>
    <criterion id="AC-3">
      Given any workspace state,
      When nit:status suggests the next step,
      Then it names exactly one action drawn from the v2 command set, and that command is valid for the state it was derived from.
    </criterion>
    <criterion id="AC-4">
      Given a workspace holding v1 prose artifacts, or no .nit/ directory at all,
      When nit:status runs,
      Then it says specifically what it found and what it could not read, rather than rendering an empty or misleading dashboard.
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
    - TASK-015 (state.json, the primary source this reads)
    - TASK-018 (blocked state and its reason, surfaced by AC-2)
  </dependencies>

  <notes>
    **This was an unplanned gap.** PHASE-3 did not list a nit:status rewrite, and PHASE-4 assumes a
    working nit:status when it adds run-log history to it. The skill currently scans for
    `CLARIFICATIONS.md`, `PHASE.md`, `DESIGN.md`, `STEPS.md`, `IMPLEMENTATION.md` and `REVIEW.md` —
    six artifacts, none of which v2 writes — so on a v2 workspace it reports almost nothing while
    appearing to work. Silent under-reporting is worse than an error, which is why AC-4 requires it to
    name what it could not read.

    **AC-2 is the point of the command.** A dashboard that lists work is mildly useful; a dashboard
    that shows which tasks are waiting on a human is the reason to run it at all. `awaiting_approval`,
    `blocked`, and `escalated` are the three states where the pipeline has stopped and will not
    resume without someone acting.
  </notes>

</task>
