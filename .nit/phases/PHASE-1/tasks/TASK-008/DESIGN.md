# Design — Task 8: Replace Claude Code Review with CodeRabbit

<design>

  <type>devops</type>

  <summary>
    Replace the Claude Code Review GitHub Actions workflow with a CodeRabbit configuration file. The Claude Code review workflow auto-triggered on every PR using the `code-review` plugin, creating overlap with the general-purpose Claude Code Action workflow that handles interactive `@claude` mentions. By switching to CodeRabbit, the project gets a dedicated review tool with path-aware instructions tailored to the repo's unique structure (skills, agents, hooks, phases), while preserving Claude Code Action for on-demand collaboration.

    The implementation is minimal: delete one workflow file and create one configuration file. CodeRabbit is configured declaratively via `.coderabbit.yaml` with path-specific review instructions for each key area of the repo, ensuring reviewers understand the purpose and patterns expected in each directory.
  </summary>

  <key-decisions>
    <decision id="KD-1">
      <description>Use CodeRabbit instead of Claude Code Review plugin for automated PR reviews</description>
      <rationale>Separates the review tool from the authoring tool (Claude Code / nit workflow), provides native path-instruction support, and reduces noise from unfocused reviews. See ADR 0001 for full analysis.</rationale>
    </decision>
    <decision id="KD-2">
      <description>Retain the Claude Code Action workflow (.github/workflows/claude.yml) for interactive use</description>
      <rationale>The `@claude` mention workflow serves a different purpose — on-demand collaboration, not systematic review. Removing it would lose valuable interactive capabilities.</rationale>
    </decision>
    <decision id="KD-3">
      <description>Configure path-specific review instructions for all major repo areas</description>
      <rationale>This repo has a non-standard structure (skills, agents, hooks, phases) that generic reviewers would not understand. Path instructions give CodeRabbit the context needed to provide relevant feedback for each area.</rationale>
    </decision>
    <decision id="KD-4">
      <description>Enable request_changes_workflow mode</description>
      <rationale>Allows CodeRabbit to request changes rather than just commenting, making review feedback actionable and trackable within GitHub's review system.</rationale>
    </decision>
  </key-decisions>

  <trade-offs>
    <trade-off id="TO-1">
      <description>Third-party review service vs. in-house Claude-based review</description>
      <options>
        <option id="OPT-1" chosen="true">
          <title>CodeRabbit (dedicated review tool)</title>
          <pros>
          - Purpose-built for code review with path-specific instructions
          - Declarative YAML config, version-controlled
          - Separation of concerns from authoring toolchain
          </pros>
          <cons>
          - External dependency (GitHub App installation required)
          - Free tier limitations may apply
          </cons>
          <current-consequences>
          - Requires one-time manual GitHub App installation
          - Config file added to repo root
          </current-consequences>
          <long-term-consequences>
          - Review quality scales with path-instruction refinement
          - May need paid plan as team grows
          </long-term-consequences>
        </option>
        <option id="OPT-2" chosen="false">
          <title>Claude Code Review plugin (status quo)</title>
          <pros>
          - No additional tooling, same model as authoring
          - Already configured and working
          </pros>
          <cons>
          - Author and reviewer are the same tool — no separation of concerns
          - No path-specific instruction support
          - Triggers on every PR indiscriminately
          </cons>
          <current-consequences>
          - Reviews lack repo-specific context
          - Overlapping concerns with @claude workflow
          </current-consequences>
          <long-term-consequences>
          - Review quality plateaus without path awareness
          - Noise increases as PR volume grows
          </long-term-consequences>
        </option>
      </options>
    </trade-off>
  </trade-offs>

  <related-adrs>
    - .nit/adr/0001-use-coderabbit-for-automated-pr-review.md (created)
  </related-adrs>

</design>
