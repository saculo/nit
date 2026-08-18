# Review — Task 23: Rewrite nit:phase-summary for JSON Output and PLR

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-18) at first pass. Three findings raised during review: RV-1 corrected within
    this task, RV-2 and RV-3 routed to the successor tasks that own the affected files. All recorded
    below.
  </verdict-history>

  <input-validation-deviation>
    The two standing deviations are unchanged: this task's own artifacts are v1 prose because the
    repository workspace has not migrated (TASK-026 excludes it), and implementation and review shared
    a session, so this is not independent review. Mitigated as before by executing every claim and by
    probing beyond the acceptance criteria — which is again where the substantive finding came from.
    CodeRabbit has not seen this commit.

    Worth noting the specific irony this task carries: it is the skill that must cope with a mixed v1
    and v2 workspace, and it is being reviewed inside exactly such a workspace, using a v1 artifact.
    That is a fair test of whether AC-4 was taken seriously rather than a contradiction.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `phase-summary.schema.json` is new, registered in `schema-resolver.ts`, and reachable as
      `nit validate --schema phase-summary` — verified against the real CLI, not only in-process. The
      skill aggregates from structured fields only: `implementation-result.deviations` and `techDebt`,
      `review-result.comments` at error and warning, `qa-result.issues`, and `adrCandidates` from any
      step. The worked example embedded in the skill was extracted from the file and validated through
      the CLI, so the documentation and the schema are proven to agree rather than assumed to.
    </criterion>
    <criterion id="AC-2" result="pass">
      `milestone.reached` and per-criterion `met`/`unmet` with evidence are required by the schema; a
      criterion without evidence and a result outside the enum are both rejected by test. The skill
      sets the phase status to `done` only when `reached` is true, and is forbidden from creating tasks
      for gaps.
      This criterion passes on its substance but rests on data the workspace does not yet supply —
      see RV-1, which is why the skill now documents where criteria come from.
    </criterion>
    <criterion id="AC-3" result="pass">
      Traceability is enforced rather than encouraged. Every aggregate uses the `attributed-item`
      `$def`, which requires `taskId` and a non-empty `item`; four parameterised tests assert that each
      aggregate rejects an unattributed or empty entry. `adrCandidates` require `taskId` too.
      `recommendations` require `phaseId`, so the vague advice the v1 rules merely discouraged is now
      refused by the validator. Confirmed through the CLI: an unattributed `techDebt` entry fails with
      `/techDebt/0: must have required property 'taskId'`.
    </criterion>
    <criterion id="AC-4" result="pass">
      The `unreadable[]` array and `tasks[].readable` give a partial summary a way to declare its own
      gaps, and the skill forbids two failure modes explicitly: failing on the first v1 task, and
      parsing v1 prose into structured fields. The second prohibition is the important one — a guess
      presented as structured data is worse than a declared gap, and the schema cannot tell them apart.
      A criterion verifiable only from an unreadable task is `unmet`, which closes the loophole where a
      phase could be marked done on the strength of what could not be read.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified; AC-1 and AC-3 through the real CLI.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 147 pass, 0 fail (17 added, in a new `phase-summary-shape.test.ts`). Reproduced by
      the reviewer.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed here, RV-2 and RV-3 routed to their owning tasks.</item>
    <item id="DOD-4" result="pass">
      No critical tech debt introduced. One duplication is accepted deliberately; see the note on the
      adr-candidate shape.
    </item>
  </dod-check>

  <architecture-conformance result="pass">
    ADR-0003 holds — the skill validates `summary.json` at write time. ADR-0004 is respected: the
    aggregation is the architect's judgement, but nothing about state transitions moved into the skill
    beyond setting the phase status, which is phase-level and has no CLI command.

    The ADR-0005 boundary is drawn deliberately and correctly. `summary.json` is machine-readable
    because it is consumed; the Phase Learning Record stays prose because it is read by people, and its
    "Patterns" section — the part that names four tasks deviating the same way — is precisely what JSON
    would destroy. The skill states this as a decision rather than leaving it looking like an
    inconsistency, which is the right treatment for a deliberate asymmetry.

    The `adrCandidates` handling is consistent with the design and implement skills: collect, never
    promote. Writing a numbered ADR stays behind the human gate in all three.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. No absolute paths written into any committed
    artifact — checked explicitly, as that class has recurred in this phase. `summary.json` records
    only task ids and text the steps already committed.
  </security-check>

  <test-quality result="pass">
    Seventeen tests in a new file, and the negative cases dominate — correct for a schema whose entire
    value is refusing malformed input. The four aggregate arrays are covered by one parameterised test
    asserting each rejects a missing `taskId`, a missing `item`, and an empty `item`, so traceability
    is proven for every aggregate rather than spot-checked on one.

    The strongest test is the round-trip: the worked example is parsed out of the SKILL.md itself and
    validated, so documentation drift becomes a test failure rather than a surprise for whoever copies
    the example. That is a better guarantee than the hand-copied example fixtures used in TASK-021 and
    TASK-022, and those two would be worth converting to the same approach.

    One gap, non-blocking: nothing exercises the skill's aggregation behaviour, only the shape it
    produces. That is inherent — the aggregation is an agent's judgement, not code — but it means AC-4's
    "summarise what you can" is verified by reading the instruction, not by running it.
  </test-quality>

  <scope-check result="pass">
    The schema, its registration, the skill rewrite, and the tests are the task. The edits to
    TASK-024's and TASK-025's scope (RV-2) are bookkeeping this task's own artifact rename made
    necessary, and TASK-030 is a filed finding rather than work done here.

    Out-of-scope items were respected: no ADRs were promoted, no PHASE-1 or PHASE-2 summary was
    retrofitted, and the adr-index work was left alone. The PLR was kept prose rather than opportunistically
    converted.
  </scope-check>

  <convention-guards>
    <guard description="Validate at write time (ADR-0003)" result="pass">The procedure ends with the CLI validator call against the new schema.</guard>
    <guard description="Aggregates are traceable to their source" result="pass">Enforced by the attributed-item $def, not left to convention.</guard>
    <guard description="Collect ADR candidates, never promote" result="pass">Consistent with nit:design and nit:implement.</guard>
    <guard description="Declare gaps rather than omit them" result="pass">unreadable[] plus tasks[].readable, with prose parsing forbidden.</guard>
    <guard description="Documented examples validate" result="pass">Extracted from SKILL.md and validated through the CLI.</guard>
    <guard description="No machine-specific paths in committed artifacts" result="pass">Checked; none written.</guard>
  </convention-guards>

  <findings>
    - [critical, fixed] RV-1 — the skill required verification against phase success criteria that have
      no v2 home. `phase.schema.json` defines exactly five properties — `id`, `title`, `milestone`,
      `status`, `businessValue` — with `additionalProperties: false`, and `nit:phases` says outright
      that success criteria "are not stored in `phase.json`". They are discussed at planning and then
      discarded. So `phase-summary.schema.json` requires `milestone.criteria[]` while nothing in v2
      produces the criteria to populate it: on a pure v2 workspace the skill would have had only the
      one-sentence `milestone` to verify against, with no instruction on what to do about it.
    - [minor, routed] RV-2 — this task renamed the phase artifact from `SUMMARY.md` to `summary.json`,
      leaving two skills referencing a file v2 will never write: `status/SKILL.md` uses "no SUMMARY.md"
      as its next-step trigger, and `e2e-orchestration/SKILL.md` names it in both its produces-list and
      its state-reading table. Both files are themselves v1 and owned by TASK-024 and TASK-025.
    - [minor, routed] RV-3 — nothing consumes `summary.json`. That is the same fault this phase has
      already produced three times (TASK-027, TASK-028, TASK-029): a declared contract with no
      consumer. TASK-024's scope did not mention reading it, so without an amendment this task would
      have added a fourth instance of the pattern it is meant to help surface.
    - [note] The `adr-candidate` shape is duplicated between `step-output.schema.json` and
      `phase-summary.schema.json` rather than shared by `$ref`. `createAjv` compiles one schema at a
      time and registers no others, so a cross-file `$ref` would not resolve without changing how
      schemas are loaded. The duplication is deliberate and small, but it is a second place to change
      if the candidate shape ever does.
    - [note] `tasks[].readable` and `unreadable[]` encode the same fact at two levels — a roll-up flag
      and a detail record. Deliberate, so a consumer reading only `tasks[]` still sees the gap, but the
      two can disagree and nothing prevents it.
    - [note] `.nit/prd/summary.json` and `.nit/phases/PHASE-N/summary.json` are different schemas
      sharing a filename. Unambiguous by directory, ambiguous in conversation.
    - [note] `validate-phase-summary.sh` is now orphaned, making four dead hooks of ten. TASK-026 owns
      the sweep, and the count is now large enough that leaving it later has a cost.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      The skill's milestone step now documents where criteria come from and in what order: the phase's
      `PHASE.md` `<success-criteria>` when the workspace still has one, otherwise one criterion per
      distinct outcome named in `milestone`, with the derivation stated in the evidence. It also
      requires ids stable enough to mean the same thing on a re-run, preferring `SC-N` ids where they
      exist. That makes the skill honest and usable today.
      The underlying gap is filed as TASK-030 — add `successCriteria[]` to `phase.schema.json`, persist
      it in `nit:phases`, and drop this fallback chain — with an acceptance criterion requiring the
      change to be additive so existing phase.json files stay valid. Not fixed here: it touches the
      phase schema and the phase-planning skill, neither of which is this task.
    </item>
    <item id="RV-2" result="routed">
      TASK-024's scope now includes replacing the `SUMMARY.md` next-step trigger, and TASK-025's now
      includes correcting both `SUMMARY.md` references. Recorded in the tasks that own those files
      rather than reaching into two v1 skills mid-migration, which would have meant editing files
      scheduled for wholesale rewrite.
    </item>
    <item id="RV-3" result="routed">
      TASK-024's scope now includes reading a completed phase's `summary.json`, giving the artifact a
      consumer in the same phase that introduced it.
    </item>
    <verification>
      `bun test` — 147 pass, 0 fail. The documented example re-validated through the CLI after the
      RV-1 edit.
    </verification>
  </finding-resolution>

</review>
