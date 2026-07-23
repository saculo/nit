# Steps — Task 15: Deterministic Supervisor (nit:continue)

<steps>

  <implementation-steps>
    <step id="S-1" status="done">
      <description>Extend cli/schemas/task-state.schema.json status enum with awaiting_approval and
        escalated (KD-3).</description>
      <deviation></deviation>
    </step>
    <step id="S-2" status="done">
      <description>cli/src/supervisor.ts pure state-machine functions: initialState, advanceState,
        stepDirName, currentIndex, buildStepInput, ingestValid, ingestInvalid, loadMaxReopenCount.</description>
      <deviation></deviation>
    </step>
    <step id="S-3" status="done">
      <description>fs orchestration in supervisor.ts: prepare (create/advance state, scaffold step dir,
        resolve skillList, write input.json), ingest (validate output, approval/repair/escalate
        branch), dryRun (compute plan, no writes). Every written JSON validated via the shared Ajv
        factory.</description>
      <deviation></deviation>
    </step>
    <step id="S-4" status="done">
      <description>cli/src/commands/continue.ts wired into cli/src/cli.ts: flags for prepare/ingest/
        dry-run, archetype resolution, routing-based skillList with base-skill fallback.</description>
      <deviation></deviation>
    </step>
    <step id="S-5" status="done">
      <description>.claude/skills/continue/SKILL.md thin prose wrapper documenting prepare → Agent
        dispatch → ingest, dispatch descriptor, blocked/escalated/done outputs, and --dry-run.</description>
      <deviation></deviation>
    </step>
    <step id="S-6" status="done">
      <description>cli/tests/supervisor.test.ts: pure-function tests + fs orchestration tests using
        in-process mkdtemp temp dirs. Full suite green (70 pass / 0 fail).</description>
      <deviation>fs tests use in-process node fs temp dirs (mkdtempSync) rather than spawning the CLI,
        because the sandbox does not reliably share newly-created dirs with subprocesses (same issue
        noted in TASK-014). The command layer was additionally smoke-tested manually (dry-run + usage).</deviation>
    </step>
  </implementation-steps>

  <acceptance-criteria-check>
    <criterion id="AC-1" status="done">
      <description>No state.json + backend-feature → state.json created (currentStepId=analyze,
        stepOrder=5 steps), STEP-001-analyze/input.json built, analyst dispatched, valid output →
        approval.json pending + state awaiting_approval.</description>
      <verification>Test "first run creates state, scaffolds STEP-001-analyze, and ingest parks
        awaiting_approval": descriptor role analyst/action start; state currentStepId analyze, 5-step
        order; input.json present; after valid output, approval.json status pending and state
        awaiting_approval.</verification>
    </criterion>
    <criterion id="AC-2" status="done">
      <description>state.json with analyze approved → advance to design, STEP-002-design/input.json,
        architect dispatched, valid output → approval.json pending + awaiting_approval.</description>
      <verification>Test "advances to design once the analyze step is approved": with an approved
        STEP-001-analyze/approval.json, prepare returns stepId design/role architect/action advance and
        creates STEP-002-design/input.json; state.currentStepId becomes design.</verification>
    </criterion>
    <criterion id="AC-3" status="done">
      <description>Output fails schema validation → validation.json with errors, repairRequired=true,
        reopenCount incremented, step reopened with error context in new input.json.</description>
      <verification>Test "invalid output records validation errors, reopens the step, and increments
        reopenCount": validation.json.schemaValid false with errors; state reopenCount 1,
        repairRequired true, status in-progress; new input.json context carries repairErrors.</verification>
    </criterion>
    <criterion id="AC-4" status="done">
      <description>Step reopened maxReopenCount times, validation fails again → status escalated,
        accumulated validation errors reported.</description>
      <verification>Test "escalates when the reopen budget is exceeded": with reopenCount 3 and
        maxReopenCount 3, an invalid output yields escalated=true, state.status escalated. Pure-function
        test also walks reopens 1..3 then escalation at the 4th failure.</verification>
    </criterion>
    <criterion id="AC-5" status="done">
      <description>--dry-run → prints resolved archetype (flat step list), skill composition, and the
        step input that would be built; no agent dispatched, no state changes written.</description>
      <verification>Test "--dry-run computes the plan without writing state or step directories":
        plan has 5 resolvedSteps, currentStepId analyze, skillList contains nit:analyze, input built;
        no state.json and no STEP dir created. Confirmed manually via the CLI command too.</verification>
    </criterion>
  </acceptance-criteria-check>

  <dod-check>
    <item id="DOD-1" status="done">All acceptance criteria passed</item>
    <item id="DOD-2" status="done">Tests written and passed — 70 pass / 0 fail across 6 files</item>
    <item id="DOD-3" status="done">Code review passed</item>
    <item id="DOD-4" status="done">No critical tech debt introduced</item>
  </dod-check>

</steps>
