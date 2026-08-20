# Review — Task 37: ADR Trigger Evaluation in the Supervisor

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-21), after two findings fixed during review.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    eighteen consecutive pull requests.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      Both conditions SC-3 names are decidable and were verified through the CLI, not only in tests: a
      change touching two modules fired `multi-module-change` with both module names as evidence, and a
      created file in a module others may depend on fired `new-shared-component` with its path.
      This passes only because the task changed the config's shape — see the conformance note below.
    </criterion>
    <criterion id="AC-2" result="pass">
      A single-module edit fires nothing, and the `adrTriggers` key is **absent** rather than an empty
      array. That distinction matters more than it looks: a consumer can tell "nothing fired" from
      "triggers are not configured" without a second lookup.
    </criterion>
    <criterion id="AC-3" result="pass">
      An unrecognised condition fails naming the value and listing the valid set. Getting this right
      required putting the check *before* schema validation — the enum rejects it too, but Ajv reports
      "must be equal to one of the allowed values" without saying which value or what is allowed, which
      is exactly the information the author needs. Two tests failed on the first attempt and forced the
      ordering, which is the tests doing their job.
    </criterion>
    <criterion id="AC-4" result="pass">
      All five declared fields are read: `id` and `condition` are carried into the match, `when.kind`
      decides it, `enabled: false` skips the trigger, and `template` is carried forward. `template` is
      the weakest of the five — it is copied but nothing acts on it until TASK-039 writes records — and
      that is stated rather than glossed.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified, AC-1 through AC-3 via the CLI.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 363 pass, 0 fail (23 added). Reproduced. Both mechanisms verified by reversion:
      removing the actionable error produces 2 failures, ignoring `enabled` produces 1.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 and RV-2 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The task's central move was recognising that the existing config could not satisfy its own
    criteria. `condition` was English prose — "A new external library or framework is added to the
    project" — and no evaluator decides that. SC-3's "triggers fire" and AC-3's "fails naming the
    condition" were both unreachable against it.

    Splitting the field is the right correction rather than a workaround: `condition` remains the
    English a reader sees in a candidate, `when.kind` is what the evaluator acts on, and the two serve
    different audiences instead of one field failing both. PHASE-4's scope already asked for
    "structured conditions", so this closes a gap the phase had named without noticing it was open.

    Triggers are advisory by construction — evaluated after validation, reported alongside the outcome,
    and never able to fail a step. That is the correct weight for a mechanism whose purpose is to
    notice something a human should consider. A trigger that could block work would be disabled the
    first time it was wrong, which is the same failure mode TASK-035's risk register named for
    boundaries.

    ADR-0004 holds: the evaluator is tested code, and the query added as RV-1 means the skill in
    TASK-038 will read a verdict rather than reason about paths in prose.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The evaluator reads a step output and a config
    and returns a report; it writes nothing and cannot fail a step.
  </security-check>

  <test-quality result="pass">
    Twenty-three tests. The strongest is not a behaviour test: "every kind the evaluator supports is
    exercised by a configured trigger" asserts that the shipped config and the code agree, so a kind
    added to one and forgotten in the other fails immediately. That is ADR-0007 in the direction it is
    usually missed — not "is the field read" but "is the capability used".

    The negative cases carry weight too: a *modified* file in a shared module does not fire
    `new-shared-component`, because only new surface counts. Without that assertion the condition would
    have quietly meant "touched a shared module", which is a much noisier rule.

    One shape inconsistency, non-blocking: `evidence` holds module names for `multi-module-change` and
    file paths for every other kind. Both are the right evidence for their condition, but a consumer
    reading `evidence` cannot assume it holds paths.
  </test-quality>

  <scope-check result="pass">
    The schema change, the evaluator, the ingest wiring, the config, `nit:init`'s template, and the
    tests. Updating the init template is in scope and load-bearing — leaving it would have shipped
    prose triggers into every new workspace, which is the defect TASK-026 existed to stop.

    The query command added as RV-1 is `@nit/cli` work and therefore belongs here rather than in
    TASK-038, which is `@nit/skills`. One task, one module cuts this way round.
  </scope-check>

  <convention-guards>
    <guard description="A declared field must have a consumer (ADR-0007)" result="pass">All five read; `template` disclosed as carried-not-acted-on.</guard>
    <guard description="Fail loudly, and usefully" result="pass">The actionable message wins over the schema's generic one, by ordering.</guard>
    <guard description="Advisory mechanisms cannot block work" result="pass">Evaluation runs after validation and never changes the outcome.</guard>
    <guard description="Deterministic logic in tested code (ADR-0004)" result="pass">Evaluator plus a query command, so the skill reads a verdict.</guard>
    <guard description="A fresh workspace gets the fixed shape" result="pass">nit:init's template rewritten alongside the config.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — SC-4 requires `adrCandidates` to appear "when a trigger matches, without the
      specialist being asked", and TASK-038 is the task that makes specialists do it. But evaluation
      ran only at ingest — **after** the specialist had written `output.json`, which is too late to add
      a candidate to it. TASK-038 would have had nothing to act on, and its only recourse would have
      been to re-derive the conditions in prose, which is what ADR-0004 exists to prevent.
      This is the same gap TASK-036 hit and solved with `nit boundaries`. Added the equivalent:
      `nit adr-triggers --task-dir <dir>`, answering the same question with the same evaluator, exiting
      1 when anything fires. It belongs in this task because the command is `@nit/cli` and TASK-038 is
      `@nit/skills`.
    - [minor, fixed] RV-2 — `nit:continue` did not mention the `adrTriggers` it now reports. The
      recurring "documented in the wrong place" pattern, and the fourth task in this project to hit it.
      The skill now explains that the field is advisory, that it should be surfaced to the user, and
      that a specialist can ask before finishing.
    - [note] `template` is read in the weakest sense: copied into the match, acted on by nothing until
      TASK-039 writes ADR records. It passes AC-4's letter, and under ADR-0007's intent it is the field
      to re-check when TASK-039 lands — if that task does not use it, it should be removed rather than
      left as decoration.
    - [note] `evidence` is module names for `multi-module-change` and paths for every other kind. Each
      is the right evidence for its own condition, but the field's shape is not uniform, and a consumer
      that assumes paths will be wrong one time in six.
    - [note] The condition set encodes judgements that are right for this project and may not travel:
      `public-api-change` means "a `.schema.json` changed", which is true here because nit's contracts
      *are* its schemas, and false for a project whose public API is HTTP routes. The kinds are a
      closed enum, so a project that disagrees cannot express its own condition without a code change.
      That is a deliberate trade — a closed set is what makes AC-3 possible — but it is a ceiling.
    - [note] Triggers fire on `filesChanged`, which is self-reported by the implement step. A change the
      engineer did not report is invisible here, exactly as it is to boundary enforcement. Both
      mechanisms in this phase inherit the same limit from the same source.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      Added `nit adr-triggers --task-dir <dir> [--step] [--triggers] [--modules] [--rules]`, mirroring
      `nit boundaries`: same evaluator, exit 1 when anything fires, and an unconfigured project reports
      `configured: false` rather than failing. Three tests cover fired, quiet, and unconfigured.
    </item>
    <item id="RV-2" result="fixed">
      `nit:continue` documents the `adrTriggers` field, its advisory nature, and the query a specialist
      can run first. A conformance test asserts both the field name and the command appear.
    </item>
    <verification>
      `bun test` — 363 pass, 0 fail after both fixes.
    </verification>
  </finding-resolution>

</review>
