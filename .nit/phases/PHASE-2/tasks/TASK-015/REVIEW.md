# Review — Task 15: Deterministic Supervisor (nit:continue)

<review>

  <verdict>approved</verdict>

  <pr-url>https://github.com/saculo/nit/pull/18</pr-url>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `prepare` on a directory with no state.json calls `initialState`, writing state.json with
      currentStepId="analyze" and a 5-entry stepOrder, scaffolds STEP-001-analyze/ and its input.json,
      and returns a descriptor with role "analyst". `ingest` on a valid step-output then calls
      `ingestValid`, writing a pending approval.json and setting status="awaiting_approval". Verified by
      the "first run creates state…" test, which asserts each of these on-disk outcomes.
    </criterion>
    <criterion id="AC-2" result="pass">
      With state at awaiting_approval and STEP-001-analyze/approval.json marked approved, `prepare`
      reads the approval, calls `advanceState` to move currentStepId to "design", scaffolds
      STEP-002-design/input.json, and returns role "architect" / action "advance". Verified by the
      "advances to design once the analyze step is approved" test. The command resolves skills from
      routing when a target module is supplied; the ordered list flows into input.json.skillList.
    </criterion>
    <criterion id="AC-3" result="pass">
      An output.json failing step-output validation drives `ingestInvalid`: validation.json is written
      (schemaValid=false with the Ajv errors), reopenCount increments to 1, repairRequired=true,
      status stays in-progress, and a fresh input.json is written with the errors embedded in
      context.repairErrors. Verified by the "invalid output records validation errors…" test asserting
      all of these.
    </criterion>
    <criterion id="AC-4" result="pass">
      With reopenCount=3 and maxReopenCount=3, a further invalid output makes newCount (4) exceed the
      budget, so `ingestInvalid` sets status="escalated". Verified by the "escalates when the reopen
      budget is exceeded" test plus a pure-function test walking reopens 1→3 then escalation at the 4th
      failure.
    </criterion>
    <criterion id="AC-5" result="pass">
      `dryRun` reuses the prepare computation with side effects suppressed: it returns resolvedSteps
      (5), currentStepId "analyze", a skillList, and the prospective input, while creating no state.json
      and no step directory. Verified by the "--dry-run computes the plan without writing…" test and by
      a manual CLI run (`nit continue … --dry-run`) which left the directory clean.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All five acceptance criteria pass.</item>
    <item id="DOD-2" result="pass">Test suite green: 70 pass / 0 fail (242 assertions), 11 new tests.
      Each AC maps to a behavioural test (on-disk state/approval/validation contents, exact step
      advancement, escalation threshold, no-write dry-run), plus pure-function coverage of the reopen
      ladder.</item>
    <item id="DOD-3" result="pass">No critical tech debt. The declared debts (approval signal set by
      TASK-016; single-target routing; no spawn-level command test) are non-critical and documented.</item>
  </dod-check>

  <architecture-conformance result="pass">
    All key decisions are realised: tested CLI state machine + thin skill (KD-1, ADR-0004); two-phase
    prepare/ingest around the LLM dispatch (KD-2); status enum extended with awaiting_approval and
    escalated (KD-3); step numbering by resolved-archetype position (KD-4); repair/escalate with
    maxReopenCount default 3 (KD-5); supervisor-owned state.json and per-step routing (KD-6, resolving
    Q-1); dry-run via suppressed prepare (KD-7); reuse of the existing artifact schemas with
    validate-at-write (KD-8). The A-1 override is properly captured in ADR-0004. Deviations
    (schema extension, in-process temp-dir tests) are declared and sound.
  </architecture-conformance>

  <security-check result="pass">
    No secrets or injection vectors. All file paths come from CLI flags / task directories and are used
    only for local reads/writes; no shell interpolation. JSON parse/validation failures are caught and
    reported without leaking sensitive data.
  </security-check>

  <test-quality result="pass">
    AC-to-test mapping is complete. Assertions check real behaviour (file existence and JSON field
    values, state transitions, escalation) rather than "no throw". The state-machine core is factored
    into pure functions that are tested independently, and the fs orchestration is tested with isolated
    per-test temp directories (deterministic). The Agent-dispatch seam is inherently not unit-testable
    and is documented, not asserted.
  </test-quality>

  <scope-check result="pass">
    The task module is `.claude/skills`; the implementation also adds cli/ code (supervisor + continue
    command) and extends task-state.schema.json. These are necessary supporting changes consistent with
    the TASK-013/TASK-014 precedent and the approved design, not feature creep. Approve/reject remains
    out of scope (TASK-016) and was not implemented. No unrelated refactoring.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic as tested CLI code (ADR-0004)" result="pass">supervisor.ts pure functions + fs orchestration, mirroring archetype/routing engines.</guard>
    <guard description="Every generated JSON validated at write time (ADR-0003)" result="pass">writeJson asserts against the named schema before writing state/input/approval/validation.</guard>
    <guard description="Config absence degrades safely" result="pass">loadMaxReopenCount defaults to 3 when supervisor.json is missing.</guard>
    <guard description="Step numbering follows resolved archetype position (U-6)" result="pass">stepDirName pads the 1-based index; bugfix would start at STEP-001-design.</guard>
  </convention-guards>

  <findings>
    - [suggestion] The per-step `approval` boolean from the archetype is not consulted: `ingestValid`
      always parks at awaiting_approval, so approval:false steps (analyze/implement/qa) still block on
      approval. This is AC-correct (AC-1 requires awaiting_approval for the approval:false analyze step),
      but the flag is currently meaningless. TASK-016 should decide whether approval:false steps
      auto-advance.
    - [suggestion] prepare/ingest locate the current step via `opts.steps[currentIndex(state)]`, which
      assumes state.stepOrder matches the freshly-resolved archetype order. Mapping by stepId would be
      more robust if an archetype's step list ever changes mid-task.
    - [note] `dryRun` does not mirror prepare's "blocked" result when the current step is awaiting an
      un-granted approval — it prints the current step's plan instead. Informational only; not an AC path.
    - [note] A corrupt state.json whose currentStepId is absent from stepOrder would make currentIndex
      return -1 and throw via the non-null assertion; it surfaces as a caught generic error (exit 1).
  </findings>

</review>
