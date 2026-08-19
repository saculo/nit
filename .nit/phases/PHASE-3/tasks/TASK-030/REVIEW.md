# Review — Task 30: Phase Success Criteria Need a v2 Home

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-19) at first pass, after one finding raised during review was fixed.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: v1 prose records, implementation and review in one session, and
    CodeRabbit skipping — eleven consecutive pull requests.

    This task closes the last of the four defects sharing the declared-contract root cause, so it is
    also the last chance in this phase to check whether the pattern was actually understood rather than
    merely enumerated. RV-1 below says it was not, quite.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `phase.schema.json` gains `successCriteria[]`, mirroring `task.schema.json`'s
      `acceptanceCriteria[]`, and `nit:phases` persists what it agrees rather than discarding it — with
      a new process step requiring criteria someone can check, illustrated by a verifiable example
      against an unverifiable one. The skill's own documented `phase.json` template carries the field
      and is extracted and validated by test, so the template cannot drift from the schema.
    </criterion>
    <criterion id="AC-2" result="pass">
      `nit:phase-summary` reads `phase.json.successCriteria` and the fallback chain is gone. The
      round-trip is asserted rather than assumed: a test builds a phase with two criteria, derives a
      summary from them, validates both, and asserts the summary's criterion ids are exactly the
      phase's. That is the property AC-2 is really about — matching by id across two documents — and
      validating each document separately would not have shown it.
    </criterion>
    <criterion id="AC-3" result="pass">
      The field is optional; a `phase.json` without it still validates, confirmed through the CLI and
      by test. There are no existing `phase.json` files in this repository, so the criterion is about
      adopters rather than about us — which makes the test the only thing standing behind it.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All three acceptance criteria verified, AC-1 and AC-3 through the CLI as well as by test.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 277 pass, 0 fail (14 added). Reproduced by the reviewer. Both new conformance checks
      were verified by reverting what they guard: removing the field from the `nit:phases` template
      fails one, dropping the id pattern fails six.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    Three decisions, each defensible and each recorded rather than left implicit.

    **Optional in the schema, required by the skill.** AC-3 forbids breaking existing files, so the
    field cannot be required. Enforcement lives in `nit:phases`, which writes it for every new phase.
    That is the right split: the schema is a compatibility contract with every workspace ever created,
    the skill is a contract with the process.

    **The id pattern deliberately diverges from `task.schema.json`.** Acceptance-criteria ids carry no
    pattern; success-criteria ids are constrained to `^SC-\\d+[a-z]?$`. The divergence is justified by a
    real difference: nothing matches task ACs across documents, whereas `phase-summary` matches phase
    criteria **by id across runs and across two files**. An id that drifts silently breaks the
    comparison the field exists to enable. Diverging from a sibling schema needs a reason, and this one
    has it.

    **No invented criteria.** The old fallback derived criteria from the milestone sentence when none
    were recorded. Removing it rather than keeping it as a safety net is right: verifying a phase
    against a bar set after the fact is not verification, and a summary that silently invents its own
    contract is worse than one that reports the contract is missing. The v1 `PHASE.md` path is
    preserved and now required to declare its provenance in the evidence.

    The task asked for a decision on tracing tasks to criteria and the answer — no new
    `servesCriteria` field — was correct for the stated reason: it would have been a fifth instance of
    the pattern this task closes. RV-1 shows the reasoning stopped one step short.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. A schema field carrying human-authored text;
    nothing executes it.
  </security-check>

  <test-quality result="pass">
    Fourteen tests. The round-trip test is the one that matters — it asserts a property spanning two
    schemas, which is where this defect lived and which no single-document test could reach.

    The rejected-id table is worth noting for what it includes: `AC-1` is rejected. A phase criterion
    accidentally given a task's id prefix would validate against a looser pattern and then silently
    fail to match anything at summary time. Enumerating the near-misses rather than one obviously wrong
    value is what makes the pattern test useful.

    Both conformance checks were verified by reversion, continuing the discipline adopted at TASK-024.
    That is seven consecutive tasks.

    One limitation: nothing asserts that a summary's criterion ids are a subset of its phase's. The
    schemas are separate documents and the check would have to load both, which is an agent-time
    concern rather than a schema one. It is stated in the skill and unenforced.
  </test-quality>

  <scope-check result="pass">
    The schema field, the two skills at either end, and the tests — plus `nit:tasks` (RV-1), which is
    the third consumer and was missed.

    Out-of-scope respected: this repository's v1 `PHASE.md` files are not migrated, no criteria are
    auto-derived, and verification remains the architect's judgement rather than becoming automatic.
  </scope-check>

  <convention-guards>
    <guard description="Additive schema evolution" result="pass">Optional field; a phase.json without it still validates, checked through the CLI.</guard>
    <guard description="A declared field must have a producer and a consumer" result="pass">nit:phases writes it, nit:phase-summary and nit:tasks read it; all three pinned by test.</guard>
    <guard description="Documented templates match their schema" result="pass">The nit:phases template is extracted and validated.</guard>
    <guard description="Diverging from a sibling schema needs a reason" result="pass">The id pattern's justification is recorded in the schema description and the commit.</guard>
    <guard description="Do not infer what should be recorded" result="pass">The milestone-derivation fallback is removed rather than retained as a default.</guard>
  </convention-guards>

  <findings>
    - [minor, fixed] RV-1 — `nit:tasks` was the consumer nobody thought of, and it was already asking
      the question. Its Critical Rules section has always demanded that every task answer **"Which
      phase milestone acceptance criterion does this directly contribute to?"** — a question with no
      source, because no criteria were recorded. Its Input section listed only "the phase's milestone
      and business value". Shipping `successCriteria` while leaving that question rhetorical would have
      been a fifth instance of the very pattern this task closes: a field with an obvious consumer that
      does not consume it.
      Worth distinguishing from what was correctly declined. Adding `servesCriteria` to
      `task.schema.json` would have been new data with no reader. Pointing an existing question at
      newly-available data is the opposite — no new field, no new contract, and it makes an existing
      instruction actionable.
    - [note] PHASE-3's own `summary.json`, already on `main`, derived its sixteen criteria from
      `PHASE.md` prose under the old fallback. Its evidence strings do not declare that provenance, as
      the updated skill now requires. Hand-patching sixteen strings would be churn; the artifact comes
      into conformance on the next re-run of the summary, which is the honest way for a rule introduced
      after an artifact to take effect.
    - [note] Nothing enforces that a summary's criterion ids are a subset of its phase's. The two live
      in separate documents validated separately, so this is an agent-time obligation stated in the
      skill rather than a schema constraint. It is the same shape as the ADR candidate this phase
      raised — a declaration whose consumption is unverified — and would be a natural first target if
      that candidate is promoted.
    - [note] `nit:tasks` now surfaces criteria no task serves, at the point where the task list is
      presented. That is a genuinely new capability rather than a documentation fix: an uncovered
      criterion previously surfaced at phase summary, months later, as an unmet milestone. It is
      unenforced — the skill asks for it and nothing checks — but the information now exists to ask.
    - [note] With this task, all four instances of the declared-contract pattern are closed:
      TASK-027 (routing targets), TASK-028 ($detect), TASK-029 (approval flag), and TASK-030 (this,
      the inverse). The ADR candidate proposing a conformance test per declared field remains
      unpromoted, and is now supported by four closed instances rather than four open ones.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `nit:tasks` now reads `successCriteria`: its Input section names the field, its Process step
      includes the criteria in what to understand before proposing tasks, and its Critical Rules
      question points at the source with instructions to name the criterion when proposing a task and
      to say so when a task serves none. Its closing step now surfaces criteria no task covers, so an
      uncovered criterion is visible at planning rather than at phase summary. A conformance test
      asserts the skill reads the field, alongside the existing producer and consumer checks.
    </item>
    <verification>
      `bun test` — 277 pass, 0 fail after the fix.
    </verification>
  </finding-resolution>

</review>
