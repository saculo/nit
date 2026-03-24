# Task 8 — Replace Claude Code Review with CodeRabbit

<task>

  <meta>
    <id>TASK-008</id>
    <phase>PHASE-1</phase>
    <title>Replace Claude Code Review with CodeRabbit</title>
    <type>devops</type>
    <module>.github</module>
    <status>done</status>
  </meta>

  <user-story>
    As a project maintainer,
    I want to replace the Claude Code auto-review workflow with CodeRabbit,
    So that pull requests receive automated code review from a dedicated review tool with path-aware context.
  </user-story>

  <scope>
    <in-scope>
    - Remove .github/workflows/claude-code-review.yml
    - Add .coderabbit.yaml with auto-review enabled on PRs targeting main
    - Configure path-specific review instructions for all key areas (.claude/, .nit/, .github/)
    - Enable request-changes workflow and high-level PR summaries
    </in-scope>
    <out-of-scope>
    - Removing the general-purpose Claude Code Action workflow (.github/workflows/claude.yml)
    - CodeRabbit GitHub App installation (manual step)
    - CodeRabbit paid plan features
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the .github/workflows/ directory,
      When listing workflow files,
      Then claude-code-review.yml does not exist.
    </criterion>
    <criterion id="AC-2">
      Given the repository root,
      When checking for CodeRabbit configuration,
      Then .coderabbit.yaml exists with auto_review enabled and drafts disabled.
    </criterion>
    <criterion id="AC-3">
      Given the .coderabbit.yaml configuration,
      When reading path_instructions,
      Then instructions exist for .claude/skills, .claude/agents, .claude/hooks, .nit/skills, .nit/agents, .nit/hooks, .nit/phases, and .github/workflows.
    </criterion>
    <criterion id="AC-4">
      Given the .coderabbit.yaml configuration,
      When reading review settings,
      Then request_changes_workflow is true, high_level_summary is true, and base_branches includes main.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - claude-code-review.yml removed
  - .coderabbit.yaml created and valid
  </definition-of-done>

  <dependencies>
    None
  </dependencies>

  <open-questions>
  </open-questions>

</task>
