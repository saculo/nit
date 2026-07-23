# Implementation — Task 16: nit:approve, nit:reject, and nit:analyze

<implementation>

  <summary>
    Closes the approval loop the supervisor opened and adds the analyze step skill. Following
    ADR-0004, approve and reject are deterministic state transitions in the CLI: `approveStep` writes
    an approved approval.json to the current step directory and advances the task via the existing
    `advanceState` (terminal `done` + completedAt at the last step); `rejectStep` writes a rejected
    approval.json and reopens `rejectionRouting[currentStepId]` from the resolved archetype (review →
    implement for the base archetype). Both require the task to be at `awaiting_approval` and operate
    on the current active step (Q-1), exposed via `nit approve` / `nit reject` commands and thin
    `nit:approve` / `nit:reject` skill wrappers.

    `nit:analyze` is a prose step skill for the analyst role that produces an `analysis-result`
    output.json (requirements findings, risks, recommendations, and a proposed concrete archetype per
    U-11). The `analysis-result` $def gained an optional `proposedArchetype` string so the proposal
    validates against `step-output.schema.json`. Every supervisor-written JSON is validated at write
    time.
  </summary>

  <files-changed>
    <file action="modified">cli/schemas/step-output.schema.json</file>
    <file action="modified">cli/src/supervisor.ts</file>
    <file action="modified">cli/src/cli.ts</file>
    <file action="created">cli/src/commands/approve.ts</file>
    <file action="created">cli/src/commands/reject.ts</file>
    <file action="created">cli/tests/approval.test.ts</file>
    <file action="created">.claude/skills/approve/SKILL.md</file>
    <file action="created">.claude/skills/reject/SKILL.md</file>
    <file action="created">.claude/skills/analyze/SKILL.md</file>
  </files-changed>

  <deviations>
    Matches the approved design. AC-3's "completed" is realised as the schema's existing terminal
    status `done` (KD-2 vocabulary reconciliation) rather than a new enum value. The analysis-result
    schema change is additive (optional field), keeping prior analysis outputs valid. approve/reject
    reuse the supervisor's pure functions (advanceState, currentIndex, stepDirName) rather than
    duplicating transition logic.
  </deviations>

  <tech-debt>
    - The supervisor's prepare "awaiting_approval + approved → advance" branch (TASK-015) is now
      redundant because approve advances the pointer itself (KD-6). Left in place as a harmless
      fallback; a later cleanup can remove it.
    - reject resets reopenCount to 0 when reopening the routing target, treating a rejection as a
      fresh attempt at that step. If future policy wants rejection counts tracked separately, that
      would be an additional field.
    - approve/reject command happy paths are covered by in-process function tests; there is no
      spawn-level integration test, consistent with the sandbox fs limitation noted in TASK-014/015.
  </tech-debt>

  <self-check>
    - AC-1: pass — approve at design writes approved approval.json (timestamp/comment) and advances
      currentStepId to implement (in-progress).
    - AC-2: pass — reject at review writes rejected approval.json and reopens implement per
      rejectionRouting; reopenedStep=implement.
    - AC-3: pass — approve at qa (last step) → status done + completedAt, done=true.
    - AC-4: pass — analysis-result with findings/risks/recommendations/proposedArchetype validates
      against step-output; missing-findings variant is rejected.
    - DoD: DOD-1 done, DOD-2 done (78 pass / 0 fail), DOD-3 pending (reviewer), DOD-4 done.
  </self-check>

</implementation>
