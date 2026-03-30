# PHASE-4 — Skill Creation, Distribution, and Polish

<phase>

  <meta>
    <id>PHASE-4</id>
    <title>Skill Creation, Distribution, and Polish</title>
    <milestone>Users can interactively create custom skills, install nit globally via package manager, and run the complete pipeline with run logging and refined repair flows on a multi-module project</milestone>
    <status>draft</status>
  </meta>

  <business-value>
    The system becomes self-extensible and distributable. Users can add framework, tool, and pattern expertise via `nit:add-skill` without manually authoring SKILL.md files. The Bun/Node CLI package lets users install nit globally with a single command and update it independently of project state. Run logging provides an audit trail of every supervisor invocation. Repair flow refinement makes rejection/reopen cycles more predictable. End-to-end testing on a multi-module project validates the entire system works as designed across all archetypes, skill layers, and boundary rules.
  </business-value>

  <scope>
    <in-scope>
    - nit:add-skill interactive skill creation: asks targeted questions, generates SKILL.md in .claude/skills/<name>/, updates registry/skills.json, optionally associates with modules in modules.json
    - Role refinements: analyst role behavior tuning, infra-engineer role behavior tuning (renamed from devops-engineer)
    - Bun CLI package (bunx @nit/cli install and update), also supporting npx (per R-5)
    - Global ~/.claude/skills/nit/ namespace separation: core nit skills installed globally, project custom skills in .claude/skills/
    - Run logging: .nit/logs/runs/RUN-NNN.json tracking timestamp, task, step, skills loaded, duration, outcome
    - nit:status integration with run log history
    - Repair/reopen flow refinement: edge cases in rejection routing, comment-based routing overrides (e.g., "reject review -> reopen review" vs default "reject review -> reopen implement")
    - nitVersion compatibility checking between global install and project state (per R-3)
    - End-to-end testing: full pipeline on a sample multi-module project across at least 3 archetype types
    - Documentation: update any skill instructions that changed during implementation
    </in-scope>
    <out-of-scope>
    - Claude.ai support (deferred per U-9)
    - Initiative layer (INIT-NNN grouping, deferred per PRD 4.2)
    - TUI/GUI
    - MCP server integration
    - Provider adapters (Codex, Cursor, etc.)
    - Multi-project orchestration
    - v1 artifact migration tooling
    </out-of-scope>
  </scope>

  <dependencies>
    PHASE-3 (full 5-step pipeline, boundary enforcement, ADR triggers, routing commands)
  </dependencies>

  <draft-tasks>
  - Build nit:add-skill interactive skill creation flow
  - Refine analyst role skill and behavior
  - Refine infra-engineer role skill and behavior (renamed from devops-engineer)
  - Build Bun/Node CLI package for global install (bunx @nit/cli install, bunx @nit/cli update)
  - Implement global namespace separation (~/.claude/skills/nit/ for core, .claude/skills/ for project custom)
  - Implement nitVersion compatibility check between global core and project state
  - Add run logging (.nit/logs/runs/RUN-NNN.json) and integrate with nit:status
  - Refine repair/reopen flow: comment-based routing overrides, edge case handling
  - End-to-end test: run full pipeline on sample multi-module project with backend-feature, frontend-feature, and cross-module-change archetypes
  - Final documentation pass on all skills
  </draft-tasks>

  <success-criteria>
  - nit:add-skill creates a valid custom skill interactively, registers it in skills.json, and optionally associates it with modules
  - bunx @nit/cli install (and npx equivalent) installs core nit to ~/.claude/skills/nit/, ~/.claude/agents/nit/, ~/.claude/hooks/nit/
  - bunx @nit/cli update updates global core without affecting project state
  - nitVersion mismatch between global core and project state produces a clear warning
  - Run logs are written after each supervisor invocation with correct metadata
  - nit:status shows recent run history alongside task/phase status
  - Rejection routing correctly handles comment-based overrides (e.g., "reject review -> reopen review" when comment indicates review-only issue)
  - Full pipeline completes end-to-end on a multi-module project: init -> clarify -> phases -> tasks -> (analyze -> design -> implement -> review -> qa) per task -> phase-summary
  - At least 3 archetype types (backend-feature, frontend-feature, cross-module-change) exercised in the end-to-end test
  - Skill composition verified with language + custom skills correctly loaded per module
  </success-criteria>

  <risks>
  - CLI package distribution adds a build/publish toolchain dependency (Bun/Node packaging, npm registry) that is new to the project
  - Global namespace separation requires careful file management; conflicts with user's own global skills could occur if namespacing is not strict
  - End-to-end testing on a multi-module project may reveal integration issues that require backporting fixes to PHASE-2/PHASE-3 work
  - LLM-generated skill content from nit:add-skill varies in quality; may need templates or guardrails to ensure consistency
  </risks>

</phase>
