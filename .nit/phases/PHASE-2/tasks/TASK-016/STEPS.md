# Steps — Task 16: nit:approve, nit:reject, and nit:analyze

<steps>

  <implementation-steps>
    <step id="S-1" status="done">
      <description>Extend the analysis-result $def in cli/schemas/step-output.schema.json with an
        optional proposedArchetype string (KD-5).</description>
      <deviation></deviation>
    </step>
    <step id="S-2" status="done">
      <description>Add to cli/src/supervisor.ts: pure rejectState + buildApproval; fs orchestration
        approveStep (verify awaiting_approval, write approved approval.json, advanceState, write state)
        and rejectStep (write rejected approval.json, reopen rejectionRouting target, write state),
        both validating every write.</description>
      <deviation></deviation>
    </step>
    <step id="S-3" status="done">
      <description>Add cli/src/commands/approve.ts and reject.ts; wire both into cli/src/cli.ts.</description>
      <deviation></deviation>
    </step>
    <step id="S-4" status="done">
      <description>Create thin skills .claude/skills/approve/SKILL.md and reject/SKILL.md, and the prose
        step skill analyze/SKILL.md (analyst role, analysis-result with findings/risks/recommendations
        + proposedArchetype).</description>
      <deviation></deviation>
    </step>
    <step id="S-5" status="done">
      <description>cli/tests/approval.test.ts: approve/reject via in-process temp dirs (AC-1/AC-2/AC-3)
        plus guards, and a step-output schema test for a representative analyze output with
        proposedArchetype (AC-4). Full suite green (78 pass / 0 fail).</description>
      <deviation>fs tests use in-process mkdtemp temp dirs (per the CLI test convention); command
        layer smoke-tested manually (approve advances, usage exits 2, reject refuses non-awaiting).</deviation>
    </step>
  </implementation-steps>

  <acceptance-criteria-check>
    <criterion id="AC-1" status="done">
      <description>Design step awaiting_approval + nit:approve with comment → approval.json approved +
        timestamp, state.json advances currentStepId to next step.</description>
      <verification>Test "approve at the design step…": approval.json status approved, timestamp NOW,
        comment recorded; state.currentStepId becomes implement, status in-progress. Confirmed via the
        CLI command manually.</verification>
    </criterion>
    <criterion id="AC-2" status="done">
      <description>Review step awaiting_approval + nit:reject → approval.json rejected, state.json
        reopens implement (rejectionRouting review → implement).</description>
      <verification>Test "reject at the review step reopens implement…": approval.json rejected with
        comment; result.reopenedStep implement; state.currentStepId implement, status in-progress.</verification>
    </criterion>
    <criterion id="AC-3" status="done">
      <description>Last step awaiting_approval + nit:approve → status done (AC "completed") + completedAt.</description>
      <verification>Test "approve at the last step completes the task…": result.done true, state.status
        done, timestamps.completedAt set. ("completed" reconciled to the schema's terminal status done.)</verification>
    </criterion>
    <criterion id="AC-4" status="done">
      <description>Analyze output.json contains an analysis-result with requirements analysis, risks, and
        a proposed archetype, validating against step-output.schema.json.</description>
      <verification>Test "an analysis-result with findings, risks, and proposedArchetype is schema-valid"
        passes; the missing-findings variant is rejected. proposedArchetype added to the schema $def;
        nit:analyze/SKILL.md documents producing this shape.</verification>
    </criterion>
  </acceptance-criteria-check>

  <dod-check>
    <item id="DOD-1" status="done">All acceptance criteria passed</item>
    <item id="DOD-2" status="done">Tests written and passed — 78 pass / 0 fail across 7 files</item>
    <item id="DOD-3" status="done">Code review passed</item>
    <item id="DOD-4" status="done">No critical tech debt introduced</item>
  </dod-check>

</steps>
