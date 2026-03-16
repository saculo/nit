# Design — Task 7: Init Placement of Agents, Skills, and Hooks

<design>

  <type>devops</type>

  <summary>
    Extend the nit:init skill to place all nit workflow files (agents, skills, hooks) into the user's chosen .claude directory after creating the .nit/ workspace. The init process asks the user whether to use project-local (.claude/) or global (~/.claude/) placement. It then copies agent definitions, skill SKILL.md files (with directory structure), and validation hook scripts to the target location, setting executable permissions on hooks. Existing files trigger a conflict prompt (overwrite/skip).
  </summary>

  <key-decisions>
    <decision id="KD-1">
      <description>Placement as a new step in nit:init (Step 5, after config creation, before brownfield suggestion)</description>
      <rationale>Placement depends on the .nit/ workspace existing (config determines what to place). It must happen before the user tries to run any /nit:* commands. Inserting it after config creation and before the completion message keeps the flow logical.</rationale>
    </decision>
    <decision id="KD-2">
      <description>Copy files rather than symlink</description>
      <rationale>Copies are simpler, more portable, and work in all environments (containers, CI, shared drives). Symlinks create fragile dependencies on the source location. Users who want to track upstream changes can re-run init to refresh.</rationale>
    </decision>
    <decision id="KD-3">
      <description>Interactive conflict resolution (overwrite/skip) rather than silent overwrite</description>
      <rationale>Users may have customized their .claude/ files. Silent overwrite would destroy their changes. Asking per-conflict is safer and aligns with the human-in-the-loop principle.</rationale>
    </decision>
  </key-decisions>


</design>
