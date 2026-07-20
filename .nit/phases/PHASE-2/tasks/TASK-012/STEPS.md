# Steps — Task 12: Agent Definitions for v2 Roles

<steps>

  <implementation-steps>
    <step id="S-1" status="done">
      <description>Delete v1 agent files: requirement-gatherer.md, devops-engineer.md, qa-engineer.md</description>
      <deviation></deviation>
    </step>
    <step id="S-2" status="done">
      <description>Create analyst.md (replaces requirement-gatherer) with nit:analyze skill reference, analyst persona, and appropriate tool list (no Bash)</description>
      <deviation></deviation>
    </step>
    <step id="S-3" status="done">
      <description>Create infra-engineer.md (replaces devops-engineer) with nit:implement skill reference and infra-specific guidance</description>
      <deviation></deviation>
    </step>
    <step id="S-4" status="done">
      <description>Create qa.md (replaces qa-engineer) with nit:implement skill reference and QA-specific guidance</description>
      <deviation></deviation>
    </step>
    <step id="S-5" status="done">
      <description>Update architect.md: fix skill references to nit:design, nit:phase-plan, nit:phase-summary; update description</description>
      <deviation></deviation>
    </step>
    <step id="S-6" status="done">
      <description>Update backend-engineer.md: fix skill reference to nit:implement; description update</description>
      <deviation></deviation>
    </step>
    <step id="S-7" status="done">
      <description>Update frontend-engineer.md: fix skill references to nit:implement; description update</description>
      <deviation></deviation>
    </step>
    <step id="S-8" status="done">
      <description>Update reviewer.md: fix skill reference to nit:review; remove Edit from allowed-tools per KD-3</description>
      <deviation></deviation>
    </step>
    <step id="S-9" status="done">
      <description>Verify all 7 agent files exist, name: fields match filename stems, and roles match registry/roles.json ids</description>
      <deviation></deviation>
    </step>
  </implementation-steps>

  <acceptance-criteria-check>
    <criterion id="AC-1" status="done">
      <description>Given the .claude/agents/ directory, When its contents are listed, Then 7 agent .md files exist: analyst.md, architect.md, backend-engineer.md, frontend-engineer.md, infra-engineer.md, reviewer.md, qa.md.</description>
      <verification>ls .claude/agents/ confirms exactly 7 .md files with the required names. Verified in S-9.</verification>
    </criterion>
    <criterion id="AC-2" status="done">
      <description>Given the analyst.md agent definition, When its content is inspected, Then it references the nit:analyze skill and describes the analyst role (analysis, archetype proposal per U-11).</description>
      <verification>analyst.md has skills: nit:analyze in frontmatter. Body describes three modes: PRD Clarification, Task Creation, and Archetype Proposal (U-11). Verified in S-9.</verification>
    </criterion>
    <criterion id="AC-3" status="done">
      <description>Given each agent definition file, When its allowed-tools section is inspected, Then it lists tools appropriate for that role (e.g., Read/Write/Edit for engineers, Read-only for reviewer).</description>
      <verification>Engineers (backend, frontend, infra, qa): Read,Write,Edit,Bash,Glob,Grep. Analyst: Read,Write,Edit,Glob,Grep (no Bash). Architect: full set. Reviewer: Read,Write,Bash,Glob,Grep (no Edit). Verified in S-9.</verification>
    </criterion>
    <criterion id="AC-4" status="done">
      <description>Given v1 agent files for requirement-gatherer and devops-engineer, When v2 agent definitions are applied, Then requirement-gatherer is replaced by analyst and devops-engineer is replaced by infra-engineer with updated skill references.</description>
      <verification>requirement-gatherer.md and devops-engineer.md deleted in S-1. analyst.md (nit:analyze) and infra-engineer.md (nit:implement) created in S-2 and S-3. qa-engineer.md also deleted; qa.md created. No v1 files remain.</verification>
    </criterion>
  </acceptance-criteria-check>

  <dod-check>
    <item id="DOD-1" status="done">All acceptance criteria passed</item>
    <item id="DOD-2" status="done">Tests: verified via ls + frontmatter inspection for all 7 agents; agent files are static declarations with no executable logic to unit-test beyond structural verification</item>
    <item id="DOD-3" status="pending">Code review passed</item>
    <item id="DOD-4" status="done">No critical tech debt — forward reference to nit:analyze documented in DESIGN.md KD-2 and IMPLEMENTATION.md</item>
  </dod-check>

</steps>
