# PHASE-1 — Workflow Layer Foundation

<phase>

  <meta>
    <id>PHASE-1</id>
    <title>Workflow Layer Foundation</title>
    <milestone>Complete set of Claude Code skills, agents, and hooks enabling the full nit workflow pipeline (init → clarify → phases → tasks → design → implement → review → phase-summary) to be invoked manually or via orchestration</milestone>
    <status>done</status>
  </meta>

  <business-value>
    The nit workflow system is usable end-to-end inside Claude Code. A user can run `/nit:init` to set up a workspace, feed a PRD through the pipeline, and get structured delivery with human-in-the-loop approvals at every stage. Brownfield projects can generate an initial-state analysis before planning.
  </business-value>

  <scope>
    <in-scope>
    - Agent persona definitions for all roles (architect, requirement-gatherer, reviewer, engineers)
    - Core pipeline skills covering every workflow step
    - Orchestration skills (e2e pipeline, init, status dashboard)
    - Brownfield analysis skills (orchestrator, architect analysis, engineer analysis)
    - Per-skill validation hooks with bash scripts
    </in-scope>
    <out-of-scope>
    - TypeScript/Bun CLI application
    - Provider adapters (Codex, etc.)
    - TUI/GUI
    - MCP server integration
    </out-of-scope>
  </scope>

  <dependencies>
    None
  </dependencies>

  <draft-tasks>
  - Define all agent personas (architect, requirement-gatherer, reviewer, 4 engineers)
  - Create core pipeline skills (clarify, phases, tasks, design, implement, review, phase-summary)
  - Create orchestration and utility skills (e2e-orchestration, init, status)
  - Create brownfield analysis skills (orchestrator, architect analysis, engineer snapshot)
  - Create per-skill validation hook scripts
  - Init placement of agents, skills, and hooks into user's .claude directory
  </draft-tasks>

  <success-criteria>
  - All 7 agent definitions exist in .claude/agents/
  - All skills exist in .claude/skills/ with correct nit:* namespace frontmatter
  - All validation hooks exist in .claude/hooks/ and are executable
  - /nit:orchestrate can invoke the full pipeline end-to-end
  - /nit:init can initialize a workspace for greenfield or brownfield and place nit files into .claude/
  - Each skill can be invoked standalone via /nit:* commands
  </success-criteria>

  <risks>
  - Skills may need iteration after real-world usage reveals gaps in validation or workflow logic
  </risks>

</phase>
