# TASK-032 — Migrate the nit Workspace to v2 Artifacts

<task>

  <meta>
    <id>TASK-032</id>
    <phase>PHASE-4</phase>
    <title>Migrate the nit Workspace to v2 Artifacts</title>
    <type>devops</type>
    <module>@nit/workspace</module>
    <status>done</status>
  </meta>

  <user-story>
    As nit, planning and summarising my own project,
    I want this repository's `.nit/` workspace expressed in the v2 artifacts my own skills read,
    So that `nit:tasks` can plan the next phase, `nit:phase-summary` can aggregate from step outputs, and boundary enforcement has a module registry to enforce against.
  </user-story>

  <scope>
    <in-scope>
    - `.nit/boundaries/modules.json` — the repository's real modules with `languageId`, `allowedDependencies`, and any `customSkills`
    - `.nit/registry/` — `task-types.json`, `roles.json`, `skills.json`, `artifact-types.json`, matching what `nit:init` would scaffold and what this repository actually uses
    - `.nit/config/` — the config files `nit:init` writes, alongside the existing `nit.yaml`
    - `.nit/prd/summary.json`, `glossary.json`, and `source.md`, reconstructed from the existing `CLARIFICATIONS.md` and the PRD the project was built from
    - `phase.json` for PHASE-1 through PHASE-5, carrying `successCriteria` (TASK-030)
    - `task.json` for all 31 existing tasks, with acceptance criteria carried across verbatim
    - Normalise the module names task files declare — eleven variants describe two modules — and the task types, one of which (`infra`) is not in the schema's enum
    - Every generated file validated against its schema at write time (ADR-0003)
    </in-scope>
    <out-of-scope>
    - Deleting the v1 prose. `TASK.md`, `DESIGN.md` and `REVIEW.md` are the historical record of work done under v1; `REVIEW.md` in particular has no v2 equivalent here, because reviews are step outputs and no step directories exist. The prose stays as history; `task.json` becomes canonical going forward
    - Reconstructing `state.json` or step directories for completed tasks. Their steps were never run through the supervisor, and inventing step outputs would fabricate a history that did not happen
    - Changing any acceptance criterion's meaning. A migration that silently rewords a contract is worse than no migration
    - Re-running `nit:init`, which does a clean scaffold and would replace the existing config
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the migrated workspace,
      When `nit:tasks` runs its Step 0 validation for PHASE-4,
      Then every precondition it checks is satisfied — `phase.json`, `prd/summary.json`, `boundaries/modules.json`, and `registry/task-types.json` all exist and validate.
    </criterion>
    <criterion id="AC-2">
      Given every generated `phase.json` and `task.json`,
      When each is validated against its schema,
      Then all pass, and each task's acceptance criteria match the prose it came from in count and in text.
    </criterion>
    <criterion id="AC-3">
      Given `boundaries/modules.json`,
      When `nit route` resolves routing for a task,
      Then it exits 0 rather than failing with "Module registry not found", so the skill composition engine works on this repository.
    </criterion>
    <criterion id="AC-4">
      Given the migrated task files,
      When their declared modules and types are inspected,
      Then every `targetModule` names a module in the registry and every `type` is one of the four the schema allows.
    </criterion>
    <criterion id="AC-5">
      Given the v1 prose files,
      When the migration completes,
      Then they are still present and unmodified, and nothing claims a task ran through the supervisor when it did not.
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
    - TASK-030 (phase.json carries successCriteria, which the migrated phases must populate)
    - TASK-026 (established that .nit/ holds project state only; this fills that state in)
  </dependencies>

  <notes>
    **Why now.** Deferred in TASK-026 and recommended by every phase summary since, the migration
    stopped being a reporting limitation and became a blocker at the start of PHASE-4: `nit:tasks`
    hard-stops at Step 0 with all four preconditions missing, `nit route` already exits 1 with "Module
    registry not found", and boundary enforcement — SC-1 and SC-2 of this phase — reads
    `modules.json`, which does not exist. PHASE-4 cannot be planned or built without this.

    **Why it is in scope for PHASE-4 despite its out-of-scope line.** That line deferred the migration
    on the assumption it was cosmetic. It is not: two of this phase's own criteria depend on it. The
    phase's out-of-scope is amended rather than quietly ignored.

    **The prose stays.** `nit:phase-summary` forbids parsing v1 prose into structured fields, and that
    rule is right for summarising — a guess presented as data is worse than a declared gap. This is a
    different act: a deliberate migration, verified field by field, with the source retained. The
    fidelity check in AC-2 is what separates the two.
  </notes>

</task>
