# Review — Task 32: Migrate the nit Workspace to v2 Artifacts

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-20) at first pass, after one finding was fixed and a second filed as TASK-033.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, and CodeRabbit skipping —
    thirteen consecutive pull requests.

    This task is a **data migration**, which changes what review has to prove. For a code change the
    question is whether new behaviour is correct; here it is whether 38 generated files faithfully
    represent 33 hand-written sources. Counting is not enough — a migration can produce the right number
    of wrong things — so the audit compared titles, ids, phases and criterion *text* against source,
    not just counts.

    This is also the first task reviewed in a workspace that can describe itself. Its own `task.json`
    exists and validates, which was not true of any of the 31 tasks before it.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      All four `nit:tasks` Step 0 preconditions now exist and validate, PHASE-4's status is not `done`,
      and all 24 clarifications carry answers — the specific check `nit:phases` and `nit:tasks` both
      make. The command that hard-stopped at the start of this session would now proceed.
    </criterion>
    <criterion id="AC-2" result="pass">
      5 `phase.json` and 33 `task.json`, every one schema-valid. Fidelity was checked three ways rather
      than one: criterion counts against the prose, criterion *text* verbatim against the prose, and
      every `id`, `phase` and `title` against both the source and the directory path. All matched.
    </criterion>
    <criterion id="AC-3" result="pass">
      `nit route --targets @nit/cli` exits 0 and writes a resolved `routing.json`, where before it
      exited 1 with "Module registry not found". The skill composition engine now works on this
      repository, which it never has.
    </criterion>
    <criterion id="AC-4" result="pass">
      Every `targetModule` names one of the three registered modules and every `type` is in the schema's
      enum, asserted by test and verified by injection.
    </criterion>
    <criterion id="AC-5" result="pass">
      Zero prose files modified beyond three deliberate status corrections in `PHASE.md` files, and no
      `state.json` or step directory was fabricated for any of the 32 tasks that never ran through the
      supervisor. The restraint held under pressure: it would have been easy, and wrong, to synthesise
      step outputs so the phase summaries stopped reporting tasks as unreadable.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All five acceptance criteria verified.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 288 pass, 0 fail (11 added). Reproduced by the reviewer. Each new check was verified
      by injecting the failure it guards: an unregistered module, a type outside the enum, and a
      fabricated archetype.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed, RV-2 filed as TASK-033.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    ADR-0003 is satisfied by construction: every generated file was validated at write time, and the
    registries and config were generated from `nit:init`'s own templates rather than hand-written, so
    the workspace matches a freshly initialised one instead of diverging from it on day one.

    ADR-0006 is respected and now visible in data: `modules.json` declares `@nit/skills` depending on
    `@nit/cli`, the CLI depending on nothing, and `@nit/workspace` depending on neither. That is the
    dependency direction the ADR argued for, expressed where boundary enforcement can read it.

    The strongest conformance judgement is a refusal. The task's own out-of-scope forbade fabricating
    `state.json` or step directories, and it held. RV-1 shows the same principle was breached in a
    place the scope did not anticipate, and the fix was to apply the principle rather than defend the
    output.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The migration reads project files and writes
    project state; nothing executes. Worth noting that `modules.json` now declares dependency rules
    that PHASE-4 will *enforce*, so an error here becomes a false positive later — which is why AC-4's
    check is by test rather than by inspection.
  </security-check>

  <test-quality result="pass">
    Eleven tests asserting properties of the workspace rather than of functions, which is right for a
    task whose output is data.

    The fidelity check is the one that earned its keep, and it did so during implementation rather than
    in review: the first pass reported 0 of 7 assumptions migrated, because assumptions carry
    `<statement>` where unknowns and risks carry `<question>`. Without it, `summary.json` would have
    claimed completeness while silently dropping a quarter of the clarifications — exactly the failure
    `nit:phase-summary`'s "do not parse v1 prose" rule exists to prevent. A migration that counts what
    it produced but not what it consumed cannot detect its own omissions.

    Review then extended the audit past counts to text and identity, on the reasoning that a migration
    can produce the right number of wrong things. Nothing further was found, which is itself worth
    recording: the count check was necessary but the text check was the one that could confirm it.
  </test-quality>

  <scope-check result="pass">
    The registries, config, PRD artifacts, phase and task files, and the tests. Two edits reach further
    and both are consequences: PHASE-4's out-of-scope was amended rather than quietly ignored, because
    the line deferring this migration was written on the assumption it was cosmetic and two of that
    phase's own criteria depend on it; and TASK-033 was filed for a gap this work exposed.

    The three `PHASE.md` status corrections are in scope: status is current state, not history, and
    leaving prose and JSON disagreeing would have created the exact drift this migration exists to end.
  </scope-check>

  <convention-guards>
    <guard description="Validate at write time (ADR-0003)" result="pass">Every generated file validated as written; registries generated from init's templates.</guard>
    <guard description="Do not fabricate history" result="pass">No state.json or step directory invented; archetype removed from completed tasks as RV-1.</guard>
    <guard description="Migration fidelity is verified, not assumed" result="pass">Counts, text and identity all compared against source.</guard>
    <guard description="The v1 prose is retained as the record" result="pass">Zero prose files modified beyond deliberate status corrections.</guard>
    <guard description="Module names and task types come from the registry and schema" result="pass">Asserted by test, verified by injection.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — the migration fabricated an `archetype` for all 32 tasks. No v1 task file
      declared one, and the field is optional in `task.schema.json`, so every value was invented by a
      type-to-archetype table written for this migration. For 29 completed tasks that never ran through
      the supervisor, asserting an archetype claims a dispatch decision that was never made — the same
      fabrication this task's own out-of-scope refused for `state.json` and step directories, committed
      in a place the scope did not think to name.
      One of the invented values was also wrong: TASK-022, the only `qa`-type task, was given
      `backend-feature`, whose engineer is `backend-engineer`.
    - [major, filed as TASK-033] RV-2 — no shipped archetype dispatches a `qa`-type task to the qa
      engineer. The three feature archetypes bind backend, frontend and infra; only `bugfix` and
      `cross-module-change` defer via `$detect`, and neither describes building test infrastructure.
      This is the other half of TASK-022's observation that the qa agent's second duty is reachable
      only through `$detect` — there is no natural archetype that gets you there.
    - [note] The wrong archetype was found by asking what the derived data *implied* — that a qa task
      would be implemented by the backend engineer — rather than by checking that it validated. It
      validated perfectly. Schema validity says a value is well-formed, not that it is true, and
      migrated data is exactly where that distinction bites.
    - [note] `modules.json` declares three modules where the prose declared eleven names. Two of the
      eleven were compound — `@nit/cli + .claude/skills` and a frontend pair — and were mapped to their
      primary module, since `targetModule` is singular by design and the cross-module nature is recorded
      in the prose. Defensible, but it is the one place where information was compressed rather than
      carried.
    - [note] Phase summaries will still report every completed task as `unreadable`, because they
      aggregate from step outputs and none exist. That is correct and was chosen: the tasks genuinely
      did not run through the supervisor. The workspace can now be *planned* from, which was the
      blocker; it cannot be *summarised* from, and no migration could honestly change that.
    - [note] This is the first task in the repository whose `task.json` was written as the canonical
      artifact rather than derived from prose afterwards. TASK-033's was too.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `archetype` removed from all 29 completed tasks. It is retained on the three that are still
      `draft` or `in-progress`, where it is a genuine forward-looking planning decision rather than a
      claim about the past — and all three are `devops`, mapping to `infra-change`, whose engineer is
      `infra-engineer`, which is correct. A test asserts no completed task claims an archetype,
      verified by adding one back and confirming the failure.
    </item>
    <item id="RV-2" result="filed as TASK-033">
      Filed with three acceptance criteria, the second requiring a test that every task type has at
      least one archetype reaching that type's engineer — so the gap is closed as a class rather than
      for `qa` alone. Added to PHASE-4's draft tasks. Not fixed here: adding an archetype is a change to
      the shipped set and belongs in its own task with its own review.
    </item>
    <verification>
      `bun test` — 288 pass, 0 fail after both changes.
    </verification>
  </finding-resolution>

</review>
