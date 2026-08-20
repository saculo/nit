# PHASE-4 — Boundary Enforcement, ADR Automation, and Routing Introspection

<phase>

  <meta>
    <id>PHASE-4</id>
    <title>Boundary Enforcement, ADR Automation, and Routing Introspection</title>
    <milestone>The pipeline enforces module boundaries during validation, records architectural decisions without being asked, and can explain its own skill routing</milestone>
    <status>planned</status>
  </meta>

  <business-value>
    PHASE-3 made the pipeline complete and correct: every step runs, every declared contract is
    honoured. This phase makes it *opinionated about the code it produces*. Boundary enforcement turns
    the module registry from documentation into a constraint, catching architectural drift at the step
    that causes it rather than at review months later. ADR trigger automation stops significant
    decisions going unrecorded, which is the failure mode every project has and none notices until it
    needs the history. Routing introspection lets a user answer "why did this agent load these skills?"
    without reading four config files — the question that makes a composition system debuggable rather
    than magical.
  </business-value>

  <scope>
    <in-scope>
    - Migrating this repository's own .nit/ workspace to v2 artifacts, which SC-1 and SC-2 depend on (TASK-032; deferred in TASK-026 on the assumption it was cosmetic, and it is not)
    - Boundary enforcement during validation: read modules.json allowedDependencies and boundaries/dependency-rules.json, check implementation output against the rules
    - Boundary violations produce structured errors in validation.json
    - dependency-rules.json creation (allowed and forbidden cross-module dependencies)
    - Cross-module-change archetype boundary-check step enforced rather than merely present
    - ADR trigger automation: config/adr-triggers.json with structured conditions (multi-module change, new shared component, public API change, new infra capability, boundary change)
    - Specialists append adrCandidates to step output when triggers fire
    - ADR index maintained in decisions/adr-index.json, and the adr/ versus decisions/ split settled
    - nit:explain-routing command: shows the full skill composition chain for any task
    - nit:resolve-routing command: resolves and persists routing.json for a task
    - nit:skills command: lists all skills grouped by layer and module
    </in-scope>
    <out-of-scope>
    - nit:add-skill interactive creation (PHASE-5)
    - Bun CLI package distribution (PHASE-5)
    - Run logging (PHASE-5)
    - Global ~/.claude/skills/nit/ namespace separation (PHASE-5)
    - Repair/reopen flow refinement beyond what TASK-031 established (PHASE-5)
    </out-of-scope>
  </scope>

  <dependencies>
    PHASE-3 (the v1 to v2 skill migration, the deterministic pipeline, and the blocked-step contract)
  </dependencies>

  <draft-tasks>
  - Migrate this repository's own .nit/ workspace to v2 artifacts (TASK-032; must land first — nit:tasks cannot plan this phase and boundary enforcement has no module registry to enforce against without it)
  - Create dependency-rules.json format and schema
  - Implement boundary enforcement in validation: modules.json allowedDependencies plus dependency-rules.json, with violations as structured errors in validation.json
  - Enforce the cross-module-change boundary-check step against those rules
  - Create adr-triggers.json trigger conditions and integrate them into the supervisor's post-step flow
  - Build adrCandidates detection so specialists emit candidates when a trigger fires
  - Create decisions/adr-index.json management (nit:adr-list-candidates, nit:adr-write, nit:adr-approve), settling the adr/ versus decisions/ directory split
  - Build nit:explain-routing command
  - Build nit:resolve-routing command
  - Build nit:skills listing command
  </draft-tasks>

  <success-criteria>
  - SC-1 Boundary violations are detected when implementation output references a forbidden dependency
  - SC-2 Boundary violations appear as structured errors in validation.json, distinguishable from schema errors
  - SC-3 ADR triggers fire for multi-module changes and new shared components
  - SC-4 adrCandidates appear in step output when a trigger matches, without the specialist being asked
  - SC-5 nit:explain-routing displays the complete skill composition chain (base, language, custom, step-scoped, global) for a given task
  - SC-6 nit:skills lists every registered skill organised by layer and module association
  - SC-7 Every field this phase adds to a schema or archetype has a consumer proven by test (ADR-0007)
  </success-criteria>

  <risks>
  - Boundary enforcement heuristics may produce false positives on cross-module references that are legitimately allowed; a rule that cries wolf gets disabled
  - ADR trigger conditions need tuning — too sensitive creates noise, too conservative misses real decisions, and the phase has no way to measure which until it runs on real work
  - This phase's criteria were carried over from PHASE-3's original plan and were displaced once already. If they are displaced again, the reason should be recorded as a decision rather than discovered at phase summary
  </risks>

  <notes>
    **Origin.** These are the six success criteria PHASE-3 declared and never started. PHASE-3 was
    planned as the quality-gates phase; a survey at its start found four skills still reading the prose
    artifacts ADR-0005 retired, one step skill missing entirely, and nit:init scaffolding v1 artifact
    types into every new project. The migration displaced the planned scope, correctly task by task —
    a pipeline that cannot complete a task is more urgent than one that cannot lint module boundaries —
    but the displacement was never made as a decision.

    PHASE-3 is therefore re-scoped to the migration it delivered, and its milestone is judged against
    that. This phase carries the original quality-gates work, unchanged in substance and renumbered
    ahead of distribution: shipping a package before the pipeline enforces its own boundaries would put
    the wrong thing in users' hands first.

    **SC-7 is new.** ADR-0007 was accepted at the end of PHASE-3 after four defects turned out to share
    one root cause — a declared contract nothing consumes. This phase adds `dependency-rules.json`,
    `adr-triggers` consumption, and an ADR index, each of which declares new fields. The criterion
    exists so the ADR is applied while the fields are being written rather than retrofitted after the
    next phase summary finds the same pattern a fifth time.
  </notes>

</phase>
