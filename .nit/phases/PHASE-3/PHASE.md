# PHASE-3 — Review, QA, and Boundary Enforcement

<phase>

  <meta>
    <id>PHASE-3</id>
    <title>Review, QA, and Boundary Enforcement</title>
    <milestone>The full 5-step pipeline (analyze, design, implement, review, qa) works end-to-end with module boundary enforcement, ADR trigger automation, and routing introspection commands</milestone>
    <status>draft</status>
  </meta>

  <business-value>
    The pipeline gains its quality gates. Review and QA steps close the feedback loop — review catches design/implementation issues before they leave the pipeline, QA validates behavior against acceptance criteria. Boundary enforcement prevents cross-module dependency violations during implementation, catching architectural drift early. ADR triggers automatically detect when architectural decisions should be recorded, reducing the chance of undocumented decisions. Routing introspection commands (explain-routing, resolve-routing) let users debug and understand skill composition without reading config files. Phase summary produces structured JSON output for phase retrospectives.
  </business-value>

  <scope>
    <in-scope>
    - Rewrite nit:review for JSON step output (review-result embedded in step-output via $defs/$ref)
    - Dedicated nit:qa step skill producing qa-result as JSON step output
    - QA step integrated into archetype step sequences (already defined in base.json from PHASE-2)
    - Boundary enforcement during validation: read modules.json allowedDependencies and boundaries/dependency-rules.json, check implementation output against rules
    - Boundary violations produce structured errors in validation.json
    - dependency-rules.json creation (allowed and forbidden cross-module dependencies)
    - ADR trigger automation: config/adr-triggers.json with structured conditions (multi-module change, new shared component, public API change, new infra capability, boundary change)
    - Specialists append adrCandidates to step output when triggers fire
    - ADR index maintained in decisions/adr-index.json
    - nit:explain-routing command: shows full skill composition chain for any task
    - nit:resolve-routing command: resolves and persists routing.json for a task
    - nit:skills command: lists all skills grouped by layer and module
    - Rewrite nit:phase-summary for JSON output with PLR generation
    - Cross-module-change archetype boundary-check step (already defined in PHASE-2 archetype, now enforced)
    - Blocked-step escalation contract: a schema-valid way for a specialist to report it cannot proceed (needs splitting, contradictory input, unsatisfiable criterion), with supervisor ingest handling (TASK-018)
    - Complete the v1 to v2 skill migration, so no skill still reads or writes the prose artifacts ADR-0005 retired: nit:status on v2 artifacts (TASK-024), nit:orchestrate on the supervisor rather than DESIGN.md type routing (TASK-025), and nit:init scaffolding only artifact types the v2 pipeline writes (TASK-026)
    - Remove the machinery the migration orphans: the v1 argument-validation hooks superseded by supervisor dispatch, and the duplicated .nit/skills/ and .nit/hooks/ trees stale since PHASE-1 (TASK-026, settling design Q-4)
    </in-scope>
    <out-of-scope>
    - nit:add-skill interactive creation (PHASE-4)
    - Bun CLI package distribution (PHASE-4)
    - Run logging (PHASE-4)
    - Global ~/.claude/skills/nit/ namespace separation (PHASE-4)
    - Role changes beyond what PHASE-2 established (PHASE-4)
    - Repair/reopen flow refinement (PHASE-4)
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
  - Implement boundary enforcement in validation hooks (modules.json allowedDependencies + dependency-rules.json)
  - Create dependency-rules.json format and schema
  - Create adr-triggers.json with trigger conditions and integrate into supervisor post-step flow
  - Build adrCandidates detection logic in specialist step outputs
  - Create decisions/adr-index.json management (nit:adr-list-candidates, nit:adr-write, nit:adr-approve)
  - Build nit:explain-routing command
  - Build nit:resolve-routing command
  - Build nit:skills listing command
  </draft-tasks>

  <success-criteria>
  - Full 5-step pipeline (analyze -> design -> implement -> review -> qa) completes end-to-end for a task
  - nit:review produces valid JSON review-result within step-output
  - nit:qa produces valid JSON qa-result within step-output
  - Boundary violations are detected when implementation references forbidden dependencies
  - Boundary violations appear as structured errors in validation.json
  - ADR triggers fire correctly for multi-module changes and new shared components
  - adrCandidates appear in step output when triggers match
  - nit:explain-routing displays the complete skill composition chain (base + language + custom + step-scoped + global) for a given task
  - nit:skills lists all registered skills organized by layer and module association
  - nit:phase-summary produces structured JSON output and PLR
  - A blocked step output validates against step-output.schema.json, transitions the task to `blocked` on ingest, leaves reopenCount unchanged, and writes no repair input.json; a step directory with no output.json takes the same path instead of throwing
  - Every step skill in the phase — analyze, design, implement, review, qa — reports an unworkable step through the blocked contract rather than a skill-specific convention
  - No skill reads or writes DESIGN.md, STEPS.md, IMPLEMENTATION.md, REVIEW.md, or CLARIFICATIONS.md except to state that v2 does not produce them
  - nit:status reports a v2 workspace accurately, distinguishing awaiting_approval, blocked, and escalated, and suggests only v2 commands
  - A freshly initialised workspace declares only artifact types the v2 pipeline writes, and every generated file validates against its schema
  - No orphaned hook or duplicated skill tree remains; design Q-4 is settled and recorded
  </success-criteria>

  <risks>
  - Boundary enforcement heuristics may produce false positives on cross-module references that are actually allowed
  - ADR trigger conditions need tuning; too sensitive creates noise, too conservative misses real decisions
  - Review and QA skill quality depends heavily on the skill instructions; may require iteration based on real usage
  </risks>

</phase>
