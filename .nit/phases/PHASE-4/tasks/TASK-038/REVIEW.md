# Review — Task 38: Specialists Emit adrCandidates When a Trigger Fires

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-21), after two findings fixed during review — one of which made the guidance
    unexecutable as written.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    nineteen consecutive pull requests.

    This is a prose task, so almost nothing about it can be tested directly. What is testable is
    whether the instructions are *followable*: whether the commands they name exist, run in the order
    given, and produce what the skill says they produce. RV-1 is exactly that class, and it was found
    by running the command as a specialist would rather than by reading the text.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      All three skills name `adrCandidates` in their output shape and state what belongs in one:
      `title`, `context` as the problem that forced the choice, `decision` including what was rejected.
      Passing only after RV-2 — boundary-check asked the reviewer to consider raising a candidate
      without ever naming the field or showing its shape.
      The honest limit: nothing here proves a specialist *does* emit one. That is agent behaviour, and
      the strongest available substitute is that the instruction is unambiguous and its worked example
      validates against the schema.
    </criterion>
    <criterion id="AC-2" result="pass">
      Each of design, implement and boundary-check documents how to query the triggers and which are
      likely to fire at its step, with the reasoning attached rather than a bare list: design evaluates
      a `filePlan` before code exists, implement notices what the design did not anticipate, and
      boundary-check works the same facts it is already judging.
    </criterion>
    <criterion id="AC-3" result="pass">
      All three forbid writing into `.nit/adr/` and state that promotion is a human decision behind the
      approval gate. This is the third mechanism in the project to hold that line — design and
      implement already did, and it stays consistent.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All three acceptance criteria verified.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 387 pass, 0 fail (24 added). Reproduced. Verified by reversion: ignoring the design
      `filePlan` fails 1, removing the design guidance fails 3.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 and RV-2 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The design step could not query triggers at all: they read `filesChanged`, which only an
    implementation result carries, so a design's `filePlan` was invisible. AC-2 required design to
    document which triggers apply to it, and nothing stood behind that. `plannedPaths` closes it, and
    the ordering — plan first, changes later — means a decision can be noticed before the code exists,
    which is when the reasoning is cheapest to write down.

    The decision worth defending is keeping `plannedPaths` **separate** from `changedPaths` rather than
    widening the latter. Boundary enforcement consumes `changedPaths`; feeding it a plan would have
    blocked design steps for crossings the implement step might never make — a behaviour change to
    TASK-035 that its review never considered and that would have surfaced as a mysterious design-step
    failure. Tests assert the split in both directions, so a future widening fails loudly.

    ADR-0004 holds throughout: the skills read a verdict from a command rather than reasoning about
    paths in prose.

    One conformance note about this task itself: it targets `@nit/skills` and changes `cli/src/`. Our
    own rules permit it, since `@nit/skills -> @nit/cli` is allowed — but the permission is about
    *depending*, not about *changing*, and the model conflates the two. That is RV-3 from TASK-035
    showing up in this task's own diff.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The change is prose plus a read-only path
    accessor.
  </security-check>

  <test-quality result="pass">
    Twenty-four tests, and the useful ones test *followability* rather than content: the command each
    skill names exists, the ordering it prescribes works, the field it asks for is named in the output
    shape, and the worked example validates against `step-output`. That last check is what caught the
    boundary-check example being incomplete.

    The plan-versus-change split is asserted from both sides — a design's `filePlan` fires triggers and
    is invisible to enforcement; an implement result reports changes and has no plan. Testing only the
    new direction would have left the constraint that motivated the split unpinned.

    The limit is the usual one for prose conformance: these catch deletion, renaming, and
    unexecutability. They cannot catch guidance that is followable and wrong.
  </test-quality>

  <scope-check result="pass">
    Three skills, `plannedPaths`, the evaluator wiring, and tests. The `cli/src` changes are small and
    necessary — without them AC-2 is unsatisfiable for the design step.

    Out-of-scope respected: no ADR was written, no candidate promoted, and the trigger conditions
    themselves were not changed.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic in tested code (ADR-0004)" result="pass">Skills query a command; they do not re-derive conditions.</guard>
    <guard description="Promotion stays a human decision" result="pass">All three skills forbid writing .nit/adr/.</guard>
    <guard description="A documented example validates" result="pass">boundary-check's output shape re-validated after RV-2.</guard>
    <guard description="Guidance is executable in the order given" result="pass">Fixed as RV-1; asserted by test.</guard>
    <guard description="Enforcement behaviour unchanged" result="pass">plannedPaths kept out of changedPaths; asserted both directions.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — the guidance was unexecutable in the order it gave. Each skill instructed
      the specialist to run `nit adr-triggers --step <its own step>`, but the command reads that step's
      `output.json` — which does not exist while the specialist is still deciding what to write. Run as
      written, it exits 2 with `No output.json for step`.
      Found by running it as a design specialist would, not by reading the text. Instructions that fail
      the first time they are followed do not get retried; they get ignored, and the feature becomes
      decorative. All three skills now state the order explicitly — write the result, query, add
      candidates, re-write — and explain that the error means "nothing to evaluate yet" rather than
      "triggers are unconfigured".
    - [minor, fixed] RV-2 — `boundary-check` asked the reviewer to raise an `adrCandidate` when a rule
      would be overridden every time, and never named the field or showed its shape. Its output example
      was a bare `review-result`. The other two skills carried the field; this one asked for something
      it did not show. Now shows a worked candidate, re-validated against `step-output`.
    - [note] This task targets `@nit/skills` and changes `cli/src/`. The rules permit it, but only
      because they encode "may depend on", and what happened is "changed a file in". RV-3 from
      TASK-035 is now visible in the diff of a task written after the enforcement existed, which is the
      clearest evidence yet that the model conflates the two.
    - [note] AC-1's real subject — that a specialist *does* emit a candidate — is unverifiable here.
      The tests establish that the instruction is present, unambiguous, followable and consistent with
      the schema. Whether an agent acts on it will only be visible when a task runs through the
      pipeline for real, which has not happened yet for any task in this project.
    - [note] The guidance permits emitting nothing when a trigger's shape matched but no decision was
      made, and says why: an empty candidate is worse than none because it trains the next reader to
      skim. That is the rule most likely to be quietly ignored under pressure to satisfy a trigger, and
      nothing enforces it — by construction, since the judgement it asks for is the whole point.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      All three skills gain an explicit ordering paragraph: write the result first, then query, then
      add candidates and re-write. It also explains what `No output.json for step` means, so the error
      reads as a sequencing hint rather than a broken feature. A test asserts each skill states it.
    </item>
    <item id="RV-2" result="fixed">
      `boundary-check`'s output shape now carries a worked `adrCandidates` entry — the crossing-approved-
      every-time case its own guidance describes — and the example was extracted and validated against
      `step-output`. A test asserts all three skills name the field.
    </item>
    <verification>
      `bun test` — 387 pass, 0 fail after both fixes.
    </verification>
  </finding-resolution>

</review>
