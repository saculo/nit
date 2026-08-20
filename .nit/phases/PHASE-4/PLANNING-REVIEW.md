# Review — PHASE-4 task planning (nit:tasks, first real run)

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-20). Two structural findings raised during review and filed as TASK-042 and
    TASK-043; one test defect fixed during the run itself.
  </verdict-history>

  <input-validation-deviation>
    This reviews **planning output**, not an implemented task, so there is no `REVIEW.md` under a task
    directory and no acceptance criteria of its own to check. What is reviewed is whether the eight
    task specifications satisfy the rules `nit:tasks` declares, and whether the run itself behaved as
    the skill says it should.

    Two process deviations, both deliberate and both stated at the time. The tasks were proposed as a
    set rather than one at a time, on the grounds that the nine draft tasks were already agreed when
    PHASE-4 was scoped and this run was assigning modules and criteria to them. And CodeRabbit has now
    skipped fourteen consecutive pull requests.
  </input-validation-deviation>

  <rules-check>
    <rule id="one-task-one-module" result="pass">
      Every task names exactly one `targetModule`, and each is one of the three the registry declares.
      Six target `@nit/cli`, two `@nit/skills`. The split is real rather than nominal: TASK-036 and
      TASK-038 change skill prose, the rest change code.
    </rule>
    <rule id="one-type-per-task" result="pass">
      All eight are `devops`. That is accurate rather than lazy — every one is build tooling,
      validation, or CLI work. No task mixes concerns across types.
    </rule>
    <rule id="sizing" result="pass">
      Three or four acceptance criteria each, inside the skill's 2–5 band. None is a single-criterion
      task that should have been folded in, and none is a seven-criterion task that should have split.
    </rule>
    <rule id="yagni" result="pass">
      Every task traces to a criterion the phase declared before the work started — which is the
      distinction PHASE-3's re-scope failed to preserve and this phase can. Nothing is built "for
      later"; TASK-039's index exists because SC-3 and SC-4 need somewhere to put candidates.
    </rule>
    <rule id="criterion-coverage" result="pass">
      All seven criteria are covered, and the coverage was computed rather than asserted. SC-7 is
      served as a constraint on the four tasks that add schema fields rather than as its own task,
      which is right: it is a definition-of-done, not work.
    </rule>
    <rule id="validated-immediately" result="pass">
      Each `task.json` was validated as written, per the skill's rule against batching.
    </rule>
    <rule id="no-parallel-prose" result="pass">
      No `TASK.md` was written. This is the first set of tasks in the repository that exists only as
      `task.json` — and it is what exposed the test defect below.
    </rule>
  </rules-check>

  <findings>
    - [major, filed as TASK-042] RV-1 — the Archetype Proposal step cannot be executed as written.
      `nit:tasks` says "Look up the task's `type` in `.nit/registry/task-types.json` and read its
      `defaultArchetype`". The registry's ids are `backend-feature`, `frontend-feature`,
      `infra-change`, `cross-module-change`, `bugfix`, `architecture-decision` — archetype names. A
      lookup of `backend`, `frontend`, `devops` or `qa` returns nothing; all four fail.
      The archetype assigned to these eight — `infra-change` — was therefore chosen by judgement, not
      derived. It happens to be correct, because `devops` maps to `infra-engineer` (TASK-028) and
      `infra-change` binds that role, but the skill's first instruction is dead and every archetype
      proposal since PHASE-2 has been made without it. The registry is misnamed: it holds archetypes,
      not task types. This is the same confusion that made TASK-028 put the type-to-role map in the
      CLI rather than in a registry that looked like it should own it.
    - [major, filed as TASK-043] RV-2 — `task.json` cannot record dependencies, and `nit:tasks` is
      instructed twice to produce them: "noting dependencies on previous tasks" and "present a summary
      of all created tasks with dependency graph". The schema declares `id`, `phase`, `title`, `type`,
      `targetModule`, `status`, `archetype` and `acceptanceCriteria`, and nothing else.
      The dependencies are real: TASK-035 needs TASK-034's schema before it can enforce anything, and
      TASK-039's index has nothing to index until TASK-037 and TASK-038 produce candidates. Those
      orderings exist in this review and in the commit message, which is to say nowhere a tool can
      read. This is ADR-0007's inverse — an instruction requiring data no schema can hold — and the
      fourth instance of that shape after TASK-030.
    - [fixed during the run] The suite caught a defect in TASK-032's own test. It asserted every
      `task.json` has a `TASK.md` sibling, which held for 33 migrated tasks and is forbidden for these
      eight, since `nit:tasks` bans parallel prose. The test had encoded a migration-time property as a
      permanent invariant. Inverted to the property that actually holds — every task recorded as prose
      gained a `task.json` — and re-verified against a real regression.
      Worth noting how it surfaced: not by review, but by the first use of the thing the migration
      enabled. A test written against a one-time state will pass until the state changes, and the
      change is exactly when you stop looking.
    - [note] Three of PHASE-4's ten tasks serve no success criterion: TASK-032, TASK-033, and now
      TASK-042 and TASK-043 make four. All were filed by reviews rather than planned. `nit:tasks` says
      a task serving no criterion is "either out of scope or evidence the criteria are incomplete", and
      at four instances the second reading is the honest one — a phase about archetypes, routing and
      schema conformance plausibly *should* have a criterion covering "the planning system's own
      contracts are coherent". It is deliberately not retrofitted: PHASE-3 added two criteria after the
      fact and the cost of that is recorded there. Adding a criterion now, before the work, would be
      legitimate; doing it at phase summary would not.
    - [note] TASK-036 was not in the draft-task list PHASE-4 was scoped with. It was added because the
      survey found `nit:boundary-check` has no SKILL.md — the last entry on the routing conformance
      allowlist — so the step cannot dispatch. Enforcing a step that cannot run would have produced a
      phase that passes its criteria while the feature does not work, which is the failure the
      allowlist was built to make visible.
    - [note] Every archetype here is `infra-change`, so the phase will exercise exactly one archetype
      end to end. The five others stay untested by real use, including the two whose `$detect`
      resolution TASK-028 fixed and nothing has since exercised.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="filed as TASK-042">
      Three acceptance criteria: an entry per task type with a `defaultArchetype`, a settled decision
      about whether the registry describes types or archetypes with `nit:init` and the skills agreeing,
      and a test that each type's default archetype reaches that type's engineer. Not fixed here —
      renaming or re-keying a registry changes `nit:init`'s template and every skill that reads it.
    </item>
    <item id="RV-2" result="filed as TASK-043">
      Four acceptance criteria, including that a dependency naming a task that does not exist fails
      validation, and that the graph `nit:tasks` presents is derived from recorded data rather than
      from prose. Not fixed here — it is a schema change with its own review.
    </item>
    <verification>
      `bun test` — 288 pass, 0 fail. All ten PHASE-4 `task.json` files validate.
    </verification>
  </finding-resolution>

</review>
