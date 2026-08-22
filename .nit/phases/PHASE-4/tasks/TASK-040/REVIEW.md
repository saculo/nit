# Review — Task 40: Routing Introspection Commands

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-22), after two findings fixed during review — one of them a pre-existing defect
    the task's own mechanism made visible — and one defect in a test of this task's own writing.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    twenty-one consecutive pull requests.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      All five layers are printed — base, language, custom, step-override, global — each candidate
      naming the module or registry that offered it, and each drop naming its reason. Verified through
      the CLI against this repository, where it immediately reported something true and previously
      invisible: `@nit/cli`'s `typescript` language skill is dropped as `absent`, because no such
      SKILL.md exists. A layer with no candidates prints `(nothing configured)` rather than vanishing,
      which matters because the question this command answers is nearly always "why is my skill not
      here" and an omitted line reads as an oversight.
    </criterion>
    <criterion id="AC-2" result="pass">
      `routing.json` is written for the step the task is actually on, read from `state.json`, and it
      validates. The part worth checking was which step: a task at `review` gets `nit:review`, not the
      archetype's first step. A task with no `state.json` falls back to the archetype's first step
      rather than failing — a task that has not started still has a routing worth asking about.
    </criterion>
    <criterion id="AC-3" result="pass">
      Both commands fail with the module name, the registry path, and the list of known modules, and
      write nothing. Asserted for both commands and for a secondary module in a cross-module target
      list, plus explicitly that no partial `routing.json` is left behind.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All three acceptance criteria verified, each through the CLI.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 486 pass, 0 fail (51 added). Reproduced. Verified by reversion, counting `error` as
      well as `(fail)`: making the two views diverge fails 13, ignoring the current step fails 5,
      resolving a partial chain fails 3, untraced duplicates fails 2, a silently omitted language
      fails 1, the supervisor fix fails 1, and each review fix fails 1.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 and RV-2 fixed, RV-3 fixed in the tests.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced; one pre-existing defect retired.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The decision that carries the task is that the explanation and the routing come from one pass:
    `resolveRouting` is now `explainRouting(...).routing`. The alternative — a describing function
    beside the resolving one — is the more obvious design and the wrong one. Two implementations of a
    layering model with five layers, two drop reasons and a cross-module union will drift, and the
    failure mode is an explanation that is confidently wrong. That is worse than no explanation,
    because the whole point of the command is to be believed when the config and the output disagree.
    Six configurations assert the two agree, and a second assertion pins the stronger property: the
    resolved skill list is exactly the trace's included entries, no more and no less.

    The trace also changed what the project can see about itself. Silent dropping is right at dispatch
    and opaque afterwards; making every candidate visible is what surfaced RV-2, a defect that had been
    in the resolver since PHASE-2 and that no test had a way to notice.

    AC-3 turned out to be about more than the two new commands. The supervisor answered the same
    question differently on the same inputs — `nit continue --target <unknown>` fell through to
    base-skill-only dispatch, silently — so a task with a typo in its `targetModule` ran with every
    language, custom and global skill missing and nothing said. Two answers to one question is the
    defect class this phase keeps finding, and leaving it would have meant shipping a command whose
    promise the supervisor contradicts.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. Both commands read project files and write at
    most one JSON file at a path the caller names.
  </security-check>

  <test-quality result="pass">
    Fifty-one tests, and one of them was wrong in a way worth recording.

    The strongest are the agreement tests: six configurations asserting `resolveRouting` returns
    exactly what `explainRouting` resolved, and that the ordered skill list equals the included trace
    entries. Reverting the shared implementation fails thirteen, which is the right blast radius for
    the property everything else rests on.

    RV-3 is the finding about the tests themselves. The first version of the `resolvedAt` test passed
    with the mechanism removed, because both runs landed in the same millisecond — a false green found
    only by reverting the mechanism and seeing nothing fail. It also exposed that the fix had two
    redundant halves, either of which alone kept the file stable, so neither was individually pinned.
    Fixed on both counts: the test forces the clock forward, and the redundant half was removed rather
    than left as untested belt-and-braces.

    The limit is the same one this phase keeps meeting: every fixture is hand-written, and no test runs
    against routing produced by a real pipeline run, because none exists.
  </test-quality>

  <scope-check result="pass">
    The trace, the two commands, the CLI wiring, `nit:compose-routing`, and the tests.

    Two edits reach beyond the commands themselves. `nit:compose-routing` had to stop re-deriving the
    step and target in prose, or the task would have shipped a command with no caller — decoration by
    ADR-0007's standard. The supervisor fix reaches into TASK-015's code and is justified above: it is
    the same question, and answering it two ways is the contradiction.

    RV-2 also reaches backwards, into the resolver's original behaviour. Leaving it would have meant
    shipping a trace that faithfully explains a composition producing a duplicate skill.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic in tested code (ADR-0004)" result="pass">The skill runs a command and reads its verdict; it re-derives nothing.</guard>
    <guard description="Validate at write time (ADR-0003)" result="pass">No invalid routing.json reaches disk.</guard>
    <guard description="One question, one answer" result="pass">Explanation and routing share a pass; the supervisor now fails where the commands fail.</guard>
    <guard description="A committed artifact has a stable shape" result="pass">Fixed as RV-1; re-resolving is byte-identical.</guard>
    <guard description="A new capability has a caller" result="pass">nit:compose-routing invokes both commands; asserted by test.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-2 — two modules sharing a language handed the agent the same skill twice. The
      primary's language populates `languageSkill` and each secondary's language is prepended to
      `customSkills`, and nothing checked across those two layers, so a cross-module task over two
      TypeScript modules resolved to `["nit:implement", "typescript", "typescript"]`. Pre-existing
      since the resolver was written, and invisible until this task made every candidate visible —
      which is the clearest argument for the trace that this task could have produced. The custom
      layer is now seeded with the primary's language, whether or not its file exists: a skill named
      twice and absent is still one absent skill.
    - [minor, fixed] RV-1 — `resolvedAt` moved on every run, so re-resolving an unchanged routing
      rewrote `routing.json` and produced a diff claiming a change that did not happen. The same lesson
      as TASK-039's RV-3, one task later, and the second committed artifact in two tasks to need it.
      The timestamp is now preserved when nothing else moved, which also improves what it means: "when
      this routing became current" rather than "when someone last ran the command".
    - [major, fixed in tests] RV-3 — the first `resolvedAt` test was a false green. Both runs landed in
      the same millisecond, so it passed with the mechanism removed; only reverting the mechanism
      revealed it. Reverting further showed the fix had two redundant halves, either of which alone
      satisfied the test, so neither was pinned. The test now forces the clock forward and the
      redundant half is gone. This is the second time in this phase that a verification step, not a
      test run, caught something the tests could not — TASK-036's RV-2 was the first.
    - [note] `explain-routing` exits 0 even when candidates were dropped, unlike `nit boundaries` and
      `nit adr-triggers`, which exit 1 when something fires. The inconsistency is deliberate: a dropped
      optional skill is normal, not a finding, and a non-zero exit would make the command unusable in
      the pipelines those other two are designed for. Worth knowing before someone treats the three as
      a family.
    - [note] `--targets` replaces the task's `targetModule` entirely rather than extending it, so
      passing only a secondary module silently changes which module is primary — and the primary
      decides `languageSkill` and `targetModule`. Correct for a cross-module task that lists all its
      modules in order; a trap for anyone who reads the flag as "and also these".
    - [note] The supervisor fix changes `nit continue`'s behaviour for a case that previously
      "worked": a task with an unresolvable target now stops instead of dispatching. That is the point,
      but any workspace relying on the old silence will see a new failure, and its cause will be a typo
      that has been costing it every optional skill for as long as it has been there.
    - [note] This task targets `@nit/cli` and changes `.claude/skills/`. RV-3 from TASK-035, fifth task
      running. Every task in this phase has now hit it, which is no longer a per-task observation — it
      belongs in the phase summary as a finding about the module model.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `resolve-routing` reads the existing `routing.json` and keeps its `resolvedAt` when everything
      else resolved identically, reporting `unchanged` in its output. Two tests: an unchanged
      re-resolution is byte-identical, and a routing that did change gets a new timestamp. Both force
      the clock forward, per RV-3.
    </item>
    <item id="RV-2" result="fixed">
      The custom layer is seeded with the primary module's `languageId`, so a secondary module
      contributing the same language is traced as `duplicate` rather than included twice. A test
      asserts both halves — one occurrence in the resolved list, and the duplicate visible in the
      trace with the module that offered it.
    </item>
    <item id="RV-3" result="fixed">
      The timestamp tests force the clock forward, and the redundant write-skip was removed so the
      surviving mechanism is the one the test pins. Confirmed by reverting it and seeing the test fail.
    </item>
    <verification>
      `bun test` — 486 pass, 0 fail after all three. Each fix confirmed by reversion.
    </verification>
  </finding-resolution>

</review>
