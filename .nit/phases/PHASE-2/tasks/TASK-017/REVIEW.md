# Review — Task 17: Rewrite nit:design and nit:implement for JSON Output

<review>

  <verdict>rework-requested</verdict>

  <input-validation-deviation>
    This task's own execution did not produce STEPS.md or IMPLEMENTATION.md, which the v1 nit:review
    Step 0 requires, and TASK.md status was `ready` rather than `in-progress`. Both are direct
    consequences of the change under review: ADR-0005 retires those prose artifacts, and the v1
    orchestration that maintained the status field was not part of this task. The review was therefore
    conducted against TASK.md, DESIGN.md, the branch diff (`main...feature/TASK-017`), and the test
    suite. This is the concrete instance of DESIGN.md Q-3 and is itself evidence that nit:review needs
    its PHASE-3 rewrite before the next task runs through this pipeline. Recorded as a note, not held
    against the implementation.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      A design-result carrying `decisions` plus the new `components` / `interfaces` / `filePlan` fields
      validates against step-output.schema.json — asserted in cli/tests/step-output-shapes.test.ts and
      confirmed independently through the CLI validator. nit:design's documented output shape matches.
    </criterion>
    <criterion id="AC-2" result="pass">
      An implementation-result with `filesChanged` and the new `notes` / `tests` fields validates;
      negative cases (missing `tests.outcome`, unknown outcome value) are rejected. nit:implement's
      documented output shape matches.
    </criterion>
    <criterion id="AC-3" result="pass">
      `prepare` writes `context.priorOutputs` into the implement step's input.json, keyed by step id and
      pointing at STEP-002-design/output.json; the test reads the design summary back through the
      supplied path, so the pointer is proven usable rather than merely present. nit:implement's Inputs
      section instructs the engineer to read `priorOutputs.design`. See RW-2 for the path form.
    </criterion>
    <criterion id="AC-4" result="pass">
      adrCandidates validate alongside a design-result, and an incomplete candidate is rejected. Both
      rewritten skills document emitting candidates and explicitly forbid writing into .nit/adr/
      directly, which keeps ADR numbering behind the approval gate.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified above.</item>
    <item id="DOD-2" result="pass">
      `bun test cli/tests/` — 94 pass, 0 fail, 8 files. 16 tests added across two files. Result
      reproduced by the reviewer, not taken on report.
    </item>
    <item id="DOD-3" result="fail">
      Code review — see rework items RW-1 and RW-2.
    </item>
    <item id="DOD-4" result="pass">
      No critical tech debt introduced. The oneOf error-noise issue in findings is pre-existing and was
      disclosed rather than hidden.
    </item>
  </dod-check>

  <architecture-conformance result="fail">
    KD-1 (output.json as sole artifact), KD-2 (additive optional schema fields, no `required` changes),
    KD-4 (hook wiring removed, scripts left for the PHASE-3 sweep), KD-5 (adrCandidates not written to
    .nit/adr/), and KD-6 (validate at write time) are all implemented as designed. ADR-0005 is present
    and the skills cite it.

    KD-3 is implemented in the right place — `priorOutputs` sits beside `stepDirName` in the supervisor
    rather than as prose in the skills, exactly as the design argued — but deviates from its stated
    contract in two ways, both flagged below: the paths are not repo-relative as KD-3 specifies (RW-2),
    and the design's claim that `input.json` becomes self-describing does not hold for `dryRun`, which
    still reports an input without priorOutputs (RW-1). Neither deviation was declared.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The one security-adjacent observation is
    RW-2: taskDir-prefixed paths mean an absolute `--task-dir` writes developer home directory paths
    into a committed artifact, which is an information-disclosure smell rather than a vulnerability.
  </security-check>

  <test-quality result="pass">
    Every AC maps to at least one test, and the negative cases are the valuable part: schema tests
    assert that a component without a responsibility, an unknown filePlan action, a tests block without
    an outcome, and a mismatched resultType are all rejected — so the additive fields are proven to
    constrain, not merely to be accepted. Backward compatibility is asserted explicitly for both result
    types. The AC-3 test reads the design output back through the threaded path. Assertions check
    behaviour, tests use in-process temp dirs, and no on-disk fixture directories were added.

    One gap, non-blocking: no test covers priorOutputs on the `reopen` path (repairRequired), where
    both priorOutputs and repairErrors should appear together in the same input.json.
  </test-quality>

  <scope-check result="pass">
    Task module is `.claude/skills`; the supporting cli/ changes (additive schema fields, priorOutputs)
    are necessary to satisfy AC-1/AC-2/AC-3, were justified in the approved design, and follow the
    TASK-016 precedent for additive schema work. Out-of-scope items (nit:review and nit:qa rewrites,
    validation hook execution, state tracking) were not touched. No unrelated refactoring; the orphaned
    hook scripts were deliberately left rather than opportunistically deleted.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic as tested CLI code (ADR-0004)" result="pass">Path resolution lives in supervisor.ts with tests; the skills consume resolved paths.</guard>
    <guard description="Every generated JSON validated at write time (ADR-0003)" result="pass">Both skills invoke the CLI validator on output.json; prepare still writes input.json through the validating writeJson.</guard>
    <guard description="Additive-only schema evolution" result="pass">No required list changed, no field removed or retyped; backward compatibility asserted by test.</guard>
    <guard description="One canonical artifact per step (ADR-0005)" result="pass">Both skills instruct against writing DESIGN.md / STEPS.md / IMPLEMENTATION.md and route other files through artifacts[].</guard>
    <guard description="dryRun reports what prepare would produce" result="fail">See RW-1.</guard>
  </convention-guards>

  <findings>
    - [critical] `dryRun` does not build priorOutputs, so `nit:continue --dry-run` reports an input.json
      that differs from what `prepare` actually writes for every step after the first. The DryRunPlan
      doc comment states it is "what a real prepare would produce" and dryRun's own comment says it
      computes "what prepare would do". Tests stay green only because the existing dry-run test covers
      the first step, where priorOutputs is legitimately absent. See RW-1.
    - [critical] priorOutputs values are `join(taskDir, ...)`, but KD-3 specifies "the repo-relative
      path of that step's output.json". Since `--task-dir` accepts an absolute path, input.json — a
      committed artifact under .nit/ — can be written containing machine-specific absolute paths that
      break for every other checkout. See RW-2.
    - [suggestion] `prepare` mutates the object returned by `buildContext` (`context.priorOutputs = …`).
      Harmless for defaultContext, which returns a fresh object, but a caller-supplied buildContext that
      returns a cached or shared object would be mutated under it. Prefer building a new object.
    - [suggestion] Add a test for the reopen path asserting priorOutputs and repairErrors coexist in the
      regenerated input.json.
    - [note] The `oneOf` construct reports every branch's failures, so a single bad field yields ~13
      errors — which is what lands in `repairErrors` and is handed back to a specialist on reopen. This
      is pre-existing and was disclosed in the PR, but the additive fields enlarge the blast radius.
      `dependentSchemas` or if/then dispatch on `resultType` would isolate the branch. Worth a PHASE-3
      task.
    - [note] `dryRun` already omitted `repairErrors` before this change, so the prepare/dryRun context
      divergence is a pattern rather than a one-off; RW-1 is the moment to factor the context assembly
      into one shared path so the next context field cannot repeat it.
    - [note] `.nit/skills/` was correctly not updated — it has been stale since PHASE-1 and lacks every
      v2 skill. Together with the duplicated `.nit/hooks/`, this remains open as design Q-4.
  </findings>

  <rework-items>
    <item id="RW-1">
      <file>cli/src/supervisor.ts</file>
      <location>dryRun, final input assembly (buildStepInput call); prepare, context assembly</location>
      <issue>
        prepare enriches the context with priorOutputs but dryRun does not, so the dry-run plan
        misreports the input for any step after the first — contradicting both functions' documented
        contract. The same divergence already exists for repairErrors.
      </issue>
      <fix>
        Extract the context assembly used by prepare (buildContext plus the priorOutputs enrichment)
        into a single helper and call it from both prepare and dryRun, so the two cannot drift again.
        Add a dryRun test at the implement step asserting the plan's input carries priorOutputs.design.
      </fix>
    </item>
    <item id="RW-2">
      <file>cli/src/supervisor.ts</file>
      <location>priorOutputs — the `join(taskDir, stepDirName(i, step.id), "output.json")` value</location>
      <issue>
        Paths are emitted taskDir-prefixed rather than repo-relative as KD-3 requires. With an absolute
        --task-dir, the committed input.json records absolute machine-specific paths, which do not
        resolve in another checkout.
      </issue>
      <fix>
        Emit the path relative to the task directory (`STEP-002-design/output.json`) so the value is
        machine-independent and unambiguous, and state in both rewritten skills that priorOutputs paths
        resolve relative to the step directory's parent. Assert the relative form in the existing tests
        instead of comparing against join(dir, …). If absolute paths are preferred for specialist
        convenience, amend KD-3 instead — but do not leave code and design contradicting each other.
      </fix>
    </item>
  </rework-items>

  <pr-url>https://github.com/saculo/nit/pull/20</pr-url>

</review>
