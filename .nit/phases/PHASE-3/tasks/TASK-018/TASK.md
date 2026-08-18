# TASK-018 — Blocked-Step Escalation Contract for Step Skills

<task>

  <meta>
    <id>TASK-018</id>
    <phase>PHASE-3</phase>
    <title>Blocked-Step Escalation Contract for Step Skills</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>done</status>
  </meta>

  <user-story>
    As a specialist agent that cannot complete its step — the task spans two task types and needs splitting, the design contradicts the acceptance criteria, or an acceptance criterion cannot be satisfied,
    I want a schema-valid way to report that I am blocked and why,
    So that the supervisor parks the task for a human decision instead of crashing or burning the reopen budget on a step that will never succeed.
  </user-story>

  <scope>
    <in-scope>
    - A `blocked` representation in `step-output.schema.json`: a reason code (at minimum `needs-splitting`, `contradictory-input`, `criterion-unsatisfiable`, and `no-output` for the supervisor-synthesized case), a human-readable explanation, and reason-specific detail (e.g. the task types a split would produce)
    - Supervisor `ingest` handling: a blocked output is neither valid-and-approvable nor a repair case — it transitions the task to `blocked` (already in `task-state.schema.json`) without incrementing `reopenCount`
    - A graceful path when a step directory has no `output.json` at all: `ingest` currently throws `No output.json in <dir>`, which is what a specialist that "stops and reports" produces today
    - Update `nit:design` and `nit:implement` to emit the blocked output instead of stopping with prose: the split-task rule (`design/SKILL.md`) and the major-deviation and unsatisfiable-criterion rules (`implement/SKILL.md`)
    - Apply the same contract to `nit:analyze`
    - Tests: blocked ingest, missing-output ingest, and reopen-budget interaction
    </in-scope>
    <out-of-scope>
    - Acting on a `needs-splitting` report — creating the split tasks, rewriting the backlog, or re-archetyping (a human/orchestrator decision; this task only makes the report expressible and routable)
    - Repair/reopen flow refinement beyond leaving `reopenCount` untouched for blocked outputs (PHASE-4)
    - Blocked-contract conformance in `nit:review` and `nit:qa` — neither exists on the v2 contract yet, so conformance is an acceptance criterion of the two rewrite tasks in this phase, not of this one
    - Unblocking commands (`nit:unblock` or similar) — until PHASE-4 a blocked task is resumed by the documented manual `state.json` transition in `continue/SKILL.md`, which is the one sanctioned hand-edit
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the step output schema,
      When a specialist emits an output reporting that it is blocked with a reason code and explanation,
      Then the output validates against step-output.schema.json, and an output carrying a reason code without an explanation is rejected.
    </criterion>
    <criterion id="AC-2">
      Given a step whose output.json reports blocked,
      When the supervisor ingests it,
      Then the task state becomes `blocked`, reopenCount is unchanged, and no repair input.json is written for the step.
    </criterion>
    <criterion id="AC-3">
      Given a step directory with no output.json,
      When the supervisor ingests it,
      Then the task state becomes `blocked` with reason code `no-output` rather than throwing an unhandled error, reopenCount is unchanged, no repair input.json is written, and validation.json is written recording the missing output as the failure.
    </criterion>
    <criterion id="AC-4">
      Given a design step for a task that spans two task types,
      When nit:design applies its split-task rule,
      Then it writes and validates an output.json reporting `needs-splitting` with the task types involved, before stopping.
    </criterion>
    <criterion id="AC-5">
      Given an implement step where the design contradicts the acceptance criteria, or an acceptance criterion cannot be satisfied,
      When nit:implement stops,
      Then it writes and validates an output.json reporting the corresponding reason code, before stopping.
    </criterion>
    <criterion id="AC-6">
      Given the analyze, design, and implement step skills,
      When any of them cannot complete its step,
      Then each uses the same blocked contract rather than a skill-specific convention.
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
    - TASK-015 (supervisor state machine and ingest)
    - TASK-017 (nit:design and nit:implement on the JSON output contract)
    - Sequenced before the nit:review and nit:qa rewrites in this phase, so those skills are written against the contract rather than retrofitted (AC-6)
  </dependencies>

  <decisions>
    <decision id="D-1">
      The blocked report is a `blocked-result` branch in the `result` `oneOf`, discriminated by `resultType: "blocked"`, following the existing per-step-type `$defs` pattern. `result` therefore stays required and every step type can emit it without a per-step-type variant. Supervisor detection is `result.resultType === "blocked"`. A partial result is not carried alongside the block; anything worth keeping goes in the explanation or the reason-specific detail.
    </decision>
    <decision id="D-2">
      A blocked output parks immediately: `ingest` transitions the task straight to `blocked` and does not route through `awaiting_approval`. That is the intent of the `blocked` state and what AC-2 requires — the approval machinery gates completed work, not work that cannot proceed.
    </decision>
  </decisions>

  <notes>
    **Origin.** Raised in the TASK-017 review. `design/SKILL.md` tells the architect to "stop and report that it needs splitting", and `implement/SKILL.md` says the same for a major deviation or an unsatisfiable criterion — but step-output.schema.json has no way to represent either. `design-result` requires `resultType`, `summary`, and `decisions`; `blocked` and `escalated` exist only in task-state.schema.json, not in step output. A specialist following those rules literally leaves the step directory without an output.json, and `ingest` (cli/src/supervisor.ts) then throws `No output.json in <dir>`.

    **Why not fixed in TASK-017.** The fix needs a schema field plus ingest handling plus a state transition — a design change, not a skill-prose edit. It was deliberately deferred so the contract is settled once for every step skill rather than per skill.

    **Phase placement.** PHASE-3 lists "repair/reopen flow refinement" as out-of-scope, deferred to PHASE-4. This task is adjacent but distinct: it adds a new blocked path for a specialist that cannot proceed, rather than tuning the existing repair/reopen budget. PHASE-3's scope needs a one-line amendment to admit it. Placed here because PHASE-3 writes the last two step skills, which need the contract.
  </notes>

</task>
