# TASK-030 — Phase Success Criteria Need a v2 Home

<task>

  <meta>
    <id>TASK-030</id>
    <phase>PHASE-3</phase>
    <title>Phase Success Criteria Need a v2 Home</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>done</status>
  </meta>

  <user-story>
    As the architect closing a phase,
    I want the phase's success criteria stored in `phase.json` where I can verify against them,
    So that milestone verification checks a recorded contract instead of criteria that exist only in a conversation or in a v1 prose file.
  </user-story>

  <scope>
    <in-scope>
    - Add a `successCriteria[]` field to `phase.schema.json`: an id and a description per criterion, mirroring how `task.schema.json` carries `acceptanceCriteria[]`
    - Update `nit:phases` to persist the criteria it already works out interactively, instead of discarding them
    - Update `nit:phase-summary` to read them from `phase.json` and drop the fallback chain it currently needs
    - Decide whether criteria are required or optional on a phase, and whether `nit:tasks` should be able to trace a task to the criterion it serves
    - Backfill is out of scope, but the schema change must not invalidate the phase.json files that already exist
    </in-scope>
    <out-of-scope>
    - Migrating this repository's v1 `PHASE.md` files to `phase.json` (TASK-026 excludes workspace migration)
    - Automatically deriving criteria from the milestone sentence — the point is to record what the architect decided, not to infer it
    - Verifying criteria automatically; verification stays the architect's judgement at phase summary
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a phase planned with nit:phases,
      When the phase.json is written,
      Then it carries the agreed success criteria with stable ids, and validates against phase.schema.json.
    </criterion>
    <criterion id="AC-2">
      Given a phase.json carrying success criteria,
      When nit:phase-summary verifies the milestone,
      Then each criterion in the summary's milestone.criteria corresponds to one in phase.json by id, with no fallback to PHASE.md or to deriving criteria from the milestone sentence.
    </criterion>
    <criterion id="AC-3">
      Given the phase.json files that already exist without the new field,
      When they are validated,
      Then they still pass, so the change is additive.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - Dependencies identified
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - Tests written and passed
  - Code review passed
  - No critical tech debt introduced
  </definition-of-done>

  <dependencies>
    - TASK-013 (nit:phases and phase.schema.json in their v2 form)
    - TASK-023 (nit:phase-summary, the consumer that needs the criteria)
  </dependencies>

  <notes>
    **The gap, concretely.** `phase.schema.json` defines exactly five properties — `id`, `title`,
    `milestone`, `status`, `businessValue` — with `additionalProperties: false`. `nit:phases` states
    it outright: "Per-phase scope, draft tasks, and success criteria are worked out interactively and
    then materialised by `nit:tasks` … they are not stored in `phase.json`."

    So on a v2 workspace the success criteria are discussed and then discarded. The only place they
    survive is the v1 `PHASE.md` prose, which v2 does not write.

    **Why it surfaced in TASK-023.** `phase-summary.schema.json` requires
    `milestone.criteria[]` with a `met`/`unmet` result and evidence per criterion. That output has no
    v2 input: on a pure v2 workspace the skill has nothing to verify against except the single
    `milestone` sentence. The skill currently degrades through a documented fallback chain — read
    `PHASE.md` if present, otherwise derive one criterion per outcome named in the milestone — which
    works but is a workaround for missing data, and makes criterion ids unstable between runs.

    **The pattern this belongs to.** TASK-027, TASK-028 and TASK-029 are each a declared contract that
    nothing consumes. This is the same fault inverted: a consumer that requires data nothing produces.
    Worth naming together at phase summary rather than as four unrelated defects.
  </notes>

</task>
