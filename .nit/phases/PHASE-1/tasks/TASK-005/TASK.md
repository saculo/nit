# Task 5 — Per-Skill Validation Hooks

<task>

  <meta>
    <id>TASK-005</id>
    <phase>PHASE-1</phase>
    <title>Per-Skill Validation Hooks</title>
    <type>devops</type>
    <module>.nit/hooks</module>
    <status>done</status>
  </meta>

  <user-story>
    As a nit workflow user,
    I want each skill to validate its preconditions before execution,
    So that skills fail early with clear error messages instead of operating on invalid or missing inputs.
  </user-story>

  <scope>
    <in-scope>
    - One validation bash script per skill in .claude/hooks/
    - Scripts receive JSON on stdin, parse with jq, exit 0 (allow) or exit 2 (block with error on stderr)
    - Validations: file existence, XML tag structure, enum values, status preconditions
    - Hook registration in each skill's YAML frontmatter (PreToolUse matcher)
    - validate-init.sh — git repository check
    - validate-clarify.sh — PRD file existence (auto-detect)
    - validate-phases.sh — PRD + CLARIFICATIONS.md existence and structure
    - validate-tasks.sh — phase number valid, PHASE.md exists and structure, status not done
    - validate-design.sh — TASK.md exists and full structure, type enum, status not done
    - validate-implement.sh — TASK.md + DESIGN.md exist with structure, status checks
    - validate-review.sh — all 4 artifacts exist with structure, status in-progress or rework
    - validate-phase-summary.sh — PHASE.md exists and structure, all tasks have REVIEW.md
    - validate-orchestrate.sh — PRD file existence
    - validate-brownfield-orchestrate.sh — .nit/ exists, repo has commits, brownfield mode confirmed
    </in-scope>
    <out-of-scope>
    - CLI-based validation (nit validate command)
    - Post-write validation hooks (PostToolUse)
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the .nit/hooks/ directory,
      When listing hook scripts,
      Then 10 validate-*.sh scripts exist, one per skill that requires validation.
    </criterion>
    <criterion id="AC-2">
      Given any validation hook script,
      When checking its permissions,
      Then it is executable (chmod +x).
    </criterion>
    <criterion id="AC-3">
      Given a hook script invoked with missing required files,
      When the script runs,
      Then it exits with code 2 and prints a clear error message to stderr.
    </criterion>
    <criterion id="AC-4">
      Given each skill's SKILL.md frontmatter,
      When reading the hooks section,
      Then it references the corresponding validate-*.sh script with a PreToolUse Skill matcher.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - All 10 hook scripts created, executable, and referenced from skill frontmatter
  - Each hook validates the correct preconditions for its skill
  </definition-of-done>

  <dependencies>
    task-2 in phase-1, task-3 in phase-1, task-4 in phase-1
  </dependencies>

  <open-questions>
  </open-questions>

</task>
