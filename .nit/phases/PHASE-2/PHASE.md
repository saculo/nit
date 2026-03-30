# PHASE-2 — Deterministic Supervisor and Core Pipeline

<phase>

  <meta>
    <id>PHASE-2</id>
    <title>Deterministic Supervisor and Core Pipeline</title>
    <milestone>A task can be created, routed through archetype-driven steps (analyze, design, implement), with JSON state tracking, schema validation, and layered skill composition — all driven by a deterministic supervisor</milestone>
    <status>draft</status>
  </meta>

  <business-value>
    The nit workflow transitions from prose-driven orchestration to data-driven orchestration. A user can run `nit:init` to scaffold the new v2 directory structure, define modules, and then use `nit:continue` to advance tasks through archetype-defined steps. Each step produces validated JSON artifacts, state is explicitly tracked, and skill composition is resolved from module configuration. `nit:continue --dry-run` lets users inspect what would happen before dispatching. This phase delivers the foundational loop: create task, run supervisor, specialist executes step, validate output, approve/reject, advance.
  </business-value>

  <scope>
    <in-scope>
    - Config files: workspace.json, supervisor.json (with maxReopenCount=3), validation.json, role-routing.json
    - Registry files: task-types.json, roles.json (7 roles), skills.json, artifact-types.json
    - JSON Schemas for all ~20 artifact types inside CLI package (validated via check-jsonschema or ajv-cli, not jq alone per R-2)
    - Archetype definitions: base.json (abstract) + 6 concrete archetypes with single-level inheritance (per R-4) — inside CLI package
    - Archetype inheritance resolver (load parent, merge overrides, replace $engineer placeholder, flatten)
    - Rewrite nit:init for v2 directory layout (.nit/ = ONLY project state, schemas/archetypes/hooks inside CLI package)
    - Module registration: manual in greenfield (per U-4), auto-populated modules.json in brownfield
    - Language auto-detection during brownfield init (writes languageId to modules.json, generates .claude/skills/<language>/SKILL.md)
    - Auto-generated language skills are minimal stubs; user enhances later (per R-6)
    - PRD ingestion: nit:clarify stays interactive + produces summary.json and glossary.json (per U-5), source.md copy
    - Rewrite nit:phases for JSON output (phase.json), keeping interactive flow (per U-10)
    - Rewrite nit:tasks for JSON output (task.json with targetModule field per U-2), keeping interactive flow (per U-10)
    - Analyst proposes archetype during analyze step (per U-11)
    - Deterministic supervisor (nit:continue): reads state.json + archetype, resolves next step, builds input.json, dispatches agent via prompt (per U-1), validates output.json, writes approval.json
    - nit:continue --dry-run: shows resolved archetype, skill composition, step input without dispatch
    - Skill composition engine: Layer 1 (base step skill) + Layer 2 (language skill) + Layer 3 (custom skills), with step overrides and global custom skills
    - Cross-module tasks get union of all module skills (per U-3)
    - Step numbering based on resolved archetype position (per U-6)
    - nit:approve and nit:reject commands with approval.json tracking
    - Repair/reopen flow: validation failure sets repairRequired=true, reopens step with error context; maxReopenCount=3 then escalate to user (per U-7)
    - Rejection routing per archetype definition
    - Validation via CLI (`npx nit validate`) — schemas + hooks inside CLI package as hard guardrails (per R-2)
    - Embedded types (analysis-result, design-result, etc.) validated via step-output.schema.json $defs/$ref (per U-8)
    - Rewrite nit:design for JSON step output
    - Rewrite nit:implement for JSON state tracking
    - Rewrite nit:status for JSON state reading
    - Support both bunx and npx for any tooling (per R-5)
    - nitVersion field in workspace.json for compatibility checking (per R-3)
    - Agent definitions for all 7 roles (analyst, architect, backend-engineer, frontend-engineer, infra-engineer, reviewer, qa)
    - CLI-only support; Claude.ai deferred (per U-9)
    </in-scope>
    <out-of-scope>
    - nit:review rewrite (PHASE-3)
    - Dedicated QA step and skill (PHASE-3)
    - Boundary enforcement / dependency-rules validation (PHASE-3)
    - ADR trigger automation (PHASE-3)
    - explain-routing and resolve-routing commands (PHASE-3)
    - nit:skills listing command (PHASE-3)
    - nit:phase-summary rewrite (PHASE-3)
    - nit:add-skill interactive creation (PHASE-4)
    - Bun CLI package distribution (PHASE-4)
    - Run logging (PHASE-4)
    - Global ~/.claude/skills/nit/ namespace separation (PHASE-4)
    </out-of-scope>
  </scope>

  <dependencies>
    PHASE-1 (v1 workflow layer provides context and patterns to evolve from)
  </dependencies>

  <draft-tasks>
  - Define JSON Schemas for all artifact types (.nit/schemas/)
  - Create config files (workspace.json, supervisor.json, validation.json, role-routing.json) with schemas
  - Create registry files (task-types.json, roles.json, skills.json, artifact-types.json) with schemas
  - Create archetype definitions (base.json + 6 concrete) with inheritance resolver logic
  - Rewrite nit:init for v2 directory structure, module registration, and language auto-detection
  - Rewrite nit:clarify to produce summary.json and glossary.json alongside interactive flow
  - Rewrite nit:phases to produce phase.json output
  - Rewrite nit:tasks to produce task.json with targetModule, archetype assignment
  - Build deterministic supervisor skill (nit:continue) with state machine logic
  - Build nit:continue --dry-run mode
  - Build skill composition engine (layered resolution, step overrides, global skills)
  - Build nit:approve and nit:reject commands
  - Rewrite nit:design for JSON step output
  - Rewrite nit:implement for JSON state tracking
  - Rewrite nit:status for JSON state
  - Create validation hooks using check-jsonschema or ajv-cli
  - Update agent definitions for all 7 roles
  - Build nit:analyze step skill (new step, analyst role)
  </draft-tasks>

  <success-criteria>
  - nit:init creates the complete v2 .nit/ directory structure with config, registry, schemas, and archetypes
  - Brownfield nit:init auto-detects module languages and populates modules.json
  - All archetype definitions load correctly, including inheritance resolution from base
  - nit:continue advances a task through analyze -> design -> implement steps using archetype-driven sequencing
  - nit:continue --dry-run displays resolved archetype, skill composition, and step input without dispatching
  - Skill composition correctly layers base + language + custom skills, including step overrides
  - All JSON artifacts pass schema validation via hook-invoked validator
  - Invalid step output triggers repair flow (repairRequired=true, step reopened with error context)
  - maxReopenCount=3 enforced; exceeded count escalates to user
  - nit:approve and nit:reject correctly update approval.json and advance/reopen state
  - state.json accurately tracks currentStepId, stepOrder, status, reopenCount, timestamps
  </success-criteria>

  <risks>
  - Large scope: this phase covers the bulk of the system. May need to be subdivided during task planning if implementation reveals too many interdependencies.
  - Supervisor skill complexity: encoding deterministic state machine behavior as LLM instructions (per A-1) may require significant iteration to achieve consistent behavior.
  - Schema design: getting ~20 schemas right upfront is difficult; expect revision as implementation reveals gaps.
  - Dynamic skill dispatch via agent prompt (U-1) is untested at scale; may need workarounds if Claude Code's Agent tool does not reliably pass skill instructions.
  </risks>

</phase>
