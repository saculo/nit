# Review — Task 27: Rejection Routing Must Target a Step That Exists

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-19) at first pass, after one finding raised during review was fixed.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: v1 prose artifacts, implementation and review in one session, and
    CodeRabbit skipping — seven consecutive pull requests now.

    This is the third consecutive change to CLI code and the second to touch data every archetype
    inherits. The mitigation used throughout — verifying each claim by execution rather than reading —
    is what caught the additional defect recorded as RV-1's sibling below, but it remains one session
    checking itself.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `assertRejectionRoutingResolvable` runs on both inheritance paths, so no archetype can resolve
      with a route naming a step it does not have. Asserted across all six shipped archetypes by a
      parameterised test rather than only on the one that was broken, which is what the scope asked
      for — the defect was visible in one archetype but the class was general.
    </criterion>
    <criterion id="AC-2" result="pass">
      Verified end-to-end through the CLI, which is the only way to prove the original crash is gone:
      rejecting the review of an `architecture-decision` task now reports
      `{"rejectedStep": "review", "reopenedStep": "design"}`, and the following `prepare` returns a
      dispatch descriptor with exit 0 rather than dereferencing `steps[-1]`.
    </criterion>
    <criterion id="AC-3" result="pass">
      Resolution fails naming both ends — `rejecting "review" would reopen "analyze", which is not a
      step` — plus the resolved step list and what to do about it. Confirmed by temporarily breaking
      `bugfix.json` and running `nit archetype bugfix`: exit 1 with that message. The archetype file
      was restored and the restore verified clean.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All three acceptance criteria verified, AC-2 and AC-3 through the CLI.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 229 pass, 0 fail (18 added). Reproduced by the reviewer. The two parameterised
      suites cover every shipped archetype, so a future archetype cannot reintroduce either defect
      without a named failure.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced. One observation about dead data below.</item>
  </dod-check>

  <architecture-conformance result="pass">
    Three design decisions, each a departure from the obvious route and each better for it.

    **Failing loudly rather than self-routing.** The task's own scope proposed self-routing an orphaned
    target as "the obvious candidate". The implementation refused, on the grounds that a silent
    fallback hides an authoring gap — and, more concretely, that self-routing would have been *wrong*
    here: rejecting an `architecture-decision` review should reopen `design`, where the work is, not
    re-run the same review over unchanged material. Deviating from the task's suggestion and saying why
    is the correct handling; taking the suggestion would have produced a resolvable archetype with
    nonsense semantics, which is harder to notice than a crash.

    **Replace rather than merge.** A child's own `rejectionRouting` now replaces the parent's. Merging
    is precisely how the orphan survived: the child removed a step and the parent's entry pointing at
    it came along regardless. This makes removing a step force an explicit decision about rejections,
    which is the decision the author is uniquely placed to make.

    **Guarding `rejectState` as well as resolution.** Resolution is the right place for the invariant,
    but `rejectState` is reachable with any routing map and a hand-edited `state.json`. Belt and braces
    is justified here specifically because `continue/SKILL.md` documents a sanctioned manual
    `state.json` edit — the workflow deliberately admits hand-edited state, so the runtime guard is not
    redundant.

    ADR-0004 holds throughout: the invariant is tested CLI code, not prose.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The change makes an invalid archetype fail
    closed at resolution rather than producing a state machine that corrupts `state.json` mid-run,
    which is a small robustness improvement rather than a security one.
  </security-check>

  <test-quality result="pass">
    Eighteen tests, and the structure is right: two parameterised suites over all six archetypes for
    the invariants, four targeted unit tests on the assertion itself for the failure messages, and two
    tests pinning the specific data fixes so a future edit to those files fails by name.

    The most valuable pair is the "can reject every step it gates" suite alongside "an ungated step
    needs no route". Together they encode *why* the invariant is scoped the way it is: routes matter
    exactly for steps that park, and asserting the negative stops the rule being over-tightened later
    into "every step needs a route", which would be false.

    AC-3 was verified by breaking a real archetype file and running the real command, then restoring
    and confirming the restore was clean — rather than trusting the unit test on the assertion
    function alone.
  </test-quality>

  <scope-check result="pass">
    The resolver invariant, the `rejectState` guard, two archetype data fixes, and the tests. Two edits
    reach further and both are consequences: `nit:orchestrate`'s limitations block is removed because
    all three limitations are now closed, and the archetype schema gains the documentation (RV-1).

    Out-of-scope respected: the rejection-routing model is unchanged, `architecture-decision` still
    removes `implement` and `qa` as it should, and no recovery tooling was added for tasks already
    stuck.

    The `boundary-check` fix is a scope judgement worth defending. It is a second instance rather than
    a second defect: the scope says "cover every shipped archetype, not only the one where the defect
    is currently visible", and extending the invariant is what exposed it. Fixing the invariant while
    knowingly leaving a step it flags would have been incoherent.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic as tested CLI code (ADR-0004)" result="pass">The invariant is enforced in the resolver with tests.</guard>
    <guard description="Fail loudly rather than infer" result="pass">No silent fallback; resolution names both ends and the resolved step list.</guard>
    <guard description="Cover every shipped archetype" result="pass">Both invariants asserted parameterised over all six.</guard>
    <guard description="Runtime guard where state can be hand-edited" result="pass">rejectState checks stepOrder, since the workflow sanctions a manual edit.</guard>
    <guard description="No stale limitation left in a skill" result="pass">nit:orchestrate's block removed; its test asserts none of the three return.</guard>
    <guard description="Enforced rules are discoverable at authoring time" result="pass">Fixed as RV-1.</guard>
  </convention-guards>

  <findings>
    - [minor, fixed] RV-1 — the invariant was enforced in code but undiscoverable where an author would
      look. `archetype.schema.json` described `rejectionRouting` as "Map of step id to the step id to
      route to on rejection" and said nothing about either end having to be a real step, every gated
      step needing an entry, or a child's declaration replacing the parent's rather than merging. An
      author would have learned all three by failing. The CLI error is clear, but discovering a
      contract by tripping it is a worse experience than reading it, and the replace-not-merge
      semantics in particular are surprising enough that nobody would guess them.
    - [note] The second defect fixed here — `cross-module-change` gating `boundary-check` with no route
      — was found by extending the invariant rather than by looking for it, and was only reachable
      because TASK-029 made gating real. Before that the `approval` flag was inert, so nothing parked
      at `boundary-check` and the missing route could not fire. Two fixes in this phase have now
      exposed a defect in each other's territory, which is an argument for finishing a class of change
      before assessing what it broke.
    - [note] `base.json` declares routes for `analyze`, `implement` and `qa`, all of which are ungated
      and therefore never park. Those three entries can never fire. Harmless, and the new invariant
      deliberately permits them, but they read as though those steps are rejectable when they are not.
      Removing them would make `base.json` state exactly what is reachable; leaving them costs nothing.
      Not worth a task on its own.
    - [note] With this task, all three limitations `nit:orchestrate` declared are closed, and the block
      is gone. The skill now describes a pipeline that works rather than one with caveats — worth
      noting because that block existed for exactly one task before being obsolete, which is the
      correct lifetime for a stated limitation.
    - [note] This closes the last of the four "declared contract nothing consumes" defects the phase's
      reviews surfaced. Only TASK-030's inverse remains — a consumer requiring data nothing produces.
      Four instances of one root cause, all found by review rather than by the tests that were passing
      at the time, is the strongest candidate for an ADR at phase summary.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `archetype.schema.json`'s `rejectionRouting` description now states all three rules: both ends
      must name resolved steps, every gated step needs an entry while an ungated one does not and why,
      and a child's declaration replaces the parent's rather than merging. It closes by saying
      resolution fails if any of it does not hold, so the author knows the rules are enforced rather
      than advisory. Verified `base.json` still validates against the amended schema.
    </item>
    <verification>
      `bun test` — 229 pass, 0 fail after the fix.
    </verification>
  </finding-resolution>

</review>
