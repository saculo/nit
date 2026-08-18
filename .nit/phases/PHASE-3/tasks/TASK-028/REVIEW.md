# Review — Task 28: Resolve $detect to a Concrete Engineer Role at Dispatch

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-19) at first pass, after two findings raised during review were fixed. Both were
    gaps in this task's own coverage rather than defects in the resolution itself.
  </verdict-history>

  <input-validation-deviation>
    The standing deviations are unchanged: v1 prose artifacts for this task's own records, and
    implementation and review in one session. CodeRabbit has now missed five consecutive pull requests
    ("Review skipped: manual review required for this OSS repository"), so no independent reader has
    seen any code in this phase.

    This is the first task in the phase that is a code change rather than a skill rewrite, which makes
    the missing external review more consequential: a defect here is a runtime failure in the
    supervisor, not a misleading instruction in a document.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `resolveStepRole` resolves `$detect` from `task.json.type` at dispatch, and refuses to pass
      through any `$`-prefixed role. Verified end-to-end through the real CLI, not just in tests: a
      `devops` bugfix task produces `"role": "infra-engineer"` in both the dispatch descriptor and the
      written `input.json`. A test asserts neither artifact carries a placeholder.
    </criterion>
    <criterion id="AC-2" result="pass">
      All four mappings asserted — backend to backend-engineer, frontend to frontend-engineer, devops
      to infra-engineer, qa to qa — each through `prepare`, not just through the pure function. A
      further test asserts every mapped role has a definition in `.claude/agents/`, so the mapping
      cannot drift from the agents that actually exist.
      Passing on both archetypes only after RV-1: the automated tests covered `bugfix` alone.
    </criterion>
    <criterion id="AC-3" result="pass">
      An unmappable type fails with the type, the step, and the known set named:
      `Cannot resolve $detect at step "implement": task type "mobile" has no engineer role. Known task
      types: backend, frontend, devops, qa.` — exit 1 through the CLI. A missing `task.json` fails
      distinctly, saying the archetype defers the engineer to the task so the task must declare one.
      Two separate failure modes with two separate messages is the right granularity; a single generic
      error would have made the missing-file case look like a mapping problem.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All three acceptance criteria verified, AC-1 and AC-3 through the CLI.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 202 pass, 0 fail (12 added). Reproduced by the reviewer. The reopen-path test was
      verified by reverting `ingest`'s resolution and confirming it fails, so the third site is
      genuinely pinned rather than incidentally green.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 and RV-2 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The placement decision is correct and load-bearing. `resolveArchetype` takes only an archetype name
    and has no task context, which is exactly why `replacePlaceholders` preserves `$detect` — that was
    never the bug. The bug was that nothing downstream finished the job. Resolving at `prepare`, where
    `task.json` is reachable, is the only place it can happen, and the code says so in a comment rather
    than leaving the next reader to rediscover it.

    ADR-0004 is respected: the mapping is tested CLI code, not prose an agent interprets.

    The decision to keep the type-to-role mapping in the CLI rather than in
    `.nit/registry/task-types.json` is right for a non-obvious reason worth recording. That registry's
    ids are archetype names — `backend-feature`, `infra-change` — not the `task.json` `type` enum of
    `backend`, `frontend`, `devops`, `qa`. Despite its name it is an archetype registry, so putting a
    type-to-role map there would have keyed it on the wrong vocabulary. The four types are fixed by
    `task.schema.json` and the four agents by `.claude/agents/`; this is nit's own model, not project
    configuration.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. `resolveStepRole` reads `task.json` and maps
    through a frozen allowlist, so an arbitrary `type` value cannot become an arbitrary
    `subagent_type` — it either matches one of four known roles or throws. That is the right shape for
    a value that flows into agent dispatch, and it is stronger than the previous behaviour, which
    passed an unvalidated placeholder straight through.
  </security-check>

  <test-quality result="pass">
    Twelve tests, and the valuable ones are the failure cases and the reopen path.

    The reopen test is the one that matters. `prepare` and `dryRun` are the obvious sites; `ingest`
    rebuilds `input.json` on the repair path and is the one that gets forgotten — it was forgotten in
    TASK-017, where the same omission dropped `priorOutputs` on reopen and shipped as RW-1. Recognising
    the shape and covering all three the first time is the correct response to that history, and the
    test was verified by reverting `ingest`'s resolution to confirm it fails rather than assuming it.

    A grep confirmed both consumers of `step.role` — `buildStepInput` and the dispatch descriptor —
    sit downstream of resolution, so there is no fourth site.

    One gap, non-blocking: nothing asserts that `nit archetype <name>` still shows `$detect` in its
    output. That is correct behaviour, since the archetype view genuinely has no task context, but a
    reader running the command sees a placeholder and may reasonably think the fix did not land. Worth
    a line in that command's help rather than a test.
  </test-quality>

  <scope-check result="pass">
    The resolver, its wiring at three sites, and the tests. Two edits reach further and both are
    consequences of the fix rather than additions to it: `nit:orchestrate`'s stated limitation is
    removed because it is now false, and `nit:continue` gains the guarantee (RV-2).

    Out-of-scope respected: the placeholder syntax is unchanged, no type is inferred from the diff or
    the module, and no new archetypes were added.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic logic as tested CLI code (ADR-0004)" result="pass">Mapping and resolution are code with tests; skills consume the resolved role.</guard>
    <guard description="prepare, dryRun and ingest must not diverge" result="pass">All three resolve; the reopen case is pinned by a test verified to fail without it.</guard>
    <guard description="Fail loudly rather than emit an unusable value" result="pass">Two distinct errors, each naming the type or the missing file, plus the step.</guard>
    <guard description="Mapped roles exist as agents" result="pass">Asserted against .claude/agents/ on disk.</guard>
    <guard description="No stale limitation left in a skill" result="pass">nit:orchestrate's claim removed and its test inverted to assert the removal.</guard>
  </convention-guards>

  <findings>
    - [minor, fixed] RV-1 — the task scope says "cover the two archetypes that use it", and the
      automated tests covered `bugfix` only. `cross-module-change` was verified manually during
      implementation but nothing pinned it. The code path is role-based rather than archetype-based so
      the risk was low, but a criterion that names two archetypes should be covered by tests naming
      two archetypes; manual verification does not survive the session.
    - [minor, fixed] RV-2 — the guarantee existed in code but not where its consumer reads it.
      `nit:continue` instructs the caller to dispatch with `subagent_type` = the descriptor's `role`,
      which was silently false before this task and is now guaranteed. A reader of that skill had no
      way to know the guarantee exists or that an unresolvable role fails the command rather than
      reaching them.
    - [note] `nit archetype <name>` still prints `"role": "$detect"` for `bugfix` and
      `cross-module-change`. That is correct — archetype resolution has no task context, which is the
      whole reason the placeholder survives it — but it reads as though the fix did not land. The
      distinction between the archetype view and the dispatch view is real and undocumented in that
      command.
    - [note] The mapping is `Object.freeze`n and exported, so a future caller can read it but not
      mutate it. That matters more than it looks: it flows into agent dispatch, and a mutable exported
      map is a way for one caller to change another's dispatch target.
    - [note] With `$detect` resolved, `/nit:orchestrate` now declares two limitations rather than
      three. The remaining two are TASK-029 (every step gates regardless of the archetype flag) and
      TASK-027 (architecture-decision cannot be rejected at review). Both are still true; both were
      re-checked against the code during this review.
    - [note] This closes the second of the four "declared contract nothing consumes" defects the phase
      surfaced. TASK-027 and TASK-029 remain, plus TASK-030's inverse. The pattern is still worth an
      ADR at phase summary rather than four independent fixes.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      Added a `cross-module-change` case asserting the implement step resolves `frontend-engineer`
      through `prepare`, with the archetype's own six-step order rather than bugfix's four. The test
      helper now takes a `stepOrder` so both archetypes are exercised against their real sequences
      instead of a shared approximation.
    </item>
    <item id="RV-2" result="fixed">
      `nit:continue` now states that the descriptor's `role` is always a concrete agent with a
      definition in `.claude/agents/`, explains that `$engineer` resolves at archetype resolution and
      `$detect` at dispatch, and says an unresolvable role fails the command rather than reaching the
      caller.
    </item>
    <verification>
      `bun test` — 202 pass, 0 fail after both fixes.
    </verification>
  </finding-resolution>

</review>
