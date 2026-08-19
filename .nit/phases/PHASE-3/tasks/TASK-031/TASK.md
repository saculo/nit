# TASK-031 — Rework Context Must Reach the Reopened Step

<task>

  <meta>
    <id>TASK-031</id>
    <phase>PHASE-3</phase>
    <title>Rework Context Must Reach the Reopened Step</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>todo</status>
  </meta>

  <user-story>
    As the engineer re-running an implement step after a reviewer rejected the review,
    I want the rejection comment and the review's findings in my `input.json`,
    So that I fix what was actually wrong instead of re-doing the same work blind and sending it straight back to the same reviewer.
  </user-story>

  <scope>
    <in-scope>
    - Thread rework context into the reopened step's `input.json` when a rejection routes work backwards: at minimum the rejecting step's id, the `approval.json` comment, and a pointer to that step's `output.json`
    - Decide the shape — a `context.reworkFrom` object is the obvious candidate, alongside the existing `repairErrors` and `priorOutputs`
    - Make the rejecting step's `output.json` reachable. `priorOutputs` maps only steps *before* the current index, so a step reopened from a later one cannot see the output that caused it
    - Distinguish the two reopen causes in the context: `repairErrors` means the output was malformed, rework means it was well-formed and unsatisfactory. They call for different responses from the specialist
    - Update `nit:implement` (and any step reachable by rejection routing) to read and act on the rework context
    - Clear the rework context once the step succeeds, so a later unrelated reopen does not resurface a stale rejection
    </in-scope>
    <out-of-scope>
    - Changing rejection routing itself — which step reopens is the archetype's decision (TASK-027 covers a defect in that data)
    - Persisting a rework history across multiple rejection cycles; the most recent rejection is enough
    - Auto-deriving rework items from review comments; the reviewer already wrote them, and the engineer reads them
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a gated step rejected with a comment,
      When the supervisor reopens the archetype's rejection-routing target,
      Then that step's input.json carries the rejecting step's id and the rejection comment.
    </criterion>
    <criterion id="AC-2">
      Given a step reopened by a rejection from a later step,
      When the specialist reads its input,
      Then the rejecting step's output.json is reachable by a path in the context, even though it is not a prior step by index.
    </criterion>
    <criterion id="AC-3">
      Given a step reopened for repair rather than rework,
      When the specialist reads its input,
      Then it receives repairErrors and no rework context, so the two causes remain distinguishable.
    </criterion>
    <criterion id="AC-4">
      Given a step that was reworked and then produced a valid output,
      When it is next reopened for an unrelated reason,
      Then the stale rework context is absent.
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
    - TASK-016 (the reject command and rejectionRouting)
    - TASK-017 (assembleContext, where context is built for all three paths)
  </dependencies>

  <notes>
    **The gap, concretely.** `nit:reject`'s own documentation says "Always provide a `--comment`
    explaining the rejection — it is the specialist's rework context." It is not. Rejecting a review
    writes the comment into the review step's `approval.json`, sets `currentStepId` to `implement`, and
    nothing carries it forward. Verified against a real task directory: the reopened implement step's
    `input.json` context held only `taskId` and `stepId`, with no rejection comment and no way to reach
    the review output — `priorOutputs` maps steps *before* the current index, and review is after it.

    The engineer therefore re-runs the step knowing only that it must run again.

    **Why it surfaced in TASK-029.** The gap predates that task, but TASK-029 made it materially worse.
    Under the base archetype, `implement` is ungated. Before TASK-029 every step parked at
    `awaiting_approval`, so a rejected review reopened implement, the engineer re-ran it, and a human
    saw the result before it went back to the reviewer. Now the reopened implement step advances
    automatically, so a blind rework goes straight back to the same reviewer with no human checkpoint
    between. Each cycle still requires a human to reject, so it terminates — but it is a loop in which
    the engineer is never told what to change.

    **Why not fixed in TASK-029.** That task's job was to make the archetype's `approval` flag
    effective, and it does exactly that. Threading rework context is a new context field, a new shape
    for `assembleContext` to build, and a change to what `nit:implement` reads — a design change, not
    a consequence of honouring a flag. Folding it in would have made a behavioural fix unreviewable.
  </notes>

</task>
