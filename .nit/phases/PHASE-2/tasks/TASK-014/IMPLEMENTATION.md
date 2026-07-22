# Implementation — Task 14: Skill Composition Engine

<implementation>

  <summary>
    The skill composition engine resolves the layered skill list (PRD Section 9) for a task at a
    given step and writes a validated routing.json. Following the existing archetype-resolver
    precedent, the deterministic logic lives in the CLI (cli/src/routing-resolver.ts) as pure,
    unit-tested functions, with a thin `route` command (cli/src/commands/route.ts) that reads the
    module and skills registries, resolves, validates, and persists routing.json. The in-module
    deliverable is a prose skill (.claude/skills/compose-routing/SKILL.md) documenting how the
    supervisor invokes the engine.

    resolveRouting derives the base step skill by convention (`nit:<stepId>`, KD-1), populates the
    language skill from the primary module's languageId, unions custom skills across all target
    modules (folding secondary-module languages into the custom layer for cross-module tasks, KD-5),
    appends the current step's stepOverrides addSkills within the custom layer (KD-4), and adds
    global custom skills from the registry. Any language/custom/global skill whose SKILL.md is
    absent is dropped without error via an injectable existence predicate (KD-2); the base step
    skill is always retained. orderedSkillList flattens a Routing into the ordered list a consumer
    passes to an agent. Every write is validated against routing.schema.json (KD-6).
  </summary>

  <files-changed>
    <file action="created">cli/src/routing-resolver.ts</file>
    <file action="created">cli/src/commands/route.ts</file>
    <file action="created">cli/src/ajv.ts</file>
    <file action="created">cli/tests/routing-resolver.test.ts</file>
    <file action="created">.claude/skills/compose-routing/SKILL.md</file>
    <file action="modified">cli/src/cli.ts</file>
    <file action="modified">cli/src/commands/validate.ts</file>
    <file action="modified">cli/package.json</file>
    <file action="modified">cli/bun.lock</file>
  </files-changed>

  <deviations>
    The approved DESIGN.md described the engine as a prose procedure in the `.claude/skills` module.
    During implementation the sibling archetype-inheritance resolver (cli/src/archetype-resolver.ts +
    tests) established that deterministic pipeline logic in this project is implemented as tested CLI
    code, not prose. To make AC-1..AC-5 automatically verifiable and satisfy DoD "tests written and
    passed", the deterministic resolution was implemented as a CLI module with a thin skill wrapper
    rather than pure prose. This is a moderate deviation in *medium*, not in behaviour: the layering
    model, all key decisions (KD-1..KD-6), and the TO-1 trade-off (fold secondary languages into
    customSkills) are realised exactly as designed. The in-module `.claude/skills/compose-routing`
    deliverable is still present as the supervisor-facing entry point.

    Two supporting changes outside the task's primary module:
    - cli/src/ajv.ts + ajv-formats dependency, wired into validate.ts and route.ts. Three schemas
      (routing, task-state, approval) use the `date-time` format; plain Ajv2020 strict mode throws
      "unknown format" on compile, so the existing `validate` command would already fail on those
      three schemas. This is a necessary fix for routing.json validation (KD-6) and repairs a latent
      defect for the other two schemas.
    - Test skill-existence is supplied by an injected `skillExists` predicate rather than on-disk
      fixture files, because the sandboxed test environment does not reliably persist newly-created
      nested directories to the filesystem the test subprocess reads.
  </deviations>

  <tech-debt>
    - routing.schema.json models a single `languageSkill` string, so cross-module tasks represent
      secondary-module languages inside `customSkills` (TO-1). A first-class `languageSkills` array
      (or an ordered `skills` list) owned by TASK-001's schema set would be cleaner; deferred.
    - The `route` command's happy path (reading real modules.json/skills.json and writing
      routing.json) is exercised in-process via resolveRouting + in-process schema validation rather
      than an end-to-end spawn test, due to the fixture-persistence limitation above. The command's
      guardrails (usage, missing-registry) are covered by spawn tests.
  </tech-debt>

  <self-check>
    - AC-1: pass — orderedSkillList == [nit:implement, java, spring-boot, ddd] and routing is schema-valid.
    - AC-2: pass — review step yields customSkills [spring-boot, ddd, security-checklist] over base+language.
    - AC-3: pass — cross-module union == [nit:implement, java, typescript, spring-boot, nestjs].
    - AC-4: pass — missing `go` language skill dropped; orderedSkillList == [nit:implement]; schema-valid.
    - AC-5: pass — global skill code-conventions present in routing.globalSkills / ordered list.
    - DoD: DOD-1 done, DOD-2 done (59 pass / 0 fail), DOD-3 pending (reviewer), DOD-4 done.
  </self-check>

</implementation>
