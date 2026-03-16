# Design — Task 1: Agent Persona Definitions

<design>

  <type>devops</type>

  <summary>
    Define 7 agent personas as markdown files in .claude/agents/. Each agent has YAML frontmatter (name, description, allowed-tools, skills-used) and a body describing its role, capabilities, modes of operation, and rules. The architect operates in 4 modes (phase planning, task design, phase summary, ADR creation). The requirement-gatherer handles clarification and task creation. The reviewer handles code review. Four engineer variants (backend, frontend, devops, qa) share a common skill (nit:implement) but are dispatched by type to allow specialist routing per task.
  </summary>

  <key-decisions>
    <decision id="KD-1">
      <description>Four separate engineer agents instead of one generic engineer</description>
      <rationale>Type-based routing enables dispatching the right specialist per task type. The orchestrator reads the task type from DESIGN.md and dispatches the matching engineer. All four currently use the same nit:implement skill.</rationale>
    </decision>
    <decision id="KD-2">
      <description>Architect agent handles phase-summary in addition to planning and design</description>
      <rationale>Phase completion analysis requires architectural judgement (milestone verification, future phase impact, emergent ADRs). Reusing the architect avoids a new agent and keeps architectural responsibility consolidated.</rationale>
    </decision>
    <decision id="KD-3">
      <description>Skills referenced via comment (# skills-used) rather than active frontmatter field</description>
      <rationale>Claude Code agent frontmatter doesn't formally support a skills-used field. The comment serves as documentation for the orchestrator and human readers without risking parser issues.</rationale>
    </decision>
  </key-decisions>

</design>
