# Review — Task 29: Honour the Per-Step Approval Flag

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-19) at first pass. One finding raised during review — RV-1 — was filed as
    TASK-031 rather than fixed here, with the reasoning recorded below.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: v1 prose artifacts for this task's records, implementation and
    review in one session, and CodeRabbit skipping — now six consecutive pull requests.

    This is the second consecutive code change to `cli/src/supervisor.ts`, and unlike TASK-028 it
    alters behaviour for **every task on every archetype** rather than adding a resolution step that
    fails closed. A defect here would not be caught by any external reader before it reached main.
    That is worth stating plainly rather than as boilerplate: this task carried the most risk of
    anything merged in the phase, and it was reviewed only by the session that wrote it.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      A gated step is unchanged: it writes a pending `approval.json` and parks at `awaiting_approval`.
      Asserted directly on the `design` step, and the result object deliberately omits the `gated` key
      on this path so the two outcomes are distinguishable by shape as well as by status.
    </criterion>
    <criterion id="AC-2" result="pass">
      An ungated step advances without a human decision, and a subsequent `prepare` dispatches the next
      step — the test carries it through to asserting `STEP-004-review/input.json` exists, rather than
      stopping at the state change. Advancing without dispatching would have satisfied a weaker reading
      of the criterion while leaving the pipeline stalled.
    </criterion>
    <criterion id="AC-3" result="pass">
      `bugfix`'s design step is asserted to carry `approval: false` in the resolved archetype, and then
      asserted to advance. The archetype's entire override was a no-op before this; it now has an
      observable effect, which is what makes the criterion meaningful rather than a restatement of AC-2.
    </criterion>
    <criterion id="AC-4" result="pass">
      Both modes complete the task. An ungated final step reaches `done` with `completedAt` through
      `ingest`; a gated final step reaches it through `approveStep`. Covering only one would have left
      the other path unverified, and they take different code routes to the same transition.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 211 pass, 0 fail (9 added). Reproduced by the reviewer, and verified end-to-end
      through the CLI by driving a complete `backend-feature` task: it stops twice, at `design` and
      `review`, and reaches `done`. That run is the real proof; the unit tests assert the mechanism,
      the CLI run asserts the outcome the task exists for.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 filed as TASK-031 with reasoning.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    ADR-0004 is respected: the gating decision is tested CLI code reading archetype data, not prose an
    agent interprets.

    Two design decisions are correct and worth recording as decisions rather than details.

    **Defaulting to gated when the flag is absent.** `stepIsGated` returns true unless `approval` is
    explicitly `false`. Inferring "no human review needed" from silence is the wrong direction to fail,
    and since `base.json` always sets the flag this changes nothing today while protecting any future
    archetype that omits it.

    **Writing an auto-approved `approval.json` for an ungated step.** The task's own notes named this
    as the design question to settle, because `prepare` decides whether to advance by reading that file.
    Writing it keeps `prepare` and `ingest` agreeing on how a non-gated step is represented, keeps every
    step directory the same shape, and preserves an audit trail that records *why* no human approved —
    the comment names the archetype flag. Writing nothing would have been cleaner in isolation and
    required both functions to special-case the absence.

    The blocked and escalated paths are untouched, with a test pinning that. Neither is an approval
    question, and folding them into the gating branch would have been an easy and serious mistake.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. One security-adjacent judgement is worth
    naming: this task *removes* human checkpoints, which is a reduction in oversight by design. It is
    safe because the removal is exactly what the archetype already declared, and because the
    conservative default preserves gating for anything unspecified. A version that defaulted ungated
    would have silently dropped review gates across every archetype that omits the flag.
  </security-check>

  <test-quality result="pass">
    Nine tests, and the shape of the suite matches the shape of the risk: both modes, both final-step
    routes, the default-when-absent case, and an assertion that the untouched paths are untouched.

    The most valuable test is the least obvious one: `base.json gates exactly design and review`. It
    pins the archetype's intent as data, so if someone flips a flag the failure names the behavioural
    consequence rather than surfacing as a mysteriously changed approval count somewhere downstream.

    One existing test was updated rather than worked around, which is the right call and worth being
    explicit about. `first run ... ingest parks awaiting_approval` asserted the old behaviour on the
    `analyze` step. `analyze` is declared ungated, so advancing is correct and the old assertion was
    encoding an accident of the bug as an expectation. It was renamed as well as re-asserted, so the
    name no longer misleads.
  </test-quality>

  <scope-check result="pass">
    The gating helper, the ingest branch, the tests, and the documentation that described the old
    behaviour. `nit:continue` now documents both ingest outcomes and notes that `/nit:approve` on an
    ungated step fails; `nit:orchestrate`'s limitation is removed because it is now false.

    RV-1 was deliberately not fixed here despite being discovered by this task's own interaction —
    see the resolution.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic as tested CLI code (ADR-0004)" result="pass">Gating reads archetype data in code with tests.</guard>
    <guard description="Fail conservatively on an unspecified flag" result="pass">Absent approval is treated as gated; asserted by test.</guard>
    <guard description="ingest and prepare agree on step representation" result="pass">An ungated step still writes approval.json, which is what prepare reads.</guard>
    <guard description="Approval-independent paths untouched" result="pass">blocked and escalated asserted unchanged.</guard>
    <guard description="No stale limitation left in a skill" result="pass">nit:orchestrate's claim removed; one remains, TASK-027, still true.</guard>
  </convention-guards>

  <findings>
    - [major, filed as TASK-031] RV-1 — rework context does not reach the reopened step, and this task
      makes that materially worse. `nit:reject`'s documentation states that the `--comment` "is the
      specialist's rework context". It is not: rejecting a review writes the comment into the review
      step's `approval.json`, sets `currentStepId` to `implement`, and nothing carries it forward.
      Verified against a real task directory — the reopened step's context held only `taskId` and
      `stepId`, with no comment and no route to the review output, since `priorOutputs` maps only steps
      *before* the current index and review sits after implement.
      The gap predates this task. What this task changes is the consequence: `implement` is ungated, so
      the reworked step now advances **straight back to the same reviewer** with no human checkpoint in
      between. Previously it parked, and a person saw the result first. The loop still terminates —
      each cycle needs a human rejection — but it is a loop in which the engineer is never told what to
      change.
    - [note] The result object for an ungated step carries `gated: false` and `advancedTo`, while the
      gated path carries neither. Distinguishing the outcomes by shape as well as by status is
      deliberate and makes the two branches unmistakable to a consumer, but it does mean `IngestResult`
      now has four variants and any new consumer must handle all of them.
    - [note] `/nit:approve` on an ungated step now fails with `task status is "in-progress", expected
      awaiting_approval`. That is correct and the message is clear, but it is a behaviour a user will
      hit — approving out of habit at a step that no longer gates. `nit:continue` documents it; nothing
      surfaces it at the moment of failure.
    - [note] This closes the third of the four "declared contract nothing consumes" defects the phase's
      reviews surfaced. TASK-027 remains, plus TASK-030's inverse. With three now fixed by the same
      shape of change, the case for an ADR at phase summary is stronger than when it was first noted —
      the recurrence is the finding, not any individual instance.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="filed as TASK-031">
      Filed with the reproduction, four acceptance criteria, and the distinction the fix must preserve:
      `repairErrors` means the output was malformed, rework means it was well-formed and
      unsatisfactory, and the two call for different responses from the specialist. AC-2 specifically
      requires the rejecting step's output to be reachable despite not being a prior step by index,
      which is the part `priorOutputs` structurally cannot provide.
      Not fixed here: threading rework context is a new context field, a new shape for
      `assembleContext`, and a change to what `nit:implement` reads. This task's job was to make an
      existing archetype flag effective; folding a context redesign into a behavioural change that
      already affects every task would have made both unreviewable.
    </item>
    <verification>
      `bun test` — 211 pass, 0 fail. The two-gate outcome re-verified through a full CLI run.
    </verification>
  </finding-resolution>

</review>
