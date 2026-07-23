# Review — Task 16: nit:approve, nit:reject, and nit:analyze

<review>

  <verdict>approved</verdict>

  <pr-url>https://github.com/saculo/nit/pull/19</pr-url>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `approveStep` requires status awaiting_approval, writes an approved approval.json (with
      approvedBy, timestamp, comment) to the current step directory, then advances via `advanceState`.
      Verified by "approve at the design step…": approval.json status approved / timestamp NOW /
      comment recorded, and state.currentStepId advances to implement (in-progress). Confirmed via the
      CLI command manually.
    </criterion>
    <criterion id="AC-2" result="pass">
      `rejectStep` writes a rejected approval.json and calls `rejectState`, which reads
      rejectionRouting[currentStepId] from the resolved archetype. Verified by "reject at the review
      step reopens implement…": approval.json rejected with comment; result.reopenedStep implement;
      state.currentStepId implement, status in-progress — matching the base archetype's review →
      implement routing.
    </criterion>
    <criterion id="AC-3" result="pass">
      At the last step, `advanceState` yields the terminal state. Verified by "approve at the last step
      completes the task…": result.done true, state.status done, timestamps.completedAt set. AC-3's
      "completed" is realised as the schema's terminal status `done` (declared vocabulary reconciliation).
    </criterion>
    <criterion id="AC-4" result="pass">
      The analysis-result $def gained an optional proposedArchetype, and nit:analyze/SKILL.md documents
      producing findings/risks/recommendations + proposedArchetype. Verified by the schema tests: a
      full analysis-result validates against step-output.schema.json; a variant missing the required
      findings is rejected.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria pass.</item>
    <item id="DOD-2" result="pass">Test suite green: 78 pass / 0 fail (266 assertions), 8 new tests.
      Each AC maps to a behavioural test (approval-file contents, state advancement, rejection routing,
      terminal completion, schema validity) plus guards (refuses non-awaiting tasks; rejectState on a
      routing-less step).</item>
    <item id="DOD-3" result="pass">No critical tech debt. Declared debts (redundant supervisor advance
      branch; rejection reopenCount reset; no spawn-level command test) are non-critical.</item>
  </dod-check>

  <architecture-conformance result="pass">
    All key decisions realised: approve/reject as tested CLI commands operating on the current step
    (KD-1, Q-1); approve reuses advanceState with terminal done+completedAt (KD-2); reject reopens the
    archetype rejectionRouting target (KD-3); nit:analyze prose step skill (KD-4) with an additive
    proposedArchetype schema field (KD-5); the redundant supervisor branch left as a documented
    fallback (KD-6). Approve/reject reuse the supervisor's pure functions rather than duplicating
    transition logic. Deviations are limited to the declared vocabulary reconciliation.
  </architecture-conformance>

  <security-check result="pass">
    No secrets or injection vectors. Paths come from CLI flags / task directories used for local
    reads/writes; no shell interpolation. State/approval writes are schema-validated; error messages
    do not leak sensitive data.
  </security-check>

  <test-quality result="pass">
    AC-to-test mapping is complete with meaningful assertions on real outcomes (file contents, state
    fields, routing targets, schema validity). fs tests use isolated per-test temp directories
    (deterministic). The nit:analyze prose skill is validated at its contract boundary (the output
    schema), which is the testable surface for a prose step skill.
  </test-quality>

  <scope-check result="pass">
    Task module is `.claude/skills`; supporting cli/ changes (approve/reject commands + supervisor
    functions, additive schema field) are necessary and consistent with the approved design and
    ADR-0004. Out-of-scope items (auto-advance, nit:review, nit:qa) were not implemented. No unrelated
    refactoring.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic as tested CLI code (ADR-0004)" result="pass">approveStep/rejectStep + pure rejectState/buildApproval; thin skill wrappers only.</guard>
    <guard description="Every generated JSON validated at write time (ADR-0003)" result="pass">approval.json and state.json validated via writeJson before persisting.</guard>
    <guard description="Guarded state transitions" result="pass">approve/reject abort with a clear message unless the task is awaiting_approval.</guard>
    <guard description="Archetype-driven rejection routing" result="pass">reject reads rejectionRouting from the resolved archetype; no hardcoded targets.</guard>
  </convention-guards>

  <findings>
    - [suggestion] The rejection comment is written to the rejected step's approval.json, but the
      reopened routing target's input.json does not surface it — prepare only threads validation
      repairErrors into context. The specialist reworking the reopened step therefore loses the
      rejection rationale. Consider threading the latest rejection comment into the reopened step's
      input.json context (a small supervisor/reject enhancement). Non-blocking; AC-2 does not require it.
    - [note] reject resets reopenCount to 0 for the reopened target, treating a rejection as a fresh
      attempt. Reasonable default; if rejection cycles should be bounded like repair cycles, that would
      need a separate counter.
    - [note] With approve advancing the pointer, the supervisor's prepare advance-on-approved branch is
      dead in practice (KD-6). Harmless; a later cleanup can remove it.
  </findings>

</review>
