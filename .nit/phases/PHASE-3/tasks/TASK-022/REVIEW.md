# Review — Task 22: Dedicated nit:qa Step Skill

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-18) at first pass. Three findings raised during review: RV-1 corrected within
    this task, RV-2 and RV-3 split out as TASK-028 and TASK-029. All are recorded below.
  </verdict-history>

  <input-validation-deviation>
    Same two standing deviations as TASK-021, unchanged and still worth stating. This task's own
    artifacts are v1 prose (`TASK.md`, this `REVIEW.md`) because the repository workspace has not
    migrated — TASK-026 excludes that deliberately. And implementation and review shared a session, so
    this is not independent review; it was mitigated by executing every claim rather than reading it,
    and by probing for defects the task did not anticipate, which is where all three findings came
    from. CodeRabbit has not yet seen this commit.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `.claude/skills/qa/SKILL.md` reads `input.json` and `context.priorOutputs` (implement, review)
      and emits a `qa-result` carrying `testsRun`, `testsPassed`, and `testsFailed`. Verified by
      execution rather than by reading: a task staged at the qa step dispatched with role `qa` and
      `nit:qa` in the resolved `skillList`, and the emitted result ingested to `awaiting_approval`.
      Ten schema tests cover the shape, including the documented example.
    </criterion>
    <criterion id="AC-2" result="pass">
      `issues[]` is a string array, so the skill defines the `AC-N:` / `tests:` / `coverage:` prefix
      convention — deliberately the same one the review step uses for comments, so a reader moving
      between the two outputs is not learning a second convention. Tests reject a negative count, a
      fractional count, and coverage outside 0–100, so the counts are constrained rather than merely
      accepted. The skill states that an empty `issues[]` is an affirmative claim, not a default.
    </criterion>
    <criterion id="AC-3" result="pass">
      The blocked contract is documented with a correct reason/detail pairing and verified through
      `ingest` end-to-end, not only against the schema: a blocked qa output parks the task at `blocked`
      with the reason surfaced. The skill draws the boundary the right way round — a criterion that
      *fails* is a `qa-result` with non-zero `testsFailed`, not a block; blocking is for criteria that
      cannot be exercised at all. It also explicitly forbids the tempting alternative of reporting zero
      tests as a pass, which would close a task on a claim nobody made.
    </criterion>
    <criterion id="AC-4" result="pass">
      All five step ids now resolve to a SKILL.md on disk, asserted across all six shipped archetypes
      by the test added in TASK-021. The allowlist shrank to `boundary-check` alone, and its companion
      test would have failed had the entry been left stale.
      Scope note: the criterion was written expecting a `qa` versus `qa-engineer` naming collision.
      That premise was wrong — see RV-1. The real defect was semantic and is fixed; the criterion is
      satisfied on its substance, which is that role, agent, and skill agree.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified, three of them by execution.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 130 pass, 0 fail (10 added). Reproduced by the reviewer. The end-to-end run went
      further than the criteria required and completed a full archetype: qa dispatched, ingested,
      approved, task `done`. That path had never executed before this task.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed here, RV-2 and RV-3 split out with rationale.</item>
    <item id="DOD-4" result="pass">
      No critical tech debt introduced. Two pre-existing defects were surfaced and filed rather than
      absorbed silently.
    </item>
  </dod-check>

  <architecture-conformance result="pass">
    The skill follows the established v2 step-skill structure — Invocation, Inputs, Procedure, Output
    shape, When you cannot proceed, Rules — so all five step skills are now structurally consistent.
    ADR-0005 holds (one `output.json`, nothing else persisted); ADR-0003 holds (the procedure ends with
    the CLI validator); ADR-0004 holds (the skill forbids itself from touching `state.json`,
    `approval.json`, or `task.json`).

    The TASK-018 blocked contract is used as the shared mechanism rather than a qa-specific convention,
    which is what AC-6 of that task asked of the skills written in this phase.

    One conformance judgement worth recording: the skill's "what QA is, and is not" table is not
    decoration. `qa-result` and `review-result` are separate schema branches, and without an explicit
    boundary the qa step would have drifted into a second review — the most likely failure mode for a
    step that runs immediately after review over the same change.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. No absolute paths written into any committed
    artifact — checked explicitly, since that defect class has now recurred twice in this phase.
    The skill instructs QA to run the project's test command, which is execution of project-controlled
    input, but that is inherent to the step and identical to what the implement step already does.
  </security-check>

  <test-quality result="pass">
    `qa-result` had no coverage before this task despite existing in the schema since PHASE-2 — the
    same gap TASK-021 closed for `review-result`. Ten tests now cover it, and the negative cases are
    the substance: each of the three required counts is asserted individually as required, and the
    numeric constraints are asserted rather than assumed.

    The strongest verification is not in the suite. The end-to-end run exercised prepare → ingest →
    approve → `done` against the real CLI, which is what caught RV-3 — a defect no schema test could
    have surfaced, because the schema is not where the flag is ignored.

    One gap, non-blocking: no test asserts that `testsPassed + testsFailed` relates sensibly to
    `testsRun`. The schema cannot express it and it may not be worth enforcing, since a suite can skip
    tests, but nothing currently stops an output claiming 5 run, 9 passed.
  </test-quality>

  <scope-check result="pass">
    The skill, the agent correction, and the tests are the task. Two edits reach outside
    `.claude/skills/qa/` and both are required by AC-4: `.claude/agents/qa.md`, whose hardcoded
    `skills: nit:implement` contradicted the new step, and the `role-routing` template in `nit:init`
    (see RV-1). The routing allowlist edit in `cli/tests/` is the bookkeeping TASK-021's test was built
    to require.

    Out-of-scope items were respected: no tests were written for the project under QA's remit, no
    coverage tooling was added, and `qa-result` was not extended. RV-2 and RV-3 were both tempting to
    fix inline and both correctly refused — one is archetype resolution, the other is supervisor
    ingest, and neither belongs in a skill task.
  </scope-check>

  <convention-guards>
    <guard description="One canonical artifact per step (ADR-0005)" result="pass">Emits output.json only.</guard>
    <guard description="Validate at write time (ADR-0003)" result="pass">Procedure ends with the CLI validator call.</guard>
    <guard description="Skills describe, the CLI transitions (ADR-0004)" result="pass">Explicitly forbids state.json, approval.json, and task.json edits.</guard>
    <guard description="Blocked contract, not a step-specific convention (TASK-018)" result="pass">Shared reason codes and detail requirements, with the fails-versus-blocked boundary stated.</guard>
    <guard description="Step skill directory matches its step id" result="pass">All five step ids resolve; asserted across six archetypes.</guard>
    <guard description="Prefix convention shared with the review step" result="pass">issues[] uses AC-N:/tests:/coverage:, matching review's comments[].</guard>
  </convention-guards>

  <findings>
    - [minor, fixed] RV-1 — AC-4 rested on a false premise. The task assumed a `qa` versus
      `qa-engineer` naming collision; `.claude/` is already consistent on `qa` across the archetype
      role, the agent file, its `name:` frontmatter, and the roles registry. The only `qa-engineer` is
      in the stale `.nit/agents/` copy that TASK-026 deletes. The real defect was semantic:
      `.claude/agents/qa.md` described QA solely as an implementer of test infrastructure and hardcoded
      `skills: nit:implement`, while `base.json` uses `qa` as the final verification step — one agent
      committed by its own frontmatter to the wrong one of its two jobs. A second, unrelated defect was
      found alongside it: `nit:init`'s role-routing template mapped the qa role to `["implement"]`, so
      a freshly scaffolded workspace would never route qa to its own skill.
    - [critical, split out] RV-2 — `$detect` is never resolved. `replacePlaceholders` preserves it as a
      literal, and `prepare` emits `"role": "$detect"` in the dispatch descriptor, which `nit:continue`
      passes as `subagent_type`. No agent answers to that name, so the implement step of `bugfix` and
      `cross-module-change` — two of six shipped archetypes — cannot be dispatched. Directly relevant
      here: the qa agent's second duty, which this task documented, is reachable *only* through
      `$detect`, so that duty is currently unreachable. Filed as TASK-028.
    - [critical, split out] RV-3 — the per-step `approval` flag is never read. `archetype.schema.json`
      defines it, `base.json` uses it deliberately (`analyze`, `implement`, `qa` false; `design`,
      `review` true), and resolution carries it through — but `ingestValid` unconditionally parks every
      step at `awaiting_approval`. So a five-step task demands five approvals rather than the two the
      archetype describes, and `bugfix`'s override, whose entire content is ungating `design`, is inert.
      Surfaced by the end-to-end run: qa is declared `approval: false` and still required an explicit
      `/nit:approve` to reach `done`. Filed as TASK-029.
    - [note] Three defects of the same shape have now appeared in this phase — rejection routing
      targeting a removed step (TASK-027), `$detect` unresolved (TASK-028), the approval flag unread
      (TASK-029). Each is a declared contract that nothing enforces or consumes. The archetype schema
      accepts fields the supervisor ignores, which is worth naming as a pattern at phase summary rather
      than treating as three coincidences.
    - [note] `.claude/agents/qa.md` is the only agent serving two steps, and the only one whose
      `skills:` frontmatter had to be removed in favour of deferring to `input.json`'s `skillList`.
      The other engineer agents still hardcode `skills: nit:implement`, which is correct only because
      they appear at exactly one step. Fragile if that changes.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `.claude/agents/qa.md` now documents both duties explicitly — verify behaviour at the qa step via
      `nit:qa`, implement testing infrastructure at the implement step via `nit:implement` — and
      instructs the agent to load whatever `skillList` names rather than assuming. The hardcoded
      `skills:` frontmatter is removed. The QA-specific guidance is split to match the two duties.
      `nit:init`'s role-routing entry is corrected to `["qa", "implement"]`. Verified: the archetype
      role, the agent `name:`, and the resolved base skill all read `qa`.
    </item>
    <item id="RV-2" result="split out">
      Filed as TASK-028 with the reproduction and three acceptance criteria, including a guard that no
      dispatch descriptor may carry a `$`-prefixed role. Not fixed here: resolution requires task
      context that `resolveArchetype` does not have, so it belongs in the supervisor's prepare path,
      not in a skill. The agent definition is left describing the intended contract, which TASK-028
      makes true.
    </item>
    <item id="RV-3" result="split out">
      Filed as TASK-029 with the reproduction and four acceptance criteria, including one specifically
      for `bugfix`, whose only override is currently a no-op. The task also names the design question
      the fix must settle: `prepare` decides whether to advance by reading `approval.json`, so ingest
      and prepare must agree on how a non-gated step is represented. Not fixed here: it changes
      transition behaviour for every task and needs its own review.
    </item>
    <verification>
      `bun test` — 130 pass, 0 fail. AC-1, AC-3, and AC-4 additionally verified end-to-end through the
      CLI, including a complete archetype run to `done`.
    </verification>
  </finding-resolution>

</review>
