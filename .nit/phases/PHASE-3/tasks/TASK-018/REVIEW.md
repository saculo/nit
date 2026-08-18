# Review — Task 18: Blocked-Step Escalation Contract for Step Skills

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-18) at first pass, after three findings raised in external review (PR #21) and
    one found during this review were fixed and re-verified. No rework cycle was needed: every finding
    was closed before the verdict was issued, and each is recorded below with its resolution.
  </verdict-history>

  <input-validation-deviation>
    Two deviations from the standard review procedure, both recorded rather than worked around.

    First, the v1 `nit:review` Step 0 requires `STEPS.md` and `IMPLEMENTATION.md`, which ADR-0005
    retired in TASK-017. As in that task's review, this one was conducted against `TASK.md`, the branch
    diff (`feature/TASK-017...feature/TASK-018`), the test suite, and direct execution of the CLI. This
    is the second consecutive task to hit the same wall and remains the strongest argument for
    sequencing the `nit:review` rewrite next.

    Second, and more significant: the same session implemented and reviewed this task. That is not
    independent review. It was mitigated by treating CodeRabbit's automated review of PR #21 as the
    external pass — its three findings are recorded verbatim below with their resolutions — and by
    re-deriving every claim from execution rather than from the implementation's own report. It is not
    a substitute for a second human. CodeRabbit's re-review of the final commit had not landed when
    this verdict was written; if it raises anything further, this file should gain a rework cycle.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      A blocked result validates against step-output.schema.json, and the negative cases are the
      substantive part: a reason code without an `explanation` is rejected (`minLength: 1`), an
      unrecognised reason code is rejected (closed enum), and — after finding CR-3 — each
      specialist-reported reason is rejected without its own `detail` field. Verified through the CLI
      validator on a real file, not only through the in-process test harness.
    </criterion>
    <criterion id="AC-2" result="pass">
      Ingesting a schema-valid blocked output sets `state.json.status` to `blocked`, leaves
      `reopenCount` untouched, sets `repairRequired` false, writes no repair `input.json`, and writes
      no `validation.json` — nothing failed validation. Asserted both from a fresh task and from a task
      carrying `reopenCount: 2`, so budget preservation is proven rather than incidentally true at
      zero. Confirmed end-to-end through `nit continue --ingest`.
    </criterion>
    <criterion id="AC-3" result="pass">
      A step directory with no `output.json` no longer throws. State becomes `blocked` with reason
      `no-output`, `reopenCount` is unchanged, no repair input is written, and `validation.json`
      records the miss with `action: "block"`. Confirmed against the real CLI; the pre-change behaviour
      (`throw new Error("No output.json in <dir>")`) is gone.
    </criterion>
    <criterion id="AC-4" result="pass">
      `design/SKILL.md` replaces "stop and report that it needs splitting" with an instruction to emit
      a `needs-splitting` blocked result, carries a worked example, and documents the reason table. The
      example in the skill was executed against the validator and passes — so an architect copying it
      produces a valid artifact rather than a rejection.
    </criterion>
    <criterion id="AC-5" result="pass">
      `implement/SKILL.md` routes the major-deviation rule (procedure step 4), the contradictory-design
      rule (step 1), and the unsatisfiable-criterion rule (step 6) to the blocked contract, and draws
      the line against deviations explicitly: minor and moderate are noted and work continues, only
      major blocks. Its worked example validates.
    </criterion>
    <criterion id="AC-6" result="pass">
      Analyze, design, and implement all use the one contract, with no skill-specific convention
      remaining. `analyze/SKILL.md` additionally guards the boundary — ambiguity is a `risk`, not a
      block — which prevents the contract becoming an escape hatch from hard analysis.
      Scope note: AC-6 originally also covered `nit:review` and `nit:qa`. Neither exists on the v2
      contract, so the criterion was unsatisfiable as written while the DoD required all criteria to
      pass. It was rescoped to the three skills this task changes, and the review/qa conformance
      requirement was relocated to their PHASE-3 draft tasks and to a phase success criterion. See CR-2.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All six acceptance criteria verified above.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 108 pass, 0 fail (12 added: 7 for the core contract, 5 for the detail conditionals).
      Reproduced by the reviewer, not taken on report. Every AC maps to at least one test.
    </item>
    <item id="DOD-3" result="pass">
      Code review — CR-1 through CR-3 from PR #21 and RV-1 from this review are all fixed and
      re-verified. See findings and resolution. The independence caveat above applies.
    </item>
    <item id="DOD-4" result="pass">
      No critical tech debt introduced. One pre-existing item is enlarged and disclosed rather than
      hidden: see the note on `oneOf` error volume.
    </item>
  </dod-check>

  <architecture-conformance result="pass">
    D-1 (blocked as a `blocked-result` branch in the `result` `oneOf`, discriminated by `resultType`)
    is implemented as decided. `result` stays required, every step type can emit it without a
    per-step-type variant, and supervisor detection is a single `resultType === "blocked"` check in
    `blockedResultOf`. No partial result is carried alongside the block, as D-1 specified.

    D-2 (park immediately, no approval gate) is implemented: `ingestBlocked` transitions straight to
    `blocked` and never routes through `awaiting_approval`, matching AC-2.

    ADR-0004 (deterministic logic as tested CLI code) is respected — detection, transition, and the
    missing-output path are all in `supervisor.ts` with tests; the skills only describe what to emit.
    ADR-0003 (validate at write time) holds: `validation.json` and `state.json` are both written
    through the validating `writeJson`, so the new `block` action and `blocked` status were proven
    schema-legal by construction. ADR-0005 is untouched — the blocked result is still one output.json.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. One information-disclosure smell was found and
    fixed during this review: the `no-output` message interpolated the absolute step directory path
    into `validation.json`, a committed artifact. See RV-1 — this is TASK-017's RW-2 recurring at a new
    site, which is worth noting as a pattern rather than a one-off.
  </security-check>

  <test-quality result="pass">
    The negative cases carry the weight, which is right for a contract whose whole purpose is to
    constrain: a reason code without an explanation, an unrecognised reason code, an empty `taskTypes`
    array, a detail object belonging to a different reason, and a malformed blocked result are all
    asserted to be rejected. The last of these is the important one — it proves the blocked path cannot
    be used to bypass validation, which would otherwise have been an obvious hole.

    Two tests assert behaviour that the acceptance criteria only imply, and both would have caught real
    regressions: `reopenCount: 2` is preserved across a block (not merely zero staying zero), and
    `prepare`/`dryRun` both refuse to advance a blocked task. Tests use in-process temp dirs
    throughout, with no on-disk fixture directories added.

    One gap, non-blocking: nothing exercises a blocked result at the `implement` or `design` step
    specifically — all supervisor-level blocked tests run at `analyze`. The transition is step-agnostic
    by construction, so this is low risk, but a single parameterised case would close it.
  </test-quality>

  <scope-check result="pass">
    Task module is `@nit/cli`, and the schema, supervisor, and test changes sit there. The four
    `.claude/skills/` changes are required by AC-4, AC-5, and AC-6 and are the point of the task, not
    incidental. `PHASE.md` was edited only to relocate the AC-6 conformance requirement (CR-2), which
    is the minimum needed to keep the criterion from being orphaned.

    Out-of-scope items were respected: no unblock command was added, nothing acts on a `needs-splitting`
    report, and the repair/reopen budget logic is untouched beyond leaving it alone for blocked
    outputs. No unrelated refactoring.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic as tested CLI code (ADR-0004)" result="pass">Detection, transition, and missing-output handling live in supervisor.ts with tests; skills only describe the payload.</guard>
    <guard description="Every generated JSON validated at write time (ADR-0003)" result="pass">state.json and validation.json go through the validating writeJson; the new `block` action and `blocked` status are proven legal by construction.</guard>
    <guard description="Additive-only schema evolution" result="pass">A new oneOf branch and a new enum value; no field removed or retyped, no existing `required` list changed. All 96 pre-existing tests pass unmodified.</guard>
    <guard description="One canonical artifact per step (ADR-0005)" result="pass">A blocked report is still a single output.json; no new prose artifact.</guard>
    <guard description="No machine-specific paths in committed artifacts (TASK-017 RW-2)" result="pass">Violated on first pass, fixed as RV-1, now pinned by an assertion that the message excludes the task dir.</guard>
    <guard description="Blocked state is honoured, not merely recorded" result="pass">prepare and dryRun both refuse to advance a blocked task, asserted by test.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] CR-3 — `detail` was optional and so were all its fields, so a `needs-splitting`
      result with no `detail.taskTypes` validated and parked the task carrying the verdict but none of
      the facts a human needs to act on. The same held for `conflictsWith` and `criterionId`, and an
      empty `taskTypes: []` also passed. Raised by CodeRabbit on PR #21.
    - [major, fixed] CR-1 — `continue/SKILL.md` simultaneously forbade hand-editing `state.json` and
      named editing `state.json` as the way to resume a blocked task, while the task defers an unblock
      command to PHASE-4. The two rules left no supported resume path at all. Raised by CodeRabbit.
    - [minor, fixed] CR-2 — AC-6 was both an acceptance criterion and explicitly deferred, while the
      DoD requires every criterion to pass, making task completion undefinable. Raised by CodeRabbit;
      the `<deferred>` annotation was this reviewer's own construction and was the wrong instrument.
    - [major, fixed] RV-1 — the `no-output` explanation interpolated the absolute step directory into
      `validation.json`. With an absolute `--task-dir` a committed artifact records a developer's home
      directory, which is meaningless in any other checkout. Found during this review by reading the
      artifact produced by a real CLI run rather than the code alone. This is the same defect class as
      TASK-017 RW-2, reintroduced at a new site within one task of the original being fixed.
    - [note] The `oneOf` error-volume issue disclosed in TASK-017 is enlarged: a seventh branch means a
      malformed output now yields more branch errors, all of which land in `repairErrors` and are
      handed to a specialist on reopen. Still pre-existing, still worth an `if/then` dispatch on
      `resultType`; the conditionals added for CR-3 are a precedent for how that would look.
    - [note] `nit:approve` and `nit:reject` reject a blocked task with `task status is "blocked",
      expected awaiting_approval`. That is correct behaviour and the message is clear, but it means the
      task's own out-of-scope line claiming a blocked task is resumable "by the existing approval/reject
      machinery" was never true. The line was corrected to point at the documented manual transition.
    - [note] `pending` and `failed` remain declared in task-state.schema.json with nothing writing
      them. Out of scope here, but the schema now overstates the reachable state space by two values.
  </findings>

  <finding-resolution>
    <item id="CR-3" result="fixed">
      Three `if`/`then` conditionals in `blocked-result` require the applicable detail field per
      reason: `needs-splitting` → `detail.taskTypes`, `contradictory-input` → `detail.conflictsWith`,
      `criterion-unsatisfiable` → `detail.criterionId`. `no-output` is exempt, since only the
      supervisor emits it and it has no detail to supply. `minItems: 1` and `minLength: 1` close the
      empty-value gap. Five tests cover missing detail, mismatched detail, and the empty list per
      reason. The three skills were updated to mark the fields **Requires**, and each skill's worked
      example was re-validated so a copying agent is not handed a rejection.
    </item>
    <item id="CR-1" result="fixed">
      `continue/SKILL.md` gains an "Unblocking a blocked task" section documenting the one sanctioned
      hand-edit, with its target state (`status: "in-progress"`, `repairRequired: false`,
      `reopenCount` untouched, `currentStepId` within `stepOrder`), a validation command, and the
      invariant that breaks the supervisor if ignored. It leads with fixing the cause first — a task
      resumed unchanged blocks again on the same step. The blanket rule now names this as its single
      explicit exception. The procedure was executed end-to-end: blocked → prepare refuses → edit →
      `task-state` validates → prepare returns `action: "resume"`.
    </item>
    <item id="CR-2" result="fixed">
      AC-6 rescoped to analyze, design, and implement. `nit:review` / `nit:qa` conformance moved to
      their two PHASE-3 draft-task entries and to a new phase success criterion, so the requirement
      survives outside this task rather than being dropped, and TASK-018's DoD now contains only
      criteria it can satisfy.
    </item>
    <item id="RV-1" result="fixed">
      The message now names the step directory relatively (`No output.json in STEP-001-analyze`).
      A test asserts the recorded message contains the step dir name and does not contain the task dir,
      so the regression cannot recur silently. Verified against a real CLI run.
    </item>
    <verification>
      `bun test` — 108 pass, 0 fail. All six acceptance criteria additionally re-verified end-to-end
      against the CLI on temporary task directories after the final change.
    </verification>
  </finding-resolution>

  <pr-url>https://github.com/saculo/nit/pull/21</pr-url>

</review>
