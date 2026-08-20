# Review — Task 36: nit:boundary-check Step Skill

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-20), after one finding fixed during review. A defect in the *verification method*
    used across this phase was also found and is recorded.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    seventeen consecutive pull requests.

    Worth noting what this task is: a skill whose whole content is judgement. The command it runs is
    tested code, but whether a crossing was *needed* cannot be tested — only instructed. So the review
    here is largely of prose, and the honest limit is that nothing proves a reviewer following it makes
    good calls, only that it does not instruct impossible ones.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `baseSkillForStep("boundary-check")` resolves to a SKILL.md on disk. Verified across all six step
      ids, and by removing the file and confirming the routing conformance test fails.
    </criterion>
    <criterion id="AC-2" result="pass">
      The skill emits a `review-result` — the same type `nit:review` produces — rather than a new one.
      A test asserts both halves: the shape appears and `boundary-result` does not. Reusing the type is
      right on the merits, not only for economy: this is a review with a narrower subject, and a second
      verdict shape would have needed its own handling everywhere `review-result` is already read.
    </criterion>
    <criterion id="AC-3" result="pass">
      The blocked contract is used with the correct reason/detail pairings, and `needs-splitting` is
      called out specifically — crossings that show a task is really two tasks is a finding this step
      is better placed to make than any other.
    </criterion>
    <criterion id="AC-4" result="pass">
      The not-yet-implemented allowlist is empty. All six step ids in every shipped archetype resolve.
      This is the first time since PHASE-1 that no step lacks a skill.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 340 pass, 0 fail (9 added). Reproduced by the reviewer. The deferral verified by
      reversion; the skill's necessity verified by removing it.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed; RV-2 recorded as a method defect.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The task's most consequential change was not in its scope. Implementing the skill exposed that
    TASK-035's automatic enforcement would block a `cross-module-change` task at its **implement** step
    — before it reached the boundary-check step that exists to review the crossing. Two features of the
    same phase, each correct alone, contradicting each other: the archetype permits deliberate
    crossings; the enforcement forbids all of them.

    The resolution uses the archetype's own shape as the signal. An archetype carrying a
    `boundary-check` step is declaring that crossings are expected and will be judged, so `ingest`
    defers rather than pre-empting. That is better than an exclusion list because it is derived from
    the data rather than maintained beside it — a new archetype that wants reviewed crossings gets the
    behaviour by declaring the step. Tested both directions: the same crossing passes under
    `cross-module-change` and is blocked under `backend-feature`.

    ADR-0004 is respected in the division. `nit boundaries` decides *what crossed*; the skill decides
    *whether it was justified*. Putting the path logic in the skill would have been prose
    re-implementing tested code, and the skill says so explicitly rather than leaving it to discipline.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The new command reads project files and
    reports; it writes nothing. Its exit code (1 on violations) makes it usable in a pipeline, which is
    worth noting as a capability rather than a risk.
  </security-check>

  <test-quality result="pass">
    Nine tests. The pair that matters is the deferral in both directions — a crossing passing under an
    archetype with a boundary-check step and failing under one without. Testing only the new behaviour
    would have left the old behaviour unpinned, and the whole risk of this change is that it disables
    enforcement too widely.

    The skill-contract tests assert what the prose must say, which is the only mechanism available for
    a skill. They are weak in the usual way — they catch deletion and renaming, not misuse.

    One limitation now visible: with the allowlist empty, its companion test ("the list contains
    nothing that now exists") is vacuous — `Object.keys({})` is always empty. It was load-bearing while
    entries existed and becomes so again if one is added, so it stays, but it currently proves nothing.
  </test-quality>

  <scope-check result="pass">
    The skill, the `nit boundaries` command, the ingest deferral, and the tests. The command is the
    largest addition beyond a plain SKILL.md and is justified: without it the skill would have had to
    re-derive path-to-module mapping in prose, which ADR-0004 exists to prevent.

    The ingest deferral edits TASK-035's code, which is scope reaching backwards — but the
    contradiction only becomes visible when the step it defers to exists, and shipping the skill while
    leaving the archetype unusable would have been the worse choice.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic as tested CLI code (ADR-0004)" result="pass">The command decides what crossed; the skill judges. Stated in the skill, not left to discipline.</guard>
    <guard description="Reuse an existing result type" result="pass">review-result; asserted, including that boundary-result is absent.</guard>
    <guard description="Blocked contract, not a bespoke convention" result="pass">Correct reason/detail pairings, with needs-splitting called out.</guard>
    <guard description="Every step id resolves to a skill" result="pass">Allowlist empty; verified by removing the file.</guard>
    <guard description="Query and gate agree about what is configured" result="pass">Fixed as RV-1.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — the query and the gate disagreed about what "configured" means. `ingest`
      enforces only when a project supplies **both** a module registry and a rule set (TASK-035 AC-4),
      but `nit boundaries` reported violations from `modules.json.allowedDependencies` alone. A project
      with a registry and no rules would see a violation report from the command while the gate was
      silent — two answers to the same question, which is the exact defect class this phase keeps
      finding.
      Resolved by making the difference deliberate and visible rather than by aligning the two:
      the command is a *query* and reports either way, but now states `enforced` and `rulesPath`, so a
      report cannot be mistaken for a live gate. A project can see what enforcement would cost before
      turning it on, which is a use the gate cannot serve.
    - [major, method defect] RV-2 — the verification technique used across this entire phase has a
      blind spot. Checks are confirmed by breaking a mechanism and counting lines matching `^(fail)`.
      Removing a *file* a test reads at describe scope produces a load-time `error`, not a `(fail)` —
      bun reports `1 error` and the count reads zero. The check does catch the regression; the
      verification says it does not.
      Found here because a `mv` to `/tmp` failed cross-device, the file was never removed, and the
      resulting green was investigated rather than accepted. Both the false green and the blind spot
      behind it would have gone unnoticed if the first result had been trusted.
    - [note] The deferral is per-archetype, so a project that adds a `boundary-check` step to an
      archetype loses automatic enforcement for every task using it. That is the intent — the step
      replaces the gate — but it is a large consequence of a small declaration, and nothing warns an
      archetype author that adding the step turns the automatic check off.
    - [note] `nit boundaries` checks what the implement step *says* it changed, not the diff. A change
      omitted from `filesChanged` is invisible to both the command and the gate. Inherent to enforcing
      against a self-reported list, and worth knowing before this is trusted as a control.
    - [note] RV-3 from TASK-035 is unchanged: four of five recent merged tasks genuinely cross module
      boundaries. This task adds the mechanism for judging such crossings deliberately, which makes the
      question sharper rather than answering it — `cross-module-change` is now usable, so "should these
      tasks have used it?" is a live option rather than a hypothetical.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `nit boundaries` now reports `enforced` and `rulesPath`, distinguishing a query from a live gate,
      and its documentation states the difference and why it exists. Three tests cover it: enforcement
      live, enforcement not live but violations still visible, and a clean task exiting 0.
    </item>
    <item id="RV-2" result="recorded">
      Not fixed as code — the technique is a habit, not an artefact. Recorded so the next use accounts
      for it: when a verification removes or renames a file, count `error` as well as `(fail)`, and
      confirm the removal actually happened before trusting the result.
    </item>
    <verification>
      `bun test` — 340 pass, 0 fail after the fix.
    </verification>
  </finding-resolution>

</review>
