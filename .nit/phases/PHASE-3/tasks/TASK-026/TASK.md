# TASK-026 — Stop Scaffolding v1 Artifacts and Remove Orphaned Machinery

<task>

  <meta>
    <id>TASK-026</id>
    <phase>PHASE-3</phase>
    <title>Stop Scaffolding v1 Artifacts and Remove Orphaned Machinery</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>done</status>
  </meta>

  <user-story>
    As someone running nit:init on a new project,
    I want the scaffolded workspace to describe only the artifacts v2 actually produces,
    So that a project created today does not start life with a registry declaring DESIGN.md, STEPS.md, IMPLEMENTATION.md and REVIEW.md — four artifact types the pipeline has stopped writing.
  </user-story>

  <scope>
    <in-scope>
    - Fix the `artifact-types.json` template in `.claude/skills/init/SKILL.md`: replace the `design`, `implementation`, `review`, and `step-plan` prose entries with the v2 artifacts — `step-output`, `step-input`, `task-state`, `approval`, `validation-result`, `routing`
    - Audit the rest of the init templates for v1 assumptions in the same way, including any file patterns pointing at `.nit/phases/**/*.md`
    - Delete the orphaned argument-validation hooks superseded by supervisor dispatch: `.claude/hooks/validate-design.sh`, `.claude/hooks/validate-implement.sh`, and any other hook whose skill no longer takes slash-command arguments
    - Settle design Q-4: `.nit/skills/` and `.nit/hooks/` duplicate `.claude/skills/` and `.claude/hooks/` and have been stale since PHASE-1. Decide which tree is the shipped template, record the decision, and delete the other
    - Verify the decision against the `.nit/` directory principle: `.nit/` is for project business state, not nit's own infrastructure
    </in-scope>
    <out-of-scope>
    - Migrating this repository's own v1 `.nit/` workspace to `phase.json` / `task.json` — init explicitly does not migrate v1 workspaces (A-2), and doing so here would rewrite the project's own history mid-phase
    - The global `~/.claude/skills/nit/` namespace separation (PHASE-5, formerly PHASE-4)
    - Changing what any step skill writes; this task only stops nit from *declaring* artifacts nothing produces
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a fresh nit:init run,
      When the generated artifact-types.json is inspected,
      Then every declared artifact type corresponds to something the v2 pipeline actually writes, and none of DESIGN.md, STEPS.md, IMPLEMENTATION.md, or REVIEW.md appears.
    </criterion>
    <criterion id="AC-2">
      Given the generated workspace,
      When each config and registry file is validated against its schema,
      Then all of them pass, as ADR-0003 requires at write time.
    </criterion>
    <criterion id="AC-3">
      Given the hooks directory,
      When it is inspected after this task,
      Then no hook remains that validates slash-command arguments for a skill that is dispatched by the supervisor, and every remaining hook is wired to a skill that still exists.
    </criterion>
    <criterion id="AC-4">
      Given the duplicated .nit/skills/ and .nit/hooks/ trees,
      When Q-4 is settled,
      Then exactly one tree remains, the choice is recorded with its rationale, and the surviving tree is consistent with the principle that .nit/ holds project business state rather than nit infrastructure.
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
    - TASK-021, TASK-022, TASK-023, TASK-024, TASK-025 — the artifact list is only final once every skill has been migrated, so this task closes the phase rather than opening it
  </dependencies>

  <notes>
    **The init defect is the one that propagates.** Every other item in this migration affects only
    this repository. `nit:init` is different: its `artifact-types.json` template ships v1 assumptions
    into every project scaffolded from here on, so each new adopter inherits a registry describing
    artifacts the pipeline will never write. It is the only v1 remnant with a blast radius beyond the
    repo, which is why it is grouped with cleanup rather than left as tidying.

    **Q-4 was raised in TASK-017's design and deferred twice.** `.nit/skills/` and `.nit/hooks/`
    duplicate `.claude/` and have been stale since PHASE-1 — they lack every v2 skill. Leaving two
    trees means every future skill change has an ambiguous target, and the stale copy is a trap for
    anyone who finds it first. The project principle that `.nit/` carries business state and not
    infrastructure points at deleting the `.nit/` copies, but the decision needs recording either way.

    **Sequenced last deliberately.** Deciding which artifact types v2 declares requires knowing what
    the migrated skills write, so this task depends on the five before it.
  </notes>

</task>
