# Review — Task 31: Rework Context Must Reach the Reopened Step

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-19) at first pass, after one finding raised during review was fixed.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: v1 prose records, implementation and review in one session, and
    CodeRabbit skipping — ten consecutive pull requests.

    This is the fourth change to `cli/src/supervisor.ts` in the phase and the third to alter behaviour
    for every task. The pattern of verifying each behaviour by reverting it and confirming a test fails
    is the only real check operating on this code, and it is not independent review.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `rejectState` records the rejected step's id and the rejection comment in `state.reworkFrom`, and
      `assembleContext` threads it into the reopened step's `input.json`. Verified through the CLI, not
      only in tests: rejecting a review with a comment hands the reopened implement step that exact
      comment.
    </criterion>
    <criterion id="AC-2" result="pass">
      The rejecting step's `output.json` is reachable by a task-relative path in `reworkFrom.output`,
      and the test asserts both that the path resolves on disk and that `priorOutputs.review` is
      undefined — the second assertion is the one that matters, because it demonstrates *why* a
      separate field is needed rather than merely that this one works. The path is omitted when the
      rejected step wrote no output, rather than pointing at a file that does not exist.
    </criterion>
    <criterion id="AC-3" result="pass">
      A repair reopen carries `repairErrors` and no rework context. The stronger case is also covered:
      a step reworked and *then* failing validation carries **both**, because the rework is still
      outstanding — the step has not succeeded. Reading AC-3's "rather than" as mutually exclusive in
      the implementation would have been a defensible misreading that silently dropped the reviewer's
      reasoning at the moment the engineer most needs it.
    </criterion>
    <criterion id="AC-4" result="pass">
      `advanceState` and `ingestValid` both clear it, and a test drives the full cycle — reject,
      rework, succeed, reopen for an unrelated repair — asserting no stale rejection survives. Verified
      by reverting the clearing and confirming the test fails.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified; AC-1, AC-2 and AC-4 through the CLI as well as in tests.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 263 pass, 0 fail (21 added). Reproduced by the reviewer. Both halves of the
      mechanism were verified by reversion: removing the clearing fails one test, removing the context
      threading fails three.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    **Persisting in state rather than inferring** is the decision this task turns on, and it is right
    for a reason worth recording. Inference was available and cheaper: the rejected step's
    `approval.json` is on disk with `status: "rejected"` and the comment, so `prepare` could have
    derived the rework without a schema change. It would have failed AC-4 — that file stays on disk
    forever, so a later unrelated reopen would resurface a rejection that was addressed three steps
    ago. Durable state is what makes "cleared once discharged" expressible at all.

    The schema change is additive and was verified as such: a `task-state` without `reworkFrom` still
    validates.

    **All three context-building sites agree**, because they share `assembleContext`. That helper exists
    because TASK-017's RW-1 found `prepare`, `dryRun` and `ingest` diverging, and this task adding a
    field to one place and getting all three is the payoff. Confirmed by running `--dry-run` and
    `prepare` on the same rejected task and comparing: identical.

    **`ingestBlocked` preserves the rework** by spreading state, which is correct — a blocked task has
    not discharged anything, and whoever unblocks it needs the reviewer's reasoning intact.

    ADR-0004 holds: the mechanism is tested CLI code; the skills describe what to read.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The recorded `output` path is task-relative,
    so an absolute `--task-dir` cannot bake a machine-specific path into `state.json` — the TASK-017
    RW-2 defect class was checked for and avoided rather than rediscovered.
  </security-check>

  <test-quality result="pass">
    Twenty-one tests. The valuable ones are the boundary cases rather than the happy path: both causes
    coexisting, the missing-output case, the full reject-rework-succeed-reopen cycle, and the schema
    validity of a state carrying the new field.

    The `priorOutputs.review` assertion deserves specific credit. It does not test the feature; it
    tests the *premise* — that the existing mechanism structurally cannot carry this, which is the
    entire justification for adding a field. A test that records why a design exists survives a future
    reader asking whether the field is redundant.

    Both mechanism halves were verified by reversion rather than assumed. That discipline has now run
    across six consecutive tasks and has caught two bad tests and two real defects.

    One gap, non-blocking: nothing asserts what happens when a step is rejected twice in succession.
    The scope explicitly excludes rework history and the implementation overwrites, which matches — but
    the overwrite is untested, so a future change to accumulate rather than replace would pass silently.
  </test-quality>

  <scope-check result="pass">
    The schema field, the supervisor wiring, the five step skills, `nit:reject`, and the tests. Two
    edits reach further and both are justified: `analyze` documented neither reopen cause and can be
    reopened for repair, so that was a pre-existing gap this task was best placed to close; and
    `nit:continue` (RV-1).

    Out-of-scope respected: rejection routing is unchanged, no rework history is kept, and nothing
    auto-derives rework items from review comments — the reviewer wrote them and the engineer reads
    them.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic as tested CLI code (ADR-0004)" result="pass">Recording, threading and clearing are all in supervisor.ts with tests.</guard>
    <guard description="prepare, dryRun and ingest must not diverge" result="pass">All three use assembleContext; dryRun parity confirmed against a real rejected task.</guard>
    <guard description="Additive schema evolution" result="pass">reworkFrom optional; states without it still validate.</guard>
    <guard description="No machine-specific paths in committed artifacts" result="pass">The output path is task-relative.</guard>
    <guard description="A declared field must have a consumer" result="pass">All five step skills read it, pinned by conformance test.</guard>
    <guard description="Documentation lives where the consumer looks" result="pass">Fixed as RV-1.</guard>
  </convention-guards>

  <findings>
    - [minor, fixed] RV-1 — `nit:continue` documented one reopen cause and not the other. It described
      the repair path in detail — "reopens the step with the errors embedded in a fresh `input.json`" —
      and said nothing about rework, despite that being a second way the same skill reopens a step.
      This is the phase's secondary pattern recurring in the task that fixed its primary one: a
      guarantee implemented in code and absent from the document its reader consults. The same shape
      as TASK-028's resolved-role guarantee, TASK-027's rejection invariant, and TASK-023's unused
      `summary.json` input.
    - [note] The defect this task fixes was **created by documentation**, not by code. `nit:reject` has
      always said its comment "is the specialist's rework context"; the code never delivered it. Nobody
      noticed for two phases because the sentence read as a description of behaviour rather than an
      unfulfilled promise. Worth remembering that prose asserting a behaviour is itself a claim that
      can be false, and that nothing tests prose by default — which is what the conformance tests
      adopted in this phase exist to change.
    - [note] A second rejection of the same step overwrites the first. That matches the scope, which
      excludes rework history, and "the most recent rejection is enough" is almost certainly right —
      but it is unasserted, so a future change to accumulate would pass silently.
    - [note] `analyze` documented neither reopen cause before this task. It is ungated in every shipped
      archetype, so it cannot currently be rejected, but it can be reopened for repair — and the
      omission would have become a live defect the moment an archetype gated it.
    - [note] This is the fifth field added to `context` (`taskId`, `stepId`, `priorOutputs`,
      `repairErrors`, `reworkFrom`). The shape is still ad hoc — `step-input.schema.json` declares
      `context` as an open object with `additionalProperties: true`, so none of these five is schema-
      enforced. A specialist reading an undeclared field gets no validation error if it is misspelled.
      Not urgent, but the context is now large enough that closing it would catch real mistakes.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `nit:continue` now describes both reopen causes side by side: repair means the output was
      malformed and carries `repairErrors`; rework means it was well-formed but unsatisfactory and
      carries `reworkFrom` with the rejected step, the comment, and a path to its output. It also states
      the two cases the implementation gets right and a reader would otherwise have to infer — that a
      step can carry both at once, and that both clear on success. A conformance test asserts the skill
      mentions both.
    </item>
    <verification>
      `bun test` — 263 pass, 0 fail after the fix.
    </verification>
  </finding-resolution>

</review>
