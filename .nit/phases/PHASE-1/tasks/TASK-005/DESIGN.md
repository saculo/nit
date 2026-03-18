# Design — Task 5: Per-Skill Validation Hooks

<design>

  <type>devops</type>

  <summary>
    Create 10 bash validation scripts in .nit/hooks/, one per skill that requires precondition checking. Each script is registered in its skill's YAML frontmatter as a PreToolUse hook with a Skill matcher. Scripts receive JSON on stdin (containing tool_input with skill name and args), parse it with jq, perform validation checks (file existence, XML tag structure, enum values, status preconditions), and exit 0 to allow or exit 2 with an error message on stderr to block execution.
  </summary>

  <key-decisions>
    <decision id="KD-1">
      <description>Per-skill hook scripts instead of one monolithic validation script</description>
      <rationale>Each skill has different preconditions. Separate scripts are easier to maintain, test, and reason about. Adding a new skill means adding a new hook without touching existing ones.</rationale>
    </decision>
    <decision id="KD-2">
      <description>Hooks registered in skill frontmatter instead of centralized settings.json</description>
      <rationale>Co-location — the hook definition lives with the skill it validates. No need to maintain a separate mapping. When a skill is removed, its hook reference goes with it.</rationale>
    </decision>
    <decision id="KD-3">
      <description>Exit code 2 for blocking (not exit 1)</description>
      <rationale>Claude Code hook convention: exit 0 = allow, exit 2 = block with error message shown to user on stderr. Exit 1 is reserved for unexpected script failures.</rationale>
    </decision>
    <decision id="KD-4">
      <description>XML structure validation uses grep for tag presence rather than full XML parsing</description>
      <rationale>Artifacts use loose XML-in-Markdown, not valid XML. Full XML parsers would fail on the hybrid format. grep-based checks (tag exists, required children present) are sufficient for precondition validation. Deep structural validation is left to Step 0 in the skill body.</rationale>
    </decision>
    <decision id="KD-5">
      <description>validate-review.sh warns on pending STEPS.md items but doesn't block</description>
      <rationale>A review can legitimately happen when some steps are pending — the reviewer may flag them as rework items. Blocking would create a chicken-and-egg problem where implementation can't complete until review, but review can't start until implementation completes.</rationale>
    </decision>
  </key-decisions>

</design>
