# Review — Task 14: Skill Composition Engine

<review>

  <verdict>approved</verdict>

  <pr-url>https://github.com/saculo/nit/pull/17</pr-url>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      resolveRouting derives baseSkill by convention (`nit:${step}`) and, for a Java module with
      customSkills ["spring-boot","ddd"] at the implement step, produces languageSkill "java" and
      customSkills ["spring-boot","ddd"]. orderedSkillList == [nit:implement, java, spring-boot, ddd]
      — verified by the "resolves base + language + custom skills in layer order" test, which also
      asserts the result is schema-valid.
    </criterion>
    <criterion id="AC-2" result="pass">
      stepOverrides[review].addSkills are merged within the custom layer after the module's own
      custom skills (routing-resolver.ts:128-130). At the review step the result is baseSkill
      nit:review, languageSkill java, customSkills ["spring-boot","ddd","security-checklist"] —
      verified by the review-step test asserting security-checklist is included alongside base,
      language, and module custom skills.
    </criterion>
    <criterion id="AC-3" result="pass">
      For a cross-module task (A: java/spring-boot, B: typescript/nestjs) the primary language fills
      languageSkill and the secondary language is folded into customSkills (KD-5 / TO-1), custom
      skills unioned. orderedSkillList == [nit:implement, java, typescript, spring-boot, nestjs] —
      exactly the required union, verified by the cross-module test.
    </criterion>
    <criterion id="AC-4" result="pass">
      A `go` module whose skill is absent yields languageSkill undefined via the existence predicate
      (routing-resolver.ts:116); base skill is retained. orderedSkillList == [nit:implement] and the
      routing is schema-valid — verified by the "drops a language skill whose SKILL.md is missing"
      test. Missing custom/global skills are likewise dropped (separate test).
    </criterion>
    <criterion id="AC-5" result="pass">
      globalCustomSkills[].id from the registry are added as globalSkills after existence filtering
      (routing-resolver.ts:134-136). The registry test asserts globalSkills == ["code-conventions"]
      and that it appears in the ordered list.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All five acceptance criteria pass.</item>
    <item id="DOD-2" result="pass">Test suite green: 59 pass / 0 fail (179 assertions). Every AC maps
      to at least one test with behavioural assertions (exact ordered lists, field contents, schema
      validity), not just "no throw". Command guardrails (usage exit 2, missing-registry exit 1) are
      covered by spawn tests.</item>
    <item id="DOD-3" result="pass">No critical tech debt. The two declared debts (single-languageSkill
      schema shape per TO-1; command happy-path verified in-process rather than via spawn) are
      non-critical and documented in IMPLEMENTATION.md.</item>
  </dod-check>

  <architecture-conformance result="pass">
    All six key decisions are realised: convention-derived base skill (KD-1), name→path stripping and
    graceful missing-file dropping (KD-2), per-task current-step routing.json (KD-3), layer ordering
    with step overrides inside Layer 3 (KD-4), cross-module union with secondary languages folded
    into customSkills (KD-5, TO-1 OPT-1), and validate-at-write via the routing schema (KD-6).

    Two deviations, both declared and sound:
    (a) Medium — the engine was implemented as tested CLI code (routing-resolver.ts + route command)
    with a thin nit:compose-routing skill wrapper, rather than the pure-prose procedure in DESIGN.md.
    Justified by the existing archetype-resolver precedent (deterministic pipeline logic in this repo
    is CLI code) and the DoD requirement for meaningful automated tests. Behaviour, KDs, and TO-1 are
    unchanged, and the in-module deliverable is still present. Acceptable.
    (b) Minor — an injected `skillExists` predicate (defaulting to the fs check) replaces on-disk test
    fixtures, which were unreliable in the sandboxed environment. Improves testability. Acceptable.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. File paths come from CLI flags and are used
    only for local reads/writes (Bun.file / Bun.write) in a developer tool; no shell interpolation.
    JSON parse failures and missing files are handled and reported without leaking sensitive data.
  </security-check>

  <test-quality result="pass">
    AC-to-test mapping is complete and each assertion checks concrete behaviour (exact ordered skill
    lists, specific field values, schema validity). Edge cases beyond the ACs are also covered:
    empty-modules throw, dedupe of a shared custom skill across modules, and dropping of missing
    custom/global skills. The route command's guardrail paths are exercised end-to-end via spawn.
  </test-quality>

  <scope-check result="pass">
    The task module is `.claude/skills`; the implementation also adds/modifies `cli/` (resolver,
    route command, shared ajv factory, validate wiring, ajv-formats dependency). These are necessary
    supporting changes, not feature creep — consistent with the TASK-013 precedent where the CLI is
    the enforcement layer for skills. The in-module deliverable (compose-routing/SKILL.md) is the
    primary artifact. No unrelated refactoring; the ajv-formats change additionally repairs a latent
    validation defect for the routing/task-state/approval schemas.
  </scope-check>

  <convention-guards>
    <guard description="Deterministic pipeline logic implemented as tested CLI code (matches archetype-resolver)" result="pass">routing-resolver.ts mirrors archetype-resolver.ts structure and its command/test layout.</guard>
    <guard description="Every generated JSON validated at write time (ADR-0003)" result="pass">route command validates the Routing object against routing.schema.json before writing; the skill documents a second validate call.</guard>
    <guard description="Registry absence fails with an actionable message, not a raw file-not-found" result="pass">Missing modules.json exits 1 with a "run /nit:init" hint; missing skills.json degrades to no global skills.</guard>
    <guard description="Exit-code convention 0/1/2 consistent with existing commands" result="pass">route mirrors the archetype/validate commands (2 usage, 1 resolution error, 0 success).</guard>
  </convention-guards>

  <findings>
    - [suggestion] routing-resolver.ts:122-123 — secondary-module languages are deduped only within
      customSkills, not against the primary languageSkill. A cross-module task with two modules of the
      same language would list that language both as languageSkill and inside customSkills, producing a
      duplicate in orderedSkillList. Harmless (idempotent skill load) and not covered by any AC, but
      deduping secondary languages/custom skills against the resolved languageSkill would be cleaner.
    - [note] `flag()` in route.ts consumes the next token unconditionally, so a flag value beginning
      with `--` would be misparsed. Acceptable for an internal command with controlled inputs.
    - [note] The route command's full happy path (real modules.json → routing.json on disk) is verified
      in-process rather than via spawn due to the environment's fixture-persistence limitation; the
      resolution logic and schema validity are fully covered in-process.
  </findings>

</review>
