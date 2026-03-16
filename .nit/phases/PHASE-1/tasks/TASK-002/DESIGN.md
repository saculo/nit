# Design — Task 2: Core Pipeline Skills

<design>

  <type>devops</type>

  <summary>
    Create 7 Claude Code skills covering every step of the nit delivery pipeline. Each skill is a SKILL.md file in its own directory under .nit/skills/ with YAML frontmatter (name in nit:* namespace, description, allowed-tools, PreToolUse hook reference). Each skill defines a multi-step process that reads input artifacts, performs analysis or generation, and writes output artifacts in XML-in-Markdown format. Skills include defense-in-depth Step 0 validation in addition to hook-based pre-validation.

    Skills: nit:clarify (PRD → CLARIFICATIONS.md), nit:phases (PRD + clarifications → PHASE.md per phase), nit:tasks (PHASE.md → TASK.md per task), nit:design (TASK.md → DESIGN.md + optional ADRs), nit:implement (TASK.md + DESIGN.md → STEPS.md + IMPLEMENTATION.md), nit:review (all artifacts → REVIEW.md with verdict), nit:phase-summary (all phase artifacts → SUMMARY.md + PLR).
  </summary>

  <key-decisions>
    <decision id="KD-1">
      <description>Each skill is self-contained with its own SKILL.md rather than sharing a monolithic skill file</description>
      <rationale>Separation of concerns — each skill has its own description for trigger matching, its own allowed-tools, and its own hook. Skills can be invoked independently via /nit:* commands or dispatched by the orchestrator.</rationale>
    </decision>
    <decision id="KD-2">
      <description>XML-in-Markdown format for all artifacts (loose XML with top-level tags, prose/bullets inside)</description>
      <rationale>Balances human readability with machine parseability. Top-level tags give structure for validation hooks and agent parsing. Inner content stays flexible for natural prose. Aligns with the design doc's hybrid approach (section 16).</rationale>
    </decision>
    <decision id="KD-3">
      <description>BDD format (Given/When/Then) for acceptance criteria, user stories as As-a/I-want/So-that</description>
      <rationale>Industry-standard formats that agents understand well. Provides clear, testable criteria that the review skill can verify mechanically.</rationale>
    </decision>
    <decision id="KD-4">
      <description>Phase Learning Records (PLRs) as a new artifact type in .nit/plr/</description>
      <rationale>Captures execution learnings (what worked, what didn't, what changed) in a format inspired by MADR but focused on retrospective rather than decisions.</rationale>
    </decision>
    <decision id="KD-5">
      <description>Review verdict is binary: approved or rework-requested</description>
      <rationale>Simple routing for the orchestrator — approved means move on, rework-requested means loop back. Rework items specify exactly what needs fixing (file, location, issue, fix) so the engineer can act without ambiguity.</rationale>
    </decision>
  </key-decisions>

  <integration-points>
    <integration id="IP-1">
      <type>internal</type>
      <target>Validation hooks (.claude/hooks/validate-*.sh)</target>
      <exists>yes</exists>
      <communication>CLI</communication>
      <potential-issues>
      - Hook scripts must parse JSON stdin correctly with jq
      - Exit code 2 blocks execution with stderr message shown to user
      </potential-issues>
      <patterns>
      - PreToolUse hook registered in SKILL.md frontmatter
      - Defense-in-depth: Step 0 in skill body repeats key checks
      </patterns>
    </integration>
  </integration-points>

</design>
