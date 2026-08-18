# TASK-029 — Honour the Per-Step Approval Flag

<task>

  <meta>
    <id>TASK-029</id>
    <phase>PHASE-3</phase>
    <title>Honour the Per-Step Approval Flag</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>todo</status>
  </meta>

  <user-story>
    As someone running a task through the pipeline,
    I want only the steps an archetype marks `approval: true` to stop for my decision,
    So that the approval gates I configured are the gates I get, instead of every step halting regardless of what the archetype says.
  </user-story>

  <scope>
    <in-scope>
    - Make `ingest` consult the current step's `approval` flag: a step with `approval: true` parks at `awaiting_approval` as today; a step with `approval: false` advances without a human decision
    - Decide what a non-gated step writes in place of `approval.json` — nothing, or an auto-approved record for the audit trail. `prepare` currently reads `approval.json` to decide whether to advance, so the two must agree
    - Preserve the `blocked` and `escalated` paths unchanged; neither is an approval question
    - Keep the last step's completion working: approving or auto-advancing the final step must still transition the task to `done` with a `completedAt` timestamp
    - Cover every shipped archetype, including `bugfix`, whose entire override is ungating the design step and is therefore currently a no-op
    </in-scope>
    <out-of-scope>
    - Changing which steps are gated in the shipped archetypes; this task makes the existing declarations effective, it does not re-decide them
    - A global "approve everything" or unattended mode
    - Reworking the reject path, which is only reachable from `awaiting_approval` and stays that way
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a step whose archetype declares approval: true,
      When its valid output is ingested,
      Then the task parks at awaiting_approval and a pending approval.json is written, exactly as today.
    </criterion>
    <criterion id="AC-2">
      Given a step whose archetype declares approval: false,
      When its valid output is ingested,
      Then the task advances to the next step without requiring a human decision, and a subsequent prepare dispatches that next step.
    </criterion>
    <criterion id="AC-3">
      Given a bugfix task, whose archetype ungates the design step,
      When the design step's output is ingested,
      Then the task advances without a gate, so the archetype's only override has an observable effect.
    </criterion>
    <criterion id="AC-4">
      Given the final step of an archetype,
      When it completes under either gating mode,
      Then the task reaches status done with a completedAt timestamp.
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
    - TASK-015 (the supervisor ingest and prepare paths)
    - TASK-016 (the approve and reject commands, whose contract this changes for non-gated steps)
  </dependencies>

  <notes>
    **The defect, concretely.** `archetype.schema.json` defines a per-step `approval` boolean, and
    `base.json` uses it deliberately — `analyze`, `implement`, and `qa` are `false`; `design` and
    `review` are `true`. `ArchetypeStep` carries the field through resolution. But nothing in
    `cli/src/supervisor.ts` ever reads it: `ingestValid` unconditionally sets `awaiting_approval` and
    writes a pending `approval.json`. Every step is gated.

    The field is therefore decorative today, and two things follow. The archetypes claim a workflow
    they do not deliver — a five-step task requires five approvals, not the two `base.json` describes.
    And `bugfix`'s override is inert: its entire purpose is `"design": { "approval": false }`, which
    changes nothing.

    **Why it surfaced in TASK-022.** Verifying the qa step end-to-end meant running a task to
    completion, and qa is declared `approval: false` yet still parked at `awaiting_approval` and needed
    an explicit `/nit:approve` to reach `done`. The step worked correctly; the gate should not have
    been there.

    **The design question to settle.** `prepare` decides whether to advance by reading
    `approval.json` and checking for `status: "approved"`. If a non-gated step writes no approval file,
    that check must not be reached for it — so the two functions have to agree on how a non-gated step
    is represented. Writing an auto-approved `approval.json` is the smaller change and keeps the audit
    trail uniform; writing nothing is cleaner but touches both paths. Settle it at design.
  </notes>

</task>
