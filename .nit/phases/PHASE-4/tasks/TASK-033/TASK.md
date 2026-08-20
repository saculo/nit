# TASK-033 — No Archetype Serves a qa-Type Task

<task>

  <meta>
    <id>TASK-033</id>
    <phase>PHASE-4</phase>
    <title>No Archetype Serves a qa-Type Task</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>todo</status>
  </meta>

  <user-story>
    As someone creating a task whose deliverable is test infrastructure,
    I want an archetype that dispatches its implement step to the qa engineer,
    So that a qa-type task can be planned without borrowing an archetype that describes different work.
  </user-story>

  <scope>
    <in-scope>
    - Decide how a `qa`-type task reaches the qa engineer. The three concrete feature archetypes bind `backend-engineer`, `frontend-engineer` and `infra-engineer`; only `bugfix` and `cross-module-change` defer via `$detect`, and neither describes building test infrastructure
    - Either add a `qa-feature` archetype mirroring the other three, or make the type-to-archetype default resolve qa to one that works, and record which
    - Update `registry/task-types.json` so the `defaultArchetype` for a qa task names something that dispatches to qa
    - Cover it by test: every task type must have at least one archetype whose implement step reaches that type's engineer
    </in-scope>
    <out-of-scope>
    - Changing `$detect` resolution, which works correctly (TASK-028)
    - The qa *step*, which is unaffected — this is about a task whose *deliverable* is test infrastructure, not about the verification step every archetype already runs
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a task whose type is qa,
      When an archetype is proposed for it by nit:tasks or nit:analyze,
      Then the proposed archetype's implement step dispatches to the qa engineer.
    </criterion>
    <criterion id="AC-2">
      Given every task type the schema allows,
      When each is checked against the shipped archetypes,
      Then at least one archetype's implement step reaches that type's engineer, asserted by test.
    </criterion>
    <criterion id="AC-3">
      Given registry/task-types.json,
      When a qa task looks up its defaultArchetype,
      Then that archetype exists and satisfies AC-1.
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
    - TASK-028 ($detect resolution, which is the only route to the qa engineer today)
    - TASK-022 (which documented the qa agent's two duties; this is the gap that makes the second unreachable by any natural archetype)
  </dependencies>

  <notes>
    **Found during TASK-032's review.** Migrating the workspace required assigning an archetype per
    task, and the only qa-type task in the repository — TASK-022, "Dedicated nit:qa Step Skill" — was
    given `backend-feature`, whose engineer is `backend-engineer`. That value was fabricated by the
    migration and has since been removed along with every other archetype on a completed task, but the
    underlying gap is real: nothing in the shipped set dispatches a qa task to the qa engineer.

    TASK-022's review noted that `.claude/agents/qa.md` has two duties and that the second — implementing
    testing infrastructure at the implement step — is reachable only through `$detect`. This is the
    other half of that observation: `$detect` lives on `bugfix` and `cross-module-change`, so the only
    way to plan a qa task today is to describe it as a bug fix or a cross-module change.
  </notes>

</task>
