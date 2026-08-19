# PHASE-3 — The v1 to v2 Skill Migration

<phase>

  <meta>
    <id>PHASE-3</id>
    <title>The v1 to v2 Skill Migration</title>
    <milestone>Every skill runs on the v2 JSON contract, the full 5-step pipeline completes end-to-end, and no declared field in the supervisor's contracts goes unread</milestone>
    <status>done</status>
  </meta>

  <business-value>
    The pipeline becomes usable. Before this phase four skills still read the prose artifacts ADR-0005
    retired, one step skill did not exist, and nit:init scaffolded v1 artifact types into every new
    project — so a task could not complete its own archetype and every new adopter inherited the old
    contract. After it, every skill speaks JSON, all five step skills resolve and dispatch, a
    specialist that cannot proceed can say so, and the supervisor honours the contracts its schemas
    declare rather than silently ignoring three of them. The quality gates this phase originally
    planned are real work that still matters; they are PHASE-4, because a pipeline that cannot finish
    a task cannot usefully enforce anything about one.
  </business-value>

  <scope>
    <in-scope>
    - Rewrite nit:review for JSON step output (review-result embedded in step-output via $defs/$ref)
    - Dedicated nit:qa step skill producing qa-result as JSON step output
    - QA step integrated into archetype step sequences (already defined in base.json from PHASE-2)
    - Rewrite nit:phase-summary for JSON output with PLR generation
    - Blocked-step escalation contract: a schema-valid way for a specialist to report it cannot proceed (needs splitting, contradictory input, unsatisfiable criterion), with supervisor ingest handling (TASK-018)
    - Complete the v1 to v2 skill migration, so no skill still reads or writes the prose artifacts ADR-0005 retired: nit:status on v2 artifacts (TASK-024), nit:orchestrate on the supervisor rather than DESIGN.md type routing (TASK-025), and nit:init scaffolding only artifact types the v2 pipeline writes (TASK-026)
    - Remove the machinery the migration orphans: the v1 argument-validation hooks superseded by supervisor dispatch, and the duplicated .nit/skills/ and .nit/hooks/ trees stale since PHASE-1 (TASK-026, settling design Q-4)
    </in-scope>
    <out-of-scope>
    - Boundary enforcement, ADR trigger automation, and routing introspection commands — planned here, displaced by the migration, and moved to PHASE-4 as a decision rather than a drift
    - nit:add-skill interactive creation (PHASE-5)
    - Bun CLI package distribution (PHASE-5)
    - Run logging (PHASE-5)
    - Global ~/.claude/skills/nit/ namespace separation (PHASE-5)
    - Role changes beyond what PHASE-2 established (PHASE-5)
    - Migrating this repository's own v1 .nit/ workspace (deferred in TASK-026 and still open)
    </out-of-scope>
  </scope>

  <dependencies>
    PHASE-2 (deterministic supervisor, archetype system, schema validation, core pipeline steps)
  </dependencies>

  <draft-tasks>
  - Add the blocked-step escalation contract to step-output and supervisor ingest (TASK-018; must land before the review/qa rewrites)
  - Rewrite nit:review skill for JSON step output with review-result schema (TASK-021; must emit the TASK-018 blocked result when it cannot complete its step, rather than a skill-specific convention)
  - Create nit:qa step skill with qa-result schema (TASK-022; same blocked-contract conformance requirement)
  - Rewrite nit:phase-summary for JSON output with PLR generation (TASK-023; aggregates the review and qa results above)
  - Rewrite nit:status for v2 artifacts — state.json, task.json, phase.json — and the v2 command set (TASK-024)
  - Rewrite nit:orchestrate to drive the supervisor rather than dispatch steps itself (TASK-025; sequence after the step skills it drives)
  - Stop nit:init scaffolding v1 artifact types, and remove the orphaned hooks and duplicated .nit/ trees (TASK-026; sequence last, once the final artifact list is known)
  - Fix rejection routing that targets a removed step, and validate the invariant at archetype resolution (TASK-027; reachable now that the review step works)
  - Resolve $detect to a concrete engineer role at dispatch (TASK-028; bugfix and cross-module-change cannot dispatch their implement step today)
  - Honour the per-step approval flag, which the supervisor never reads, so every step is gated regardless of the archetype (TASK-029)
  - Give phase success criteria a home in phase.json; they are discussed at planning and then discarded, leaving milestone verification nothing to verify against (TASK-030)
  - Thread rework context into the reopened step so a rejection's comment reaches the specialist; nit:reject promises it and nothing delivers it (TASK-031)
  </draft-tasks>

  <success-criteria>
  - SC-1 Full 5-step pipeline (analyze -> design -> implement -> review -> qa) completes end-to-end for a task
  - SC-2 nit:review produces a valid JSON review-result within step-output
  - SC-3 nit:qa produces a valid JSON qa-result within step-output
  - SC-4 nit:phase-summary produces structured JSON output and a Phase Learning Record
  - SC-5 A blocked step output validates against step-output.schema.json, transitions the task to `blocked` on ingest, leaves reopenCount unchanged, and writes no repair input.json; a step directory with no output.json takes the same path instead of throwing
  - SC-6 Every step skill — analyze, design, implement, review, qa — reports an unworkable step through the blocked contract rather than a skill-specific convention
  - SC-7 No skill reads or writes DESIGN.md, STEPS.md, IMPLEMENTATION.md, REVIEW.md, or CLARIFICATIONS.md except to state that v2 does not produce them
  - SC-8 nit:status reports a v2 workspace accurately, distinguishing awaiting_approval, blocked, and escalated, and suggests only v2 commands
  - SC-9 A freshly initialised workspace declares only artifact types the v2 pipeline writes, and every generated file validates against its schema
  - SC-10 No orphaned hook or duplicated skill tree remains; design Q-4 is settled and recorded
  - SC-11 Every field the supervisor's contracts declare is honoured: rejection routing targets a step that exists, $detect resolves to a real agent, the per-step approval flag is read, and phase success criteria have a producer
  - SC-12 A rejection's comment reaches the specialist reopened to act on it, and repair and rework remain distinguishable causes
  </success-criteria>

  <scope-change date="2026-08-19">
    PHASE-3 was planned as the quality-gates phase — review, QA, boundary enforcement, ADR triggers,
    routing introspection. A survey at its start found four skills still reading the prose artifacts
    ADR-0005 retired, one step skill missing entirely, and nit:init scaffolding v1 artifact types into
    every new project. The migration displaced the planned scope, correctly task by task, but was never
    made as a decision — the first phase summary reported the milestone unreached with six of sixteen
    criteria unstarted.

    Re-scoped here, deliberately: PHASE-3 is the migration phase, and boundary enforcement, ADR trigger
    automation, and the three routing introspection commands move to PHASE-4 unchanged in substance.
    The former PHASE-4 (Skill Creation, Distribution, and Polish) becomes PHASE-5, because a package
    should not ship before the pipeline it packages can enforce its own boundaries.

    **Two criteria here are new, and were written after the work they describe.** SC-11 and SC-12 cover
    TASK-027 through TASK-031 — defects found by review rather than planned, and delivered before any
    criterion named them. Adding criteria to match completed work is close to the thing nit:phase-summary
    forbids: verifying a phase against a bar set after the fact. The distinction claimed here is that
    re-scoping a plan is a deliberate act taken with the user's agreement and recorded as one, whereas
    inventing criteria at summary time to declare a milestone reached is grading your own exam. That
    distinction is real but thin, so it is recorded rather than assumed: anyone reading a future
    "12 of 12 met" for this phase should know two of the twelve were written last.
  </scope-change>

  <risks>
  - Boundary enforcement heuristics may produce false positives on cross-module references that are actually allowed
  - ADR trigger conditions need tuning; too sensitive creates noise, too conservative misses real decisions
  - Review and QA skill quality depends heavily on the skill instructions; may require iteration based on real usage
  </risks>

</phase>
