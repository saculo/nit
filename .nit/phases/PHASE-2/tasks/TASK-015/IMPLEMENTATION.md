# Implementation — Task 15: Deterministic Supervisor (nit:continue)

<implementation>

  <summary>
    The deterministic supervisor is implemented as a tested CLI state machine (cli/src/supervisor.ts)
    with a thin nit:continue skill wrapper, per ADR-0004. A step is processed in two CLI phases around
    the LLM-only Agent dispatch: `prepare` creates or advances state.json, scaffolds
    STEP-NNN-<stepId>/, resolves the skill list (via TASK-014's routing engine, falling back to the
    base step skill), writes input.json, and returns a dispatch descriptor; the skill dispatches the
    specialist; `ingest` validates the specialist's output.json against step-output.schema.json and
    branches — valid output writes a pending approval.json and parks the task at awaiting_approval,
    while invalid output writes validation.json, increments reopenCount, and either reopens the step
    with the errors embedded in a fresh input.json or, once reopenCount exceeds maxReopenCount
    (config/supervisor.json, default 3), escalates. A --dry-run mode reuses the prepare computation
    with all side effects suppressed.

    The state-transition logic is factored into pure functions (initialState, advanceState,
    ingestValid, ingestInvalid, stepDirName, buildStepInput) that are unit-tested directly against the
    acceptance criteria; the fs orchestration (prepare/ingest/dryRun) wraps them and validates every
    written JSON at write time via the shared Ajv factory (ADR-0003). Step directories are numbered by
    resolved-archetype position (U-6). The supervisor owns creation of both state.json and per-step
    routing.json (KD-6, resolving Q-1).
  </summary>

  <files-changed>
    <file action="created">cli/src/supervisor.ts</file>
    <file action="created">cli/src/commands/continue.ts</file>
    <file action="created">cli/tests/supervisor.test.ts</file>
    <file action="created">.claude/skills/continue/SKILL.md</file>
    <file action="created">.nit/adr/0004-supervisor-state-machine-as-tested-cli-code.md</file>
    <file action="modified">cli/src/cli.ts</file>
    <file action="modified">cli/schemas/task-state.schema.json</file>
  </files-changed>

  <deviations>
    Per explicit decision-maker direction, the supervisor overrides clarification A-1 (which framed it
    as a prose LLM skill): the state machine is tested CLI code, with the prose skill reduced to the
    Agent dispatch only. This is recorded in ADR-0004 and reflected across DESIGN.md KD-1.

    task-state.schema.json was extended (status enum += awaiting_approval, escalated) — a necessary
    supporting change in the cli module, since AC-1/AC-2/AC-4 require those statuses and they did not
    exist. Consistent with the TASK-013/TASK-014 pattern of touching cli/ for prerequisite schema work.

    The fs-orchestration tests use in-process node temp dirs (mkdtempSync) instead of spawning the CLI,
    because the sandbox does not reliably expose newly-created directories to subprocesses (same
    limitation encountered in TASK-014). The command layer was smoke-tested manually (dry-run writes
    nothing; usage exits 2).
  </deviations>

  <tech-debt>
    - The "approved" signal that lets prepare advance is read from the current step's approval.json;
      setting that status is TASK-016's job (approve/reject). Until then, advancing requires the
      approval.json to be marked approved out of band (as the AC-2 test does).
    - The command's routing integration resolves skills for a single target module; multi-target
      (cross-module) tasks would need the target list threaded through from task.json — deferred to
      the supervisor/tasks integration once task.json carries multiple targetModules.
    - prepare's happy path is covered by direct in-process calls; there is no spawn-level integration
      test for the full command due to the sandbox fs limitation noted above.
  </tech-debt>

  <self-check>
    - AC-1: pass — first-run prepare creates state (analyze, 5 steps) + STEP-001-analyze/input.json;
      valid output ingest → approval.json pending + awaiting_approval.
    - AC-2: pass — approved analyze advances to design (STEP-002-design/input.json, role architect).
    - AC-3: pass — invalid output writes validation.json, reopenCount=1, repairRequired, reopened
      input.json carries repairErrors.
    - AC-4: pass — reopenCount 3 + maxReopenCount 3 + invalid output → escalated.
    - AC-5: pass — dry-run returns the plan (5 steps, skillList, input) and writes nothing.
    - DoD: DOD-1 done, DOD-2 done (70 pass / 0 fail), DOD-3 pending (reviewer), DOD-4 done.
  </self-check>

</implementation>
