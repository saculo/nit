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
  - Rewrite nit:review skill for JSON step output with review-result schema
  - Create nit:qa step skill with qa-result schema
  - Implement boundary enforcement in validation hooks (modules.json allowedDependencies + dependency-rules.json)
  - Create dependency-rules.json format and schema
  - Create adr-triggers.json with trigger conditions and integrate into supervisor post-step flow
  - Build adrCandidates detection logic in specialist step outputs
  - Create decisions/adr-index.json management (nit:adr-list-candidates, nit:adr-write, nit:adr-approve)
  - Build nit:explain-routing command
  - Build nit:resolve-routing command
  - Build nit:skills listing command
  - Rewrite nit:phase-summary for JSON output
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
  </success-criteria>

  <risks>
  - Boundary enforcement heuristics may produce false positives on cross-module references that are actually allowed
  - ADR trigger conditions need tuning; too sensitive creates noise, too conservative misses real decisions
  - Review and QA skill quality depends heavily on the skill instructions; may require iteration based on real usage
  </risks>

</phase>
