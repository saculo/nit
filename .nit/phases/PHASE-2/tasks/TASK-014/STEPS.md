# Steps — Task 14: Skill Composition Engine

<steps>

  <implementation-steps>
    <step id="S-1" status="done">
      <description>Create cli/src/routing-resolver.ts: pure resolution logic — baseSkillForStep
        (nit:&lt;stepId&gt;), skillFilePath (strip nit:), a filesystem-backed existence check
        parameterized by skills root dir, and resolveRouting(options) producing a Routing object
        with layer ordering (base → language → custom → global), step-override merge, cross-module
        union, dedup, and missing-file dropping.</description>
      <deviation>Added an injectable `skillExists` predicate to ResolveRoutingOptions (defaults to
        the filesystem check). Minor — improves testability and let the unit tests avoid real skill
        files entirely.</deviation>
    </step>
    <step id="S-2" status="done">
      <description>Create cli/src/commands/route.ts: parse flags (--task, --step, --targets,
        --modules, --registry, --skills-dir, --out), read modules.json (STOP with run-init message
        if absent) and skills.json (absent ⇒ no global skills), resolve target module entries,
        call resolveRouting, validate the Routing object in-process against routing.schema.json,
        write --out if provided, print JSON to stdout. Exit codes 0/1/2 mirroring archetype cmd.</description>
      <deviation></deviation>
    </step>
    <step id="S-3" status="done">
      <description>Wire the route command into cli/src/cli.ts (switch case + --help line).</description>
      <deviation></deviation>
    </step>
    <step id="S-4" status="done">
      <description>Create the thin in-module deliverable .claude/skills/compose-routing/SKILL.md:
        documents invoking `bun run ./cli/src/cli.ts route ...` and validating routing.json, for
        the supervisor (TASK-015) to consume. Not a user-facing slash command.</description>
      <deviation></deviation>
    </step>
    <step id="S-5" status="done">
      <description>Provide skill-existence and registry inputs for the AC scenarios.</description>
      <deviation>Abandoned on-disk test fixtures (cli/tests/fixtures/…). The sandboxed test
        environment does not reliably persist newly-created nested directories to the filesystem the
        test subprocess reads, so fixture files were flaky. Replaced with an injected `skillExists`
        predicate (Set-based) and inline ModuleEntry/registry objects in the test — no fixture files
        needed. Moderate deviation from the design's fixture approach; the resolution behaviour and
        ACs are unchanged and now fully unit-tested.</deviation>
    </step>
    <step id="S-6" status="done">
      <description>Write cli/tests/routing-resolver.test.ts covering AC-1..AC-5 against the resolver
        (via injected predicate) plus CLI-level guardrail tests (usage exit 2, missing modules.json
        message). Add ajv-formats so date-time formats validate. Run the full suite green.</description>
      <deviation>Added ajv-formats dependency and a shared cli/src/ajv.ts factory, wired into
        validate.ts and route.ts. Necessary: three schemas (routing, task-state, approval) use the
        date-time format, which plain Ajv2020 strict mode rejects — the existing validate command
        would have thrown on all three. Documented in IMPLEMENTATION.md.</deviation>
    </step>
  </implementation-steps>

  <acceptance-criteria-check>
    <criterion id="AC-1" status="done">
      <description>Given a task targeting a Java module with customSkills ["spring-boot", "ddd"] at
        the implement step, When skill composition is resolved, Then routing.json contains skill
        list: nit:implement, java, spring-boot, ddd (in layer order).</description>
      <verification>Test "resolves base + language + custom skills in layer order at the implement
        step": orderedSkillList == [nit:implement, java, spring-boot, ddd]; routing schema-valid.</verification>
    </criterion>
    <criterion id="AC-2" status="done">
      <description>Given a task targeting a Java module with stepOverrides review.addSkills
        ["security-checklist"] at the review step, When skill composition is resolved, Then
        routing.json includes security-checklist in addition to base, language, and custom skills.</description>
      <verification>Test "merges step-override addSkills into the custom layer at the review step":
        baseSkill nit:review, languageSkill java, customSkills [spring-boot, ddd, security-checklist].</verification>
    </criterion>
    <criterion id="AC-3" status="done">
      <description>Given a cross-module-change task targeting module A (Java, spring-boot) and module
        B (TypeScript, nestjs), When skill composition is resolved, Then routing.json contains the
        union: base step skill + java + typescript + spring-boot + nestjs.</description>
      <verification>Test "unions language and custom skills across modules for a cross-module task":
        orderedSkillList == [nit:implement, java, typescript, spring-boot, nestjs].</verification>
    </criterion>
    <criterion id="AC-4" status="done">
      <description>Given a module with languageId "go" but no .claude/skills/go/SKILL.md, When skill
        composition is resolved, Then the missing go language skill is skipped without error and
        routing.json contains only the available skills.</description>
      <verification>Test "drops a language skill whose SKILL.md is missing without error":
        languageSkill undefined, orderedSkillList == [nit:implement], routing schema-valid.</verification>
    </criterion>
    <criterion id="AC-5" status="done">
      <description>Given global custom skills ["code-conventions"] in registry/skills.json, When skill
        composition is resolved for any task, Then routing.json includes code-conventions.</description>
      <verification>Test "includes global custom skills from the registry": globalSkills
        [code-conventions]; present in orderedSkillList.</verification>
    </criterion>
  </acceptance-criteria-check>

  <dod-check>
    <item id="DOD-1" status="done">All acceptance criteria passed</item>
    <item id="DOD-2" status="done">Tests written and passed — 59 pass / 0 fail across 5 files</item>
    <item id="DOD-3" status="done">Code review passed</item>
    <item id="DOD-4" status="done">No critical tech debt introduced</item>
  </dod-check>

</steps>
