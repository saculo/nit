# Review — Task 21: Rewrite nit:review for JSON Step Output

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-18) at first pass. Two findings were raised during review — RV-1 fixed within
    this task, RV-2 split out as TASK-027 rather than fixed here. Both are recorded below.
  </verdict-history>

  <input-validation-deviation>
    First review since TASK-017 that did **not** have to work around the v1 Step 0 problem, because
    this task is the fix for it. The reviewed skill now reads `input.json` and `context.priorOutputs`,
    so the review could be conducted against the artifacts the pipeline actually produces.

    Two deviations remain. The reviewed task's own artifacts are still v1 prose (`TASK.md`, and this
    `REVIEW.md`), because this repository's `.nit/` workspace has not migrated — TASK-026 puts that
    migration explicitly out of scope. So the skill now forbids writing `REVIEW.md` while the workspace
    reviewing it still uses one. That inconsistency is real, understood, and deliberately deferred; it
    resolves when the workspace migrates, not before.

    Second, implementation and review shared a session again. Mitigated by re-deriving every claim
    from execution and by adversarially testing the fix (see RV-1 verification), but it is not
    independent review. CodeRabbit has not yet seen this branch.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      The rewritten skill reads `context.priorOutputs` for the implement, design, and analyze outputs
      and emits a `review-result`. Verified end-to-end rather than by reading: a task staged at the
      review step had `STEP-003-implement/output.json` threaded into `STEP-004-review/input.json` with
      `nit:review` present in the resolved `skillList`, and a review-result ingested to
      `awaiting_approval`. Ten schema tests cover the output shape, which previously had none.
    </criterion>
    <criterion id="AC-2" result="pass">
      Findings are severity-graded `comments[]` entries. The negative cases carry the weight: a comment
      without a `message`, without a `severity`, or with a severity outside `info|warning|error` is
      rejected, as is the v1 verdict string `rework-requested`, which is not in the schema enum. The
      skill states that an `approved` verdict alongside any `error` comment is a contradiction.
    </criterion>
    <criterion id="AC-3" result="pass">
      The skill documents the TASK-018 blocked contract with a worked example and the correct
      reason/detail pairings, and a test asserts a blocked result validates at the review step. The
      boundary is drawn explicitly and correctly: a change the reviewer judges bad is
      `changes-requested` or `rejected`, not blocked — blocking is for a review that cannot be
      performed at all. Without that line the blocked contract would have become a way to avoid
      issuing a verdict.
    </criterion>
    <criterion id="AC-4" result="pass">
      No `STEPS.md` or `IMPLEMENTATION.md` references remain. The two `REVIEW.md` mentions both
      instruct against writing it, which is what the criterion asks for. The skill's worked example is
      pinned by a test, so an agent copying it cannot be handed a validation failure — the failure mode
      that would make a documented example worse than none.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified above, AC-1 by execution.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 120 pass, 0 fail (12 added: 10 for the review output shape, 2 for step-skill
      resolution). Reproduced by the reviewer. The resolution test was additionally verified
      adversarially: reverting the directory rename makes it fail across all six archetypes.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed, RV-2 split out as TASK-027 with rationale.</item>
    <item id="DOD-4" result="pass">
      No critical tech debt introduced. One structural limitation is accepted and disclosed rather than
      hidden: see the note on criteria checks.
    </item>
  </dod-check>

  <architecture-conformance result="pass">
    ADR-0005 is respected — one `output.json`, no `REVIEW.md`, no PR creation, and the skill explicitly
    forbids itself from writing `approval.json` or touching `state.json`. ADR-0003 holds: the skill
    invokes the CLI validator on its output before finishing.

    ADR-0004 is respected in a way worth naming, because the v1 skill violated it. The v1 review
    updated `TASK.md` status and `STEPS.md` DoD items itself — a skill performing state transitions.
    The rewrite removes that entirely and states that the verdict does not move the task: `/nit:approve`
    and `/nit:reject` do. That is the correct division and it closes a real v1 inconsistency rather
    than merely porting the file to JSON.

    The skill mirrors the established v2 step-skill structure (Invocation, Inputs, Procedure, Output
    shape, When you cannot proceed, Rules), so the five step skills are now consistent with each other.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. No absolute paths are written into any
    committed artifact — the defect class found in TASK-018 as RV-1 does not recur here, checked
    explicitly rather than assumed.
  </security-check>

  <test-quality result="pass">
    Every acceptance criterion maps to at least one test, and the negative cases dominate, which is
    right for a schema contract. `review-result` had **no** coverage before this task despite existing
    in the schema since PHASE-2 — a gap this closes.

    The strongest test is the one added during review: `resolved archetype steps map to existing
    SKILL.md files`, which walks every shipped archetype and asserts each step id resolves to a real
    SKILL.md. It was verified to fail — not merely assumed to work — by reverting the directory rename,
    at which point it reports all six archetypes. Its companion test asserts the not-yet-implemented
    allowlist contains nothing that now exists, so the allowlist cannot silently go stale as TASK-022
    and boundary enforcement land.

    One gap, non-blocking: nothing exercises a review-step blocked result through `ingest` end-to-end,
    only through schema validation. The supervisor path is step-agnostic and covered at the analyze
    step by TASK-018's tests, so this is low risk.
  </test-quality>

  <scope-check result="pass">
    The skill rewrite, the directory rename, and the tests are the task. Two edits reach outside
    `.claude/skills/review/` and both are justified: the `role-routing` template in `nit:init` named
    `task-review` and would have shipped a dangling reference, and the resolution test lives in
    `cli/tests/` because that is where the resolver's tests are.

    Out-of-scope items were respected. PR creation was dropped rather than reimplemented, per the task
    deferring that question to TASK-025. `review-result` was not extended, per the task's instruction
    to prefer `comments[]` over new fields. `.claude/hooks/validate-review.sh` was unwired from the
    frontmatter but the script was left on disk for TASK-026's sweep, matching the TASK-017 precedent.
    RV-2 was deliberately not fixed here despite being tempting — it belongs to the archetype resolver.
  </scope-check>

  <convention-guards>
    <guard description="One canonical artifact per step (ADR-0005)" result="pass">Emits output.json only; explicitly forbids REVIEW.md, approval.json, state.json, and PRs.</guard>
    <guard description="Validate at write time (ADR-0003)" result="pass">The skill's procedure ends with the CLI validator call.</guard>
    <guard description="Skills describe, the CLI transitions (ADR-0004)" result="pass">The v1 skill's status updates are removed; the verdict is a finding, not a transition.</guard>
    <guard description="Blocked contract, not a skill-specific convention (TASK-018)" result="pass">Uses the shared reason codes and detail requirements, with the changes-requested boundary stated.</guard>
    <guard description="Step skill directory matches its step id" result="pass">Fixed by the rename and now pinned across all six archetypes by test.</guard>
    <guard description="No machine-specific paths in committed artifacts" result="pass">Checked; none written.</guard>
  </convention-guards>

  <findings>
    - [critical, fixed] RV-1 — the directory rename that makes `nit:review` resolvable was not pinned
      by any test. `routing-resolver.test.ts` asserted `baseSkillForStep` returns the right *string*
      but nothing asserted the string maps to a file that exists, which is precisely why the original
      defect survived since PHASE-1. Leaving it unpinned would have allowed the exact bug this task
      fixes to return silently, since routing drops a missing skill without error.
    - [critical, split out] RV-2 — `architecture-decision` inherits `rejectionRouting.review =
      "implement"` but removes the `implement` step, so rejecting its review step sets `currentStepId`
      to a step absent from `stepOrder` and the next `prepare` throws. Predates this task, but TASK-021
      makes it reachable: with the review step previously unable to resolve its skill, rejecting a
      review was unlikely; now it is routine. Filed as TASK-027 rather than fixed here.
    - [note] `review-result` has no home for per-criterion verification, so the acceptance-criteria
      checklist is carried as prefixed `comments[]` entries (`AC-1: pass — …`) at the task's explicit
      instruction. The consequence is that "all criteria passed" cannot be machine-verified; it rests
      on the reviewer's `verdict`. Adding optional `criteriaChecks[]` would close it and has precedent
      in TASK-017's additive fields, but nothing consumes it downstream today. Worth revisiting when
      `nit:phase-summary` (TASK-023) starts aggregating review results.
    - [note] The comment message-prefix convention (`AC-1:`, `KD-3:`, `security:`) is documented prose,
      not schema-enforced. It is the only thing making a flat comment list traceable back to the
      checklist, so it will drift unless something checks it. Not worth enforcing yet.
    - [note] Recording passing checks at `info` severity is a deliberate choice with a cost: review
      outputs will be longer than v1's findings-only lists. The benefit is that a reader can tell a
      verified criterion from an unexamined one, which the v1 format could not express.
    - [note] `.claude/hooks/validate-review.sh` is now orphaned, joining `validate-design.sh` and
      `validate-implement.sh`. Three of ten hooks are now dead. TASK-026 owns the sweep.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      Added `every shipped step id resolves to a skill on disk` to `routing-resolver.test.ts`: it
      resolves all six shipped archetypes and asserts each step id maps to an existing SKILL.md, with
      an explicit allowlist for `qa` (TASK-022) and `boundary-check`. A second test asserts the
      allowlist contains nothing that already exists, so it shrinks as the migration lands instead of
      rotting. Verified by reverting the rename: the test fails and names all six archetypes; restored,
      13 pass.
    </item>
    <item id="RV-2" result="split out">
      Filed as TASK-027 with the reproduction, the root cause (`resolveArchetype` deletes routing
      entries keyed by a removed step but not entries targeting one), and three acceptance criteria —
      the third requiring resolution to fail loudly on an unsatisfiable invariant, since the one-line
      data fix would leave the class open for the next archetype. Added to PHASE-3 draft tasks. Not
      fixed here: it is an archetype-resolver defect, and folding it into a skill rewrite would be the
      scope creep this skill's own rules tell a reviewer to flag.
    </item>
    <verification>
      `bun test` — 120 pass, 0 fail. AC-1 additionally re-verified end-to-end through the CLI after
      the final change.
    </verification>
  </finding-resolution>

</review>
