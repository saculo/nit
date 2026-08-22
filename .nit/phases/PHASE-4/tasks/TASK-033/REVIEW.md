# Review — Task 33: No Archetype Serves a qa-Type Task

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-23), after one finding fixed during review. This task was filed in PHASE-3 and
    partly satisfied by TASK-042 before it ran; what it delivers is the part TASK-042 deliberately
    left.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    twenty-five consecutive pull requests.

    One deviation specific to this task: its acceptance criteria were already satisfied when it
    started. TASK-042 made the qa engineer reachable by having `infra-change` defer its role, and
    recorded that it had done so. A task whose criteria pass before any work is a signal worth reading
    rather than a formality to discharge, and the honest options were to close it or to deliver the
    part TASK-042 named as remaining. This delivers that part, and the criteria are re-verified against
    the new archetype rather than against `infra-change`.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `qa-setup`'s implement step is `$detect`, which resolves to the `qa` engineer for a qa task, and
      `.claude/agents/qa.md` exists to dispatch to. Verified through `nit archetype qa-setup` as well
      as in tests.
    </criterion>
    <criterion id="AC-2" result="pass">
      Asserted twice, from different directions: every engineer role the resolver knows is reachable
      from some shipped archetype, and each task type's own `defaultArchetype` reaches that type's
      engineer. The first would still pass if `qa` were reachable only from `bugfix`, which would be a
      technicality; the second is the one that means a qa task actually gets the qa engineer.
    </criterion>
    <criterion id="AC-3" result="pass">
      `registry/task-types.json` points `qa` at `qa-setup`, `nit:init`'s template is compared against
      the shipped registry by test, and both proposing skills — `nit:tasks` and `nit:analyze` — list
      it among the concrete archetypes. A default naming an archetype the analyst has never heard of
      would be a default nobody proposes.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All three acceptance criteria verified against `qa-setup`.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 636 pass, 0 fail (23 added). Reproduced. Verified by reversion: routing to a removed
      step fails 16, hardcoding an engineer fails 4, pointing qa back at `infra-change` fails 3,
      keeping the qa step fails 2, and the review fix fails 1.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The question this task had to answer honestly was whether a new archetype was warranted at all.
    After TASK-042 the routing was correct and the only complaint was a name, and this project has
    spent three tasks removing things that existed without behaving differently — `template`,
    `moduleSkills`, the archetype-keyed registry. A `qa-setup` identical to `infra-change` would have
    been the same mistake with a friendlier label.

    It earns its file by stopping after review. The `qa` step exists so that someone other than the
    author exercises the acceptance criteria; for a qa-type task the implement step is already the qa
    engineer, so the step becomes that agent checking its own work — which is the one thing the step is
    not for. Two tests assert the difference in both directions, so a future merge of the two
    archetypes fails rather than silently restoring self-verification.

    The trade-off is real and is not hidden: a qa task's criteria are now verified by the reviewer
    alone, where other types get a reviewer *and* an independent qa pass. That is a reduction in
    verification, justified by the fact that the second pass was not independent. If the project would
    rather keep the step, it is one line in `overrides.removeSteps`, and the tests say plainly what
    they are protecting.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The change is one archetype file, registry
    data, and documentation.
  </security-check>

  <test-quality result="pass">
    Twenty-three tests. The one that carries the most weight runs the resolver's *own*
    `assertRejectionRoutingResolvable` over the resolved archetype rather than re-checking the routing
    by hand. Re-implementing the check in a test proves the test's logic, not the resolver's, and
    TASK-027 exists because a routing that resolved cleanly broke at reject time.

    The pair asserting `infra-change` keeps its qa step and `qa-setup` does not is what stops this
    archetype quietly becoming a duplicate. Without it the file could drift into an exact copy and
    every other test would still pass.

    The limit is unchanged and worth restating at the end of this phase: no task in this project has
    ever run through the supervisor, so `qa-setup` is verified as a resolvable, dispatchable
    declaration and not as a sequence that has produced work.
  </test-quality>

  <scope-check result="pass">
    The archetype, the registry entry, `nit:init`'s template, the two proposing skills, the
    orchestration skill's list of `$detect` archetypes, the qa agent's own description, and the tests.

    The documentation edits are not padding: an archetype nobody proposes is unreachable in practice,
    and each of those files independently lists the archetypes or the roles. `nit:e2e-orchestration`
    named `bugfix` and `cross-module-change` as the `$detect` archetypes and was already stale after
    TASK-042 changed `infra-change`; this corrects both.

    Out of scope and left alone: whether other archetypes should also stop after review, and whether
    the `qa` step's role should differ from the implement engineer generally.
  </scope-check>

  <convention-guards>
    <guard description="A declaration must behave differently to exist" result="pass">qa-setup differs from infra-change by a step; asserted both ways.</guard>
    <guard description="Removing a step declares its rejection routing (TASK-027)" result="pass">Declared, and checked with the resolver's own assertion.</guard>
    <guard description="Every dispatched step has a skill (TASK-036)" result="pass">All four resolve to a SKILL.md.</guard>
    <guard description="A template must match what ships" result="pass">init's task-types template compared against the registry.</guard>
    <guard description="An agent is not told something false about its own dispatch" result="pass">Fixed as RV-1.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — `.claude/agents/qa.md` told the qa agent that the qa step is "the last step
      of the archetype". That was already untrue for `architecture-decision`, which has no qa step, and
      this task made a second exception. An agent that believes a false thing about its own dispatch
      produces confident wrong behaviour rather than a visible error — it would reasonably conclude
      that nothing follows it, and for `qa-setup` a reviewer's approval does. The definition now names
      the exceptions, points at `input.json` as the only authority on which step it is doing, and says
      why its own archetype omits the step. The `nit:qa` skill's "you run last" is corrected the same
      way.
    - [note] `qa-setup` is intended for qa-type tasks and nothing enforces that. A `backend` task
      assigned it would get its own engineer at implement — correct — and would silently lose its qa
      pass. The same shape as TASK-042's note about pairing a non-devops type with `infra-change`: the
      archetype is a proposal, not a constraint, and the analyst is the check.
    - [note] A qa task now gets one verification pass rather than two. The removed one was not
      independent, so this is less loss than the count suggests, but it is a reduction and the reason
      lives in a test comment and this review rather than anywhere the analyst will read it.
    - [note] This task's criteria were already satisfied by TASK-042 before it began. That is the
      second time in this phase that one task substantially completed another — TASK-036 did it to
      TASK-035's enforcement gap — and both times it was found by reading the criteria rather than by
      any mechanism. Task-level dependencies exist now (TASK-043) but express ordering, not overlap.
    - [note] With this merged, every PHASE-4 task is `done` and `nit deps --phase PHASE-4` reports so.
      The phase is ready for its summary, which is where the seven-task boundary-crossing pattern and
      the four "declared but unread" removals belong.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `.claude/agents/qa.md` no longer claims the qa step is always last: it names
      `architecture-decision` and `qa-setup` as the archetypes without one, states that `input.json` is
      what tells the agent which step it is doing, and explains that `qa-setup` omits the step because
      the agent would otherwise verify its own work. `nit:qa`'s "you run last" becomes "you run last in
      the archetypes that dispatch you". Three tests, including one asserting that every archetype
      which *keeps* a qa step really does dispatch the qa role.
    </item>
    <verification>
      `bun test` — 636 pass, 0 fail. Confirmed by reversion.
    </verification>
  </finding-resolution>

</review>
