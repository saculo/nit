# Review — Task 39: ADR Index and Its Management Commands

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-21), after four findings fixed during review.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    twenty consecutive pull requests.

    One deviation specific to this task: AC-1 names the output `decisions/adr-index.json`, and the
    implementation writes `.nit/adr/index.json`. AC-3 gave this task the authority to settle where the
    file lives, and settling it meant one of the two paths had to move. Contradicting a criterion's
    literal text on the strength of a sibling criterion is a deviation whether or not it is right, so
    it is recorded here rather than folded into AC-1's result.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      The index lists each candidate with `raisedBy` naming the task, step and phase, and `promotedTo`
      recording what it became. Verified through the command against a fixture workspace, not only in
      unit tests: three step outputs across two phases produce three entries, and the step id comes from
      the step *directory* rather than its number, so `STEP-003-implement` reads back as `implement`.
      Passing at the path AC-3 settled, not the one AC-1 named — see the deviation above.
    </criterion>
    <criterion id="AC-2" result="pass">
      `--promote` records the path, marks the candidate `accepted`, and drops it from outstanding. The
      test that carries the weight is the fourth one: a promotion survives the next rebuild. Step
      outputs never learn that a candidate became a record, so a build trusting only them would report
      a settled decision as still open every time it ran.
    </criterion>
    <criterion id="AC-3" result="pass">
      Settled as one directory. `.nit/decisions/` was created by `nit:init` and written by nothing — no
      skill, no command, no schema referenced it, verified by grep across `.claude`, `.nit` and `cli`
      before removing it. `.nit/adr/README.md` records the decision and why. Three tests pin it: init
      no longer names the directory, this workspace does not contain it, and the default index path is
      beside the records.
    </criterion>
    <criterion id="AC-4" result="pass">
      Seven declared candidate fields, seven named consumers, and the test does not take the map on
      trust: it asserts the map covers the schema's properties *exactly* — so a field added to the
      schema and forgotten in the map fails — then strips each field and asserts its consumer's output
      changes. `status` failed that check on the first run, because the fixture omitted it and the
      report defaults to `proposed`; the fixture was fixed rather than the assertion weakened.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified, AC-1 through AC-3 through the command.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 435 pass, 0 fail (48 added). Reproduced. Verified by reversion, counting `error` as
      well as `(fail)` per TASK-036's RV-2: a positional id fails 24, dropping the promotion carry-over
      fails 2, removing duplicate suppression fails 1, and each of the four review fixes fails 1.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 through RV-4 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced; one field of prior debt retired.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The load-bearing decision is that a candidate's id derives from the raising task and a slug of its
    title rather than from its position in the scan. Everything else in the task follows from it: the
    index is rebuilt from step outputs, step outputs never learn about promotion, so the only fact the
    build cannot rediscover has to be carried across from the previous index — and carrying it across
    requires an id that means the same thing on both sides. A positional id would have produced a
    mechanism that appears to work and silently un-promotes every settled decision on the next rebuild,
    which is worse than not having it. The test asserting stability across rebuilds is the one that
    would catch a future "simplification" here.

    ADR-0007 is enforced in both directions in this task. The index schema declares nothing without a
    consumer, and `template` — carried by `adr-triggers` since TASK-037 and acted on by nothing — was
    removed rather than left as decoration. TASK-037's review named this task as its deadline and the
    condition it set was met exactly: this task did not use it, so it went.

    Promotion stays outside the machine. The command records that someone wrote a record; it never
    writes one. That is the third mechanism in this phase holding the same line, and it is the right
    one to hold: the judgement of whether a decision deserves a numbered record is the judgement the
    pipeline exists to surface to a person, not to make for them.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The command reads step outputs, writes one
    index file at a path the caller names, and shells out to nothing. `--promote` now touches the
    filesystem only to check that the record it is asked to point at exists.
  </security-check>

  <test-quality result="pass">
    Forty-eight tests. Two are worth more than the rest.

    The ADR-0007 block is a schema-to-consumer map that asserts its own completeness before using it.
    A map maintained beside a schema drifts; asserting `Object.keys(consumers)` equals the schema's
    properties makes drift a failure rather than a silent gap. It is also what surfaced the weak
    consumer for `status` — the field-stripping check proved the fixture, not the code, was wrong.

    The id-stability test pins the mechanism the whole design rests on, and the reversion confirmed it:
    changing the id derivation fails twenty-four tests, which is the right blast radius for a change
    that would break every recorded promotion.

    The honest limit is the same one this phase keeps meeting from a different direction: none of these
    tests run against real pipeline output, because none exists. Every fixture is hand-written, so the
    tests prove the code handles the shape *the schema promises*, not the shape the pipeline emits.
  </test-quality>

  <scope-check result="pass">
    The schema, the index module, the command, the CLI wiring, `.nit/adr/README.md`, and the tests.

    Two edits reach outside `@nit/cli` and both are load-bearing. `nit:init` had to stop creating
    `.nit/decisions/`, or AC-3 would have been settled in prose and contradicted by the next fresh
    workspace — the defect class TASK-026 exists to prevent. `nit:phase-summary` had to learn the
    command, because its procedure told the Architect to gather candidates by reading step outputs by
    hand, which is exactly the work this task automated; leaving it would have shipped two answers to
    one question.

    The `template` removal reaches backwards into TASK-037. Justified: that task's review made this
    task the decision point and stated the condition. Doing it anywhere else would have left a declared
    field with no consumer across a phase boundary.

    Out-of-scope respected: no ADR was written, no candidate promoted, and the trigger conditions were
    not touched beyond the field removal.
  </scope-check>

  <convention-guards>
    <guard description="A declared field must have a consumer (ADR-0007)" result="pass">Seven fields, seven consumers, map asserted complete against the schema; `template` retired.</guard>
    <guard description="Promotion stays a human decision" result="pass">The command records a promotion and never writes a record.</guard>
    <guard description="Validate at write time (ADR-0003)" result="pass">Every index written is validated first; an invalid one is never left on disk.</guard>
    <guard description="Declare what you could not read" result="pass">Fixed as RV-4, matching the rule nit:phase-summary already follows.</guard>
    <guard description="A committed artifact has a deterministic shape" result="pass">Fixed as RV-3; a rebuild is byte-identical.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — `--outstanding` against an index that had never been built printed
      "No outstanding ADR candidates." That is the same sentence a genuinely clear project gets, and it
      is the answer that tells a reader to stop looking. The same defect class as TASK-036's RV-1:
      a query that cannot distinguish "nothing" from "not configured". Now names the missing path and
      the command that would create it, and exits 2.
    - [major, fixed] RV-2 — `--promote --to <path>` recorded any string, including a path to a file
      nobody had written. The index's entire claim is that a record exists; recording a path to nothing
      makes it assert something false, and unlike a missing entry, a false one is not discovered by the
      person relying on it. Now checks the record exists and refuses otherwise, leaving the index
      untouched.
    - [minor, fixed] RV-3 — candidates were sorted by task id alone, so two steps of the same task
      landed in filesystem scan order. The index is a committed file: a rebuild that reorders lines
      produces a diff claiming a change that did not happen, and diffs that lie get skimmed. Now
      ordered by phase, task and step; a test asserts a rebuild is byte-identical.
    - [minor, fixed] RV-4 — one unparseable `output.json` aborted the entire scan, so a single
      malformed file made every other task's candidates unreportable. `nit:phase-summary` already has
      the right rule for this — summarise what you can, declare what you cannot — and the command now
      follows it, listing the unreadable paths in its report.
    - [note] This repository's own index is empty, and correctly so: no task here has ever run through
      the pipeline, so no `STEP-*/output.json` exists to scan. Every test fixture is hand-written.
      The command is verified against the shape the schema promises and unverified against the shape
      the pipeline actually emits — and that gap closes only when a task runs for real, which is now
      true of four mechanisms built in this phase.
    - [note] The index holds only candidates a *step* raised. `nit:phase-summary` also produces
      emergent candidates — decisions visible only in aggregate, which no single step could have seen —
      and those never enter the index. That is arguably the more valuable half, and it is currently
      recorded only in `summary.json`. Worth a task if the index becomes the place people look.
    - [note] `--promote`'s existence check resolves the path against the working directory, while the
      value stored is whatever string the caller passed. Run from a subdirectory with a relative path,
      the check and the stored value disagree about what they refer to. Harmless from the repo root,
      which is where every documented invocation runs.
    - [note] This task targets `@nit/cli` and changes `.claude/skills/`. RV-3 from TASK-035 again, for
      the fourth task running: the rules encode "may depend on", the diff shows "changed a file in",
      and the model does not separate them. Every task in this phase has now hit it.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `--outstanding` reports `No index at <path>. Run \`nit adr-index\` to build it.` and exits 2 when
      the index has never been built. A test asserts the exit code and that no index is created as a
      side effect of asking.
    </item>
    <item id="RV-2" result="fixed">
      `--promote` verifies the record exists before recording it, and exits 2 naming the missing path.
      A test asserts the index is byte-identical after a refused promotion. The command's fixtures now
      write a real ADR file, so the happy path proves the check passes rather than that it is absent.
    </item>
    <item id="RV-3" result="fixed">
      Ordering is by `phaseId/taskId/stepId`, and unreadable paths are sorted too. A test rebuilds and
      asserts the file is unchanged byte for byte.
    </item>
    <item id="RV-4" result="fixed">
      A step output that will not parse is collected into `unreadable[]` and reported; the rest index
      normally. A test writes a malformed output, asserts the other three candidates still land, and
      asserts the bad path is named in the report.
    </item>
    <verification>
      `bun test` — 435 pass, 0 fail after all four fixes. Each fix confirmed by reversion.
    </verification>
  </finding-resolution>

</review>
