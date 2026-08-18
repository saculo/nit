# TASK-025 — Rewrite nit:orchestrate for the v2 Pipeline

<task>

  <meta>
    <id>TASK-025</id>
    <phase>PHASE-3</phase>
    <title>Rewrite nit:orchestrate for the v2 Pipeline</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>todo</status>
  </meta>

  <user-story>
    As someone who wants to run a whole project rather than drive it one step at a time,
    I want an orchestrator that runs the full v2 lifecycle — clarify, phases, tasks, then the supervisor loop per task, then phase close — with approval gates at each boundary,
    So that the end-to-end pipeline is a single entry point instead of a sequence of commands I have to remember and sequence myself.
  </user-story>

  <scope>
    <in-scope>
    - Rewrite `.claude/skills/e2e-orchestration/SKILL.md` as a full v2 project-lifecycle orchestrator
    - Replace the per-task design/implement/review dispatch with delegation to the supervisor: for each task, loop `/nit:continue` (prepare, dispatch, ingest) and `/nit:approve` or `/nit:reject` until `state.json.status` is `done`
    - Read routing decisions from `state.json` and the resolved archetype, never from `<type>` in a `DESIGN.md`
    - Handle every terminal supervisor state: `awaiting_approval` gates to the user, `blocked` and `escalated` stop the loop and surface the reason rather than retrying
    - Retain the project-level responsibilities the supervisor does not cover: the clarify → phases → tasks chain, the per-phase task loop, phase-boundary approval gates, and phase close via `nit:phase-summary`
    - Task splitting flow: when a task is blocked with reason `needs-splitting`, route back to `nit:tasks` in splitting mode
    - Correct the engineer routing table — it names a `devops-engineer` agent that does not exist under that name
    - Reconcile the "only the orchestrator dispatches agents" rule with the supervisor, which dispatches the specialist itself
    </in-scope>
    <out-of-scope>
    - Reimplementing any state transition — every one belongs to the CLI per ADR-0004; the orchestrator reads state and calls commands
    - Unattended or auto-approving operation; every existing approval gate stays a gate
    - Multi-project orchestration (PHASE-4)
    - PR creation policy — decide where it lives, but implementing a PR-opening step is out of scope if it is not already in the pipeline
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a task with a task.json and an archetype,
      When the orchestrator runs that task,
      Then it advances the task by calling the supervisor and the approval commands only, and performs no step dispatch or state transition of its own.
    </criterion>
    <criterion id="AC-2">
      Given a task that reaches blocked or escalated,
      When the orchestrator observes that state,
      Then it stops the task loop, surfaces the reason and explanation to the user, and does not advance to the next task without a decision.
    </criterion>
    <criterion id="AC-3">
      Given a task blocked with reason needs-splitting,
      When the orchestrator handles it,
      Then it routes to nit:tasks in splitting mode with the reported task types, and continues with the resulting subtasks after user approval.
    </criterion>
    <criterion id="AC-4">
      Given a phase whose tasks are all done,
      When the orchestrator closes the phase,
      Then it dispatches nit:phase-summary, gates on the user, and proceeds to the next phase only after approval.
    </criterion>
    <criterion id="AC-5">
      Given the rewritten skill,
      When it is inspected for v1 assumptions,
      Then it references no DESIGN.md-based type routing, no STEPS.md or IMPLEMENTATION.md, and no agent name that has no definition on disk.
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
    - TASK-015 and TASK-016 (the supervisor and approval commands this delegates to)
    - TASK-018 (blocked handling required by AC-2 and AC-3)
    - TASK-021, TASK-022, TASK-023 (the review, qa, and phase-summary steps the full loop runs through)
  </dependencies>

  <notes>
    **Sequence this last.** The orchestrator drives every other skill, so rewriting it before the
    steps it drives would mean writing against contracts that are still changing. Its dependency list
    is effectively the rest of the migration.

    **The core tension to resolve.** The v1 skill's first rule is "only you dispatch agents — no
    lower-level skill or agent dispatches other agents". That is now false: the supervisor dispatches
    the specialist at each step, which is precisely what ADR-0004 made deterministic. The rewrite must
    state the real division — the orchestrator decides *which task* runs next and gates the user; the
    supervisor decides *which step* runs next and dispatches it. Leaving the old rule in place would
    put two components in charge of the same decision, which is the failure mode ADR-0004 exists to
    prevent.

    **A design question worth settling explicitly.** With the supervisor owning the task loop, the
    orchestrator's remaining value is the project-level loop plus the approval gates. If that turns
    out to be thin, retiring the skill is a legitimate outcome to propose at design — but the decision
    should be made deliberately and recorded, not reached by letting the skill rot.
  </notes>

</task>
