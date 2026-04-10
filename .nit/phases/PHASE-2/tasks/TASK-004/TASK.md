# TASK-004 — Agent Definitions for v2 Roles

<task>

  <meta>
    <id>TASK-004</id>
    <phase>PHASE-2</phase>
    <title>Agent Definitions for v2 Roles</title>
    <type>devops</type>
    <module>.claude</module>
    <status>draft</status>
  </meta>

  <user-story>
    As a nit supervisor dispatching specialists,
    I want updated agent definition files for all 7 v2 roles with correct skill references,
    So that each role can be invoked via the Agent tool with the appropriate persona, allowed tools, and skill set.
  </user-story>

  <scope>
    <in-scope>
    - Update/create all 7 agent definitions: analyst, architect, backend-engineer, frontend-engineer, infra-engineer, reviewer, qa
    - Place in .claude/agents/ (later moved to ~/.claude/nit/agents/ in PHASE-4 CLI install)
    - v1 role changes applied: requirement-gatherer becomes analyst, devops-engineer becomes infra-engineer (per 4.1.9)
    - Skill references updated for v2 skill names (nit:analyze, nit:design, nit:implement, nit:review, nit:qa, etc.)
    - Each agent defines: role description, allowed tools, skill references, persona instructions
    </in-scope>
    <out-of-scope>
    - Moving agents to ~/.claude/nit/agents/ (PHASE-4 CLI install)
    - Dynamic skill loading logic (that is the supervisor's job in TASK-007)
    - Skill SKILL.md files themselves (other tasks)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the .claude/agents/ directory,
      When its contents are listed,
      Then 7 agent .md files exist: analyst.md, architect.md, backend-engineer.md, frontend-engineer.md, infra-engineer.md, reviewer.md, qa.md.
    </criterion>
    <criterion id="AC-2">
      Given the analyst.md agent definition,
      When its content is inspected,
      Then it references the nit:analyze skill and describes the analyst role (analysis, archetype proposal per U-11).
    </criterion>
    <criterion id="AC-3">
      Given each agent definition file,
      When its allowed-tools section is inspected,
      Then it lists tools appropriate for that role (e.g., Read/Write/Edit for engineers, Read-only for reviewer).
    </criterion>
    <criterion id="AC-4">
      Given v1 agent files for requirement-gatherer and devops-engineer,
      When v2 agent definitions are applied,
      Then requirement-gatherer is replaced by analyst and devops-engineer is replaced by infra-engineer with updated skill references.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - Dependencies identified
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - Tests written and passed
  - Code review passed
  - No critical tech debt introduced
  </definition-of-done>

  <dependencies>
    TASK-003 in PHASE-2 (registry/roles.json must define the 7 roles)
  </dependencies>

  <open-questions>
    None
  </open-questions>

</task>
