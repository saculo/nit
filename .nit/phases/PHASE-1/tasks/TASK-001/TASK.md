# Task 1 — Agent Persona Definitions

<task>

  <meta>
    <id>TASK-001</id>
    <phase>PHASE-1</phase>
    <title>Agent Persona Definitions</title>
    <type>devops</type>
    <module>.nit/agents</module>
    <status>done</status>
  </meta>

  <user-story>
    As a nit workflow user,
    I want agent persona definitions for every role in the pipeline,
    So that the orchestrator can dispatch specialized agents for each workflow step.
  </user-story>

  <scope>
    <in-scope>
    - Architect agent with phase planning, task design, and phase summary modes
    - Requirement-gatherer agent with clarify and task creation capabilities
    - Reviewer agent for code review workflow
    - Four type-specific engineer agents (backend, frontend, devops, qa)
    - Frontmatter with name, description, model, allowed-tools, skills-used
    - Role-specific rules and constraints per agent
    </in-scope>
    <out-of-scope>
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the .nit/agents/ directory,
      When listing agent files,
      Then 7 agent definitions exist: architect.md, requirement-gatherer.md, reviewer.md, backend-engineer.md, frontend-engineer.md, devops-engineer.md, qa-engineer.md.
    </criterion>
    <criterion id="AC-2">
      Given any agent file,
      When reading its frontmatter,
      Then it contains name, description, allowed-tools, and skills-used fields referencing the correct nit:* skill names.
    </criterion>
    <criterion id="AC-3">
      Given the architect agent,
      When checking its capabilities section,
      Then it lists phase planning (nit:phases), task design (nit:design), and phase summary (nit:phase-summary) modes.
    </criterion>
    <criterion id="AC-4">
      Given any engineer agent,
      When checking its skills reference,
      Then it references nit:implement as its primary skill.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - All 7 agent files created and well-formed
  - Agent cross-references to skills use correct nit:* names
  </definition-of-done>

  <dependencies>
    None
  </dependencies>

  <open-questions>
  </open-questions>

</task>
