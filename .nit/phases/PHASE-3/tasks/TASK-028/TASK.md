# TASK-028 — Resolve $detect to a Concrete Engineer Role at Dispatch

<task>

  <meta>
    <id>TASK-028</id>
    <phase>PHASE-3</phase>
    <title>Resolve $detect to a Concrete Engineer Role at Dispatch</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>done</status>
  </meta>

  <user-story>
    As the supervisor dispatching the implement step of a bugfix or cross-module-change task,
    I want `$detect` resolved to the engineer role the task's own type implies,
    So that the dispatch descriptor names an agent that exists instead of the literal string `$detect`.
  </user-story>

  <scope>
    <in-scope>
    - Resolve `$detect` to a concrete engineer role using the task's `type` and the role mapping in `.nit/registry/task-types.json` / `.nit/config/role-routing.json`
    - Decide where resolution belongs: `resolveArchetype` cannot do it (it has no task context), so it is the supervisor's job at `prepare`, where `task.json` is available
    - Fail loudly when the type cannot be mapped, rather than emitting a role no agent answers to
    - Cover the two archetypes that use it — `bugfix` and `cross-module-change` — and the four engineer roles a type can resolve to: `backend-engineer`, `frontend-engineer`, `infra-engineer`, `qa`
    - Add a guard that no dispatch descriptor ever carries a `$`-prefixed role
    </in-scope>
    <out-of-scope>
    - Changing the archetype placeholder syntax itself; `$engineer` and `$detect` stay as authored
    - Inferring the type from the diff or the module when `task.json` already declares one
    - New archetypes for the types that currently have none
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a bugfix task whose task.json declares a type,
      When the supervisor prepares the implement step,
      Then the dispatch descriptor's role is the concrete engineer role for that type, and no descriptor or input.json carries the literal `$detect`.
    </criterion>
    <criterion id="AC-2">
      Given each of the four task types,
      When $detect is resolved,
      Then backend maps to backend-engineer, frontend to frontend-engineer, devops to infra-engineer, and qa to qa, and each resolved role has an agent definition on disk.
    </criterion>
    <criterion id="AC-3">
      Given a task whose type cannot be mapped to an engineer role,
      When the supervisor prepares a $detect step,
      Then it fails with a message naming the type and the step, rather than dispatching an unresolvable role.
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
    - TASK-019 (archetype resolution, where $detect is deliberately preserved)
    - TASK-015 (the supervisor prepare path where resolution must happen)
  </dependencies>

  <notes>
    **The defect, concretely.** `replacePlaceholders` substitutes `$engineer` from the archetype's
    `engineerRole`, but when `engineerRole` is `$detect` it preserves the literal. Nothing downstream
    resolves it. `prepare` on a bugfix task at the implement step emits:

        "stepId": "implement",
        "role": "$detect"

    and `nit:continue` instructs the caller to dispatch with `subagent_type` = that role. No agent is
    named `$detect`, so the implement step of every `bugfix` and `cross-module-change` task cannot be
    dispatched. Two of six shipped archetypes are affected.

    **Why it surfaced in TASK-022.** The qa agent has two duties: verify behaviour at the qa step, and
    implement testing-infrastructure tasks at the implement step. The second is reached only when a
    qa-type task's `$engineer` resolves to `qa` — which happens through `$detect`. So the duty
    documented in `.claude/agents/qa.md` is currently unreachable. The agent definition describes the
    intended contract; this task makes it true.

    **Where resolution belongs.** `resolveArchetype` takes only an archetype name and has no access to
    `task.json`, which is why `$detect` survives it. The supervisor has the task directory at
    `prepare`, so that is the natural place — but it means the resolved step list and the dispatched
    role can differ, and the descriptor is the thing that must be correct.
  </notes>

</task>
