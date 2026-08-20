# Review — Task 34: Dependency Rules Format and Schema

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-20), after two findings fixed during review and a third exposed by the suite and
    traced back to a reasoning error in TASK-032.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    fifteen consecutive pull requests.

    First task of PHASE-4, and the first reviewed against criteria written **before** the work rather
    than alongside or after it. That is the distinction PHASE-3's re-scope could not preserve and this
    phase can, so it is worth naming while it still holds.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      A rule set naming known modules loads; one naming an absent module is rejected with the offending
      name and the known set. This is the check JSON Schema structurally cannot make — it constrains a
      document's shape, not its agreement with another file — and the reasoning is recorded in the code
      rather than left implicit: a rule naming a module that does not exist can never match, so it
      silently enforces nothing, which is the worst way for a boundary rule to fail.
      Strengthened during review; see RV-1.
    </criterion>
    <criterion id="AC-2" result="pass">
      A rule missing `from`, `to` or `allowed` fails validation naming the field, asserted per field
      rather than once. An unknown top-level field is rejected too, so the rule set cannot carry
      configuration nothing reads.
    </criterion>
    <criterion id="AC-3" result="pass">
      `.nit/boundaries/dependency-rules.json` encodes ADR-0006's direction and all six ordered pairs
      were verified by execution, not by reading the file: skills may depend on the cli; nothing may
      depend on skills or on the workspace. One rule is quietly satisfying — `@nit/workspace` may not
      depend on `@nit/skills` is exactly the duplicated tree ADR-0006 deleted, now expressed where a
      check can see it.
    </criterion>
    <criterion id="AC-4" result="pass">
      All four declared fields — `from`, `to`, `allowed`, `reason` — are read by the resolver, audited
      field by field rather than asserted. `reason` was the one at risk: it is the field a schema
      declares and an implementation forgets, so a test asserts every verdict carries one whatever its
      source. This is ADR-0007 applied while the field was being written, which is what SC-7 asked for.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified, AC-3 by execution.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 309 pass, 0 fail (21 added). Reproduced by the reviewer. Both halves of the
      mechanism verified by reversion: removing the cross-file check fails 3, inverting the precedence
      fails 2, removing the coherence check fails 2.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 and RV-2 fixed, RV-3 fixed at its root.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The substantive decision is precedence between two sources that both already existed and neither of
    which was read: `modules.json.allowedDependencies` and `dependency-rules.json`. Leaving it to
    whichever is consulted first would have been the same class of accident this phase exists to end.

    The chosen order is defensible and argued in the code: an explicit rule wins, because
    `dependency-rules.json` exists to state exceptions and an exception that loses to the general case
    is not one; failing that the module's own allowlist decides, since that list is the module's
    statement about what it may reach; failing both, allow, because a module that declared no
    constraint has not opted in and inventing one would fail projects that never asked.

    That last branch deserves note. Defaulting to *allow* is the permissive choice, and the opposite of
    the conservative default TASK-029 chose for the approval flag. The difference is who is affected:
    an unspecified gate silently removes human review, while an unspecified dependency rule silently
    breaks a project that never configured boundaries. Both defaults protect the party that did not
    make a choice.

    ADR-0007 is satisfied at the point of writing rather than retrofitted.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. Worth noting that this data will be *enforced*
    in TASK-035, so an error here becomes a false positive that blocks legitimate work — which is why
    AC-3 was verified by executing all six pairs rather than by reading the file, and why the coherence
    checks added as RV-1 matter more than they look.
  </security-check>

  <test-quality result="pass">
    Twenty-one tests. The resolution suite covers all three sources and the self case, and the
    repository's own rules are verified against the real registry rather than a fixture — so a change
    to `modules.json` that contradicts the rules fails here rather than at enforcement time.

    The most useful test is the one asserting every verdict carries a reason whatever its source. It
    does not test a behaviour so much as a property that keeps the eventual error messages actionable,
    and it is the specific guard against `reason` becoming another declared-and-unread field.

    Every mechanism was verified by reversion. That discipline is now nine tasks old and has caught
    four defects, three of them in tests rather than in code — which is itself the finding: the tests
    written in this project fail correctly less often than the code does.
  </test-quality>

  <scope-check result="pass">
    The loader, the resolver, the rule set, and the tests. The task is "format and schema" and the
    resolver sits at its edge — but a format with no reader is precisely what this task was fixing, and
    the resolver is what makes AC-4 satisfiable. Enforcement, which is TASK-035, was not started: this
    produces a queryable verdict and nothing calls it yet.

    Two edits reach outside: the archetype removals and the test correction, both consequences of RV-3.
  </scope-check>

  <convention-guards>
    <guard description="A declared field must have a consumer (ADR-0007)" result="pass">All four audited field by field; `reason` guarded by its own test.</guard>
    <guard description="Fail loudly rather than silently no-op" result="pass">Unknown modules, duplicate pairs and self-rules all rejected at load with the offender named.</guard>
    <guard description="Precedence between two sources is decided, not incidental" result="pass">Fixed, argued in code, and asserted by test.</guard>
    <guard description="Verified by reversion, not assumption" result="pass">Three separate mechanisms broken and confirmed to fail.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — two rules governing the same pair loaded without complaint, and resolution
      answered with whichever came first. A rule set could therefore contain a forbid that an earlier
      allow silently overrode, and which one the author meant is not knowable. First-match-wins was an
      artefact of `.find()`, not a decision. This is the same silent-no-op the unknown-module check was
      written to prevent, in a shape the check did not cover.
    - [minor, fixed] RV-2 — a rule governing a module and itself loaded, and could never fire:
      resolution returns before consulting rules, because a module may always depend on itself. Another
      well-formed rule that enforces nothing.
    - [major, fixed at its root] RV-3 — the suite failed on `TASK-034 -> infra-change`, and the test was
      only half wrong. TASK-032's guard asserted no *completed* task carries an archetype, splitting on
      status. The real distinction is provenance: the migration **invented** archetypes for tasks
      planned before the field existed, whereas an archetype chosen by `nit:tasks` before the work is a
      planning decision that stays valid whether or not the task ran.
      Re-scoping the guard to provenance then exposed the residue: TASK-010 and TASK-012 were left
      carrying invented archetypes because TASK-032 reasoned "not done, so it is a real decision" — but
      nobody had chosen them; the migration had. TASK-020 too. All three stripped. Every remaining
      archetype belongs to a PHASE-4 task planned with one.
    - [note] This test has now been wrong twice, in two different ways, in two consecutive tasks. Both
      times it encoded the state at the moment of writing as a permanent invariant — first "every task
      has prose", then "no completed task has an archetype". It is now pinned to a fixed historical set
      rather than a growing rule, which should stop the churn, but the pattern is worth naming: a test
      written during a migration describes the migration, and the first thing that changes afterwards
      is exactly what it got wrong.
    - [note] Provenance is not recorded anywhere. The guard approximates it by phase plus one task id,
      which works only because those phases are closed. If a task from a closed phase were ever
      re-planned, the guard would misfire again. Recording how a field was set is the general fix and is
      out of proportion to the problem today.
    - [note] Nothing calls `resolveDependency` yet. That is correct for this task and is TASK-035's
      whole content, but it means the precedence decision — the most consequential thing here — is
      currently proven only by unit test and not by any real enforcement path.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `loadDependencyRules` now rejects a second rule governing a pair already governed, naming both
      indices. Opposite directions remain legal, since `a -> b` and `b -> a` are different rules, and a
      test asserts that.
    </item>
    <item id="RV-2" result="fixed">
      Self-referential rules are rejected at load with the reason stated: a module always may depend on
      itself, so the rule can never take effect.
    </item>
    <item id="RV-3" result="fixed">
      The guard is re-scoped from status to provenance and pinned to a fixed historical set. Invented
      archetypes removed from TASK-010, TASK-012 and TASK-020 — the residue of TASK-032's reasoning.
      Verified the guard still catches the fabrication it was written for.
    </item>
    <verification>
      `bun test` — 309 pass, 0 fail after all three.
    </verification>
  </finding-resolution>

</review>
