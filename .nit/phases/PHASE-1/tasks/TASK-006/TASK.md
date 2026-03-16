# Task 7 — Init Placement of Agents, Skills, and Hooks

<task>

  <meta>
    <id>TASK-006</id>
    <phase>PHASE-1</phase>
    <title>Init Placement of Agents, Skills, and Hooks</title>
    <type>devops</type>
    <module>.claude/skills/init</module>
    <status>done</status>
  </meta>

  <user-story>
    As a nit workflow user running /nit:init,
    I want the init process to place all nit agents, skills, and hooks into my .claude directory,
    So that the nit workflow is fully operational in my Claude Code environment after initialization.
  </user-story>

  <scope>
    <in-scope>
    - Ask user during init: project-local (.claude/) or global (~/.claude/) placement
    - Copy/generate agent definitions into target .claude/agents/
    - Copy/generate skill SKILL.md files into target .claude/skills/
    - Copy/generate validation hook scripts into target .claude/hooks/
    - Make hook scripts executable after placement
    - Handle existing files: warn if nit files already exist, ask to overwrite or skip
    - Update nit:init skill to include the placement step
    </in-scope>
    <out-of-scope>
    - Provider adapters (Codex placement)
    - CLAUDE.md / AGENTS.md auto-generation
    - Symlink strategies (copy only for now)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a user running /nit:init,
      When prompted for placement location,
      Then the user can choose between project-local (.claude/) or global (~/.claude/).
    </criterion>
    <criterion id="AC-2">
      Given the user selects project-local placement,
      When init completes,
      Then all 7 agent files exist in .claude/agents/, all skill directories exist in .claude/skills/ with SKILL.md files, and all hook scripts exist in .claude/hooks/ with executable permissions.
    </criterion>
    <criterion id="AC-3">
      Given nit files already exist in the target .claude/ directory,
      When init runs,
      Then the user is warned about existing files and asked whether to overwrite or skip each conflict.
    </criterion>
    <criterion id="AC-4">
      Given init completes successfully,
      When the user invokes any /nit:* command,
      Then the skill is found and its validation hook executes correctly.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - nit:init skill updated with placement step
  - Placement works for both local and global targets
  </definition-of-done>

  <dependencies>
    task-1 in phase-1, task-2 in phase-1, task-3 in phase-1, task-5 in phase-1
  </dependencies>

  <open-questions>
    <question id="Q-1">Should init support a --global flag or always ask interactively?</question>
    <question id="Q-2">Should placement be a separate step in init or integrated into the existing Step 3 (directory creation)?</question>
  </open-questions>

</task>
