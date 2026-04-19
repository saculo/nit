# Implementation — Task 12: Agent Definitions for v2 Roles

<implementation>

  <summary>
    Updated all seven agent definition files in `.claude/agents/` to reflect the v2 role model from
    PRD section 4.1.9. Three v1 agents were deleted and replaced with correctly-named v2 files:
    requirement-gatherer → analyst, devops-engineer → infra-engineer, qa-engineer → qa. The remaining
    four (architect, backend-engineer, frontend-engineer, reviewer) were rewritten in place to align
    descriptions, skill references, and tool lists with v2 conventions.

    Key structural changes:
    - analyst.md: references `nit:analyze` (forward reference to TASK-013), includes Archetype Proposal
      mode (U-11), and drops Bash from allowed-tools (clarification is read/write only)
    - reviewer.md: drops Edit from allowed-tools (reviewer reads code, writes only REVIEW.md)
    - architect.md: skill references updated to nit:design, nit:phase-plan, nit:phase-summary
    - All engineer agents (backend, frontend, infra, qa): reference nit:implement uniformly

    All 7 agent filenames match their roles.json ids from TASK-011 exactly.
  </summary>

  <files-changed>
    <file action="deleted">.claude/agents/requirement-gatherer.md</file>
    <file action="deleted">.claude/agents/devops-engineer.md</file>
    <file action="deleted">.claude/agents/qa-engineer.md</file>
    <file action="created">.claude/agents/analyst.md</file>
    <file action="created">.claude/agents/infra-engineer.md</file>
    <file action="created">.claude/agents/qa.md</file>
    <file action="modified">.claude/agents/architect.md</file>
    <file action="modified">.claude/agents/backend-engineer.md</file>
    <file action="modified">.claude/agents/frontend-engineer.md</file>
    <file action="modified">.claude/agents/reviewer.md</file>
  </files-changed>

  <deviations>
    None. All key decisions from DESIGN.md implemented as specified.
  </deviations>

  <tech-debt>
    analyst.md forward-references `nit:analyze`, a skill that will be created in TASK-013. Until
    TASK-013 is merged, invoking the analyst agent will fail to resolve the skill. This is intentional
    per KD-2 — avoids a second edit to analyst.md when TASK-013 ships.
  </tech-debt>

  <self-check>
    - AC-1: pass — 7 agent files confirmed: analyst.md, architect.md, backend-engineer.md, frontend-engineer.md, infra-engineer.md, reviewer.md, qa.md
    - AC-2: pass — analyst.md has skills: nit:analyze; body describes Clarification, Task Creation, and Archetype Proposal modes
    - AC-3: pass — tool lists differentiated by role; reviewer lacks Edit; analyst lacks Bash
    - AC-4: pass — requirement-gatherer.md and devops-engineer.md deleted; analyst.md and infra-engineer.md created with updated skill refs
    - DoD: all criteria done; structural verification passed; code review pending; tech debt documented
  </self-check>

</implementation>
