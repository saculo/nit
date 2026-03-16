# Design — Task 4: Brownfield Analysis Skills

<design>

  <type>devops</type>

  <summary>
    Create 3 skills for brownfield initial-state generation using a two-agent orchestrated flow. nit:brownfield-orchestrate coordinates the sequence: dispatch architect agent → human review → dispatch engineer agent → human review. nit:brownfield-analyze (architect) scans the repository to discover modules, detect ecosystems, analyze architecture patterns, and write the structural sections of .nit/project/initial-state.md. nit:brownfield-snapshot (engineer) reads the architect's output and adds implementation-level sections: code conventions, hot spots, tech debt, and toolchain per module.
  </summary>

  <key-decisions>
    <decision id="KD-1">
      <description>Two-agent split: architect handles structure, engineer handles implementation details</description>
      <rationale>Separates concerns cleanly. Architecture analysis (module discovery, ecosystem detection, dependency mapping) requires different scanning strategies than implementation analysis (code convention sampling, tech debt cataloging). Each agent focuses on what it does best.</rationale>
    </decision>
    <decision id="KD-2">
      <description>Human review gate between architect and engineer phases</description>
      <rationale>The architect's module discovery and ecosystem mapping is the foundation for the engineer's analysis. If the architect misidentifies a module or ecosystem, the engineer would produce incorrect analysis. Human review catches errors before they compound.</rationale>
    </decision>
    <decision id="KD-3">
      <description>Engineer replaces placeholder comments in initial-state.md rather than creating a separate file</description>
      <rationale>Single file as source of truth. The architect leaves `<!-- Engineer analysis pending -->` markers that the engineer replaces. This keeps the initial-state artifact cohesive and avoids merge complexity.</rationale>
    </decision>
    <decision id="KD-4">
      <description>Re-dispatch on rejection modifies existing initial-state.md rather than starting from scratch</description>
      <rationale>Efficiency — most rejections involve corrections to specific sections, not wholesale rewrites. The orchestrator tells the agent which sections need correction based on human feedback.</rationale>
    </decision>
  </key-decisions>

  <integration-points>
    <integration id="IP-1">
      <type>internal</type>
      <target>nit:init skill (brownfield mode)</target>
      <exists>yes</exists>
      <communication>file-system</communication>
      <potential-issues>
      - init must create .nit/ before brownfield-orchestrate can run
      - Config must confirm brownfield mode
      </potential-issues>
      <patterns>
      - init suggests running /nit:brownfield-orchestrate but does not auto-trigger
      - brownfield-orchestrate hook validates .nit/ exists and mode is brownfield
      </patterns>
    </integration>
  </integration-points>

</design>
