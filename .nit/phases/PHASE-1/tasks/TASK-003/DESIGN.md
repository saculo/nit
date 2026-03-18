# Design — Task 3: Orchestration and Utility Skills

<design>

  <type>devops</type>

  <summary>
    Create 3 skills for orchestration and utilities. nit:orchestrate is the central pipeline controller — it dispatches agents in sequence, manages approval gates, handles rework loops, task splitting, and type-based engineer routing. It reads artifacts to determine state but never writes files. nit:init initializes the .nit/ workspace with interactive greenfield/brownfield mode selection. nit:status provides a read-only dashboard showing phase/task tree, statuses, next-step suggestion, and available commands.
  </summary>

  <key-decisions>
    <decision id="KD-1">
      <description>Orchestrator is read-only — it dispatches agents but never writes files</description>
      <rationale>Clean separation: agents own artifact creation, orchestrator owns workflow flow. This prevents the orchestrator from accidentally corrupting state and makes the workflow auditable — every file change traces to a specific agent.</rationale>
    </decision>
    <decision id="KD-2">
      <description>Sequential agent dispatch only — no parallel agent execution</description>
      <rationale>Each step depends on the previous step's artifacts. Parallel dispatch would require complex synchronization with no practical benefit in a single-developer workflow.</rationale>
    </decision>
    <decision id="KD-3">
      <description>nit:init defers ecosystem detection to nit:implement</description>
      <rationale>At init time, the project may not have code yet (greenfield). Ecosystem detection is more reliable when actual source files exist. The implement skill auto-detects from project files and only falls back to config if detection fails.</rationale>
    </decision>
    <decision id="KD-4">
      <description>nit:status has no validation hook — handles missing .nit/ gracefully</description>
      <rationale>Status is a diagnostic tool. Blocking it when the workspace isn't initialized defeats its purpose. Instead, it detects the missing workspace and suggests /nit:init.</rationale>
    </decision>
  </key-decisions>

</design>
