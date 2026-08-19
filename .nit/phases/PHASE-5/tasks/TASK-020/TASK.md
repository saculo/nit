# TASK-020 — Plugin Packaging and Global Namespace Separation

<task>

  <meta>
    <id>TASK-020</id>
    <phase>PHASE-5</phase>
    <title>Plugin Packaging and Global Namespace Separation</title>
    <type>infra</type>
    <module>@nit/cli</module>
    <status>todo</status>
  </meta>

  <user-story>
    As a developer who wants to use the nit workflow in any project on my machine,
    I want nit's skills, agents, and hooks distributed as an installable Claude Code plugin with a `nit:` namespace,
    So that I can invoke `/nit:clarify`, `/nit:design`, and the rest from any working directory without copying files or colliding with my existing global skills and agents.
  </user-story>

  <scope>
    <in-scope>
    - Plugin manifest at `.claude-plugin/plugin.json` declaring plugin name `nit`
    - Plugin payload directories (`skills/`, `agents/`, `hooks/`) sourced from the existing `.claude/` tree, so skills resolve as `nit:clarify`, `nit:design`, `nit:implement`, etc.
    - Replace the relative CLI invocation `bun run ./cli/src/cli.ts <cmd>` with a resolved `nit <cmd>` across all skill, agent, and hook files, so commands work from any cwd
    - Make the `nit` binary resolvable for an installed plugin (bin wiring in `cli/package.json`, plus a documented local-dev path via `bun link`)
    - Wire the 10 `validate-*.sh` hooks into the plugin's hook configuration (they are currently unreferenced by any settings.json)
    - Local install path: install the plugin from this repo without a published marketplace
    - Verify installed skills and agents load under the `nit:` namespace and do not collide with the user's existing global `architect.md` or other agents
    </in-scope>
    <out-of-scope>
    - `nit install` / `nit update` CLI commands for project-side scaffolding and version pinning (follow-on TASK-021)
    - `nitVersion` compatibility checking between global install and project state (follow-on TASK-022, per R-3)
    - Publishing to a public marketplace or npm registry
    - `nit:add-skill` interactive skill creation (separate PHASE-4 task)
    - Run logging and `nit:status` history integration (separate PHASE-4 task)
    - Migrating or cleaning the stale v1 infrastructure currently in `.nit/` (skills/, agents/, hooks/)
    - Skills not yet rewritten for JSON output (`nit:review`, `nit:qa`, `nit:status`) — packaged as-is, refreshed when PHASE-2/PHASE-3 land
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given the repository,
      When inspected,
      Then it contains a valid `.claude-plugin/plugin.json` declaring plugin name `nit`, and plugin `skills/`, `agents/`, and `hooks/` payloads covering all current nit skills, all 7 role agents, and all 10 validation hooks.
    </criterion>
    <criterion id="AC-2">
      Given the nit plugin installed from this repository,
      When a Claude Code session starts in an unrelated project directory,
      Then the nit skills are listed under the `nit:` namespace (e.g. `nit:clarify`, `nit:design`, `nit:implement`) and are invocable.
    </criterion>
    <criterion id="AC-3">
      Given the nit plugin is installed,
      When a nit skill or hook invokes the CLI,
      Then it calls a resolved `nit` command rather than `bun run ./cli/src/cli.ts`, and the invocation succeeds with the working directory set to a project outside this repository.
    </criterion>
    <criterion id="AC-4">
      Given the CLI is invoked from outside this repository,
      When a command that reads schemas or archetypes runs (`nit validate`, `nit archetype`),
      Then it resolves its own package-internal `schemas/` and `archetypes/` directories and succeeds.
    </criterion>
    <criterion id="AC-5">
      Given a user with a pre-existing global `~/.claude/agents/architect.md`,
      When the nit plugin is installed,
      Then the user's existing agent file is neither overwritten nor shadowed, and the nit architect agent remains reachable.
    </criterion>
    <criterion id="AC-6">
      Given a step output that violates its schema,
      When the corresponding validation hook fires from the installed plugin,
      Then the hook executes and reports the validation failure, confirming hooks are wired into the plugin rather than inert.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - Dependencies identified
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - Tests written and passed
  - Code review passed
  - No critical tech debt introduced
  </definition-of-done>

  <dependencies>
    - TASK-009 (CLI package foundation; `schemas/` and `archetypes/` already resolve via `import.meta.path`, not cwd)
    - None blocking. This task is deliberately pulled ahead of PHASE-4's stated PHASE-3 dependency; see notes.
  </dependencies>

  <open-questions>
    None. The namespacing mechanism was settled by inspection of the Claude Code skill loader — see notes.
  </open-questions>

  <notes>
    **Pulled forward.** PHASE-4 formally depends on PHASE-3, and PHASE-2 is still in progress (TASK-017 in review). This task is being run early because global availability of the workflow is independently useful and does not depend on the remaining pipeline work. Skills still being rewritten (`nit:review`, `nit:qa`, `nit:status`) are packaged in their current state and will be refreshed as PHASE-2/PHASE-3 complete.

    **PRD §4.1.15 correction.** The PRD specifies installing skills to `~/.claude/skills/nit/` with entries like `nit:clarify/SKILL.md`. This does not work. Claude Code's user/project skill loader scans `~/.claude/skills/`, and for each child directory checks only `<child>/SKILL.md` — a single level, no recursion — using the directory name as the skill name. A nested `skills/nit/<name>/SKILL.md` tree resolves to a lookup for `skills/nit/SKILL.md`, finds nothing, and is skipped entirely. The userSettings path builder confirms the flat layout: `join(homeDir, "skills", name)`.

    Namespacing is instead provided by the plugin loader, which composes skill names as `${pluginName}:${skillName}` — the mechanism behind existing namespaced skills such as `code-review:code-review`. Packaging nit as a plugin therefore delivers the exact `nit:*` command vocabulary the PRD assumes throughout, and additionally avoids the `~/.claude/agents/architect.md` collision with the user's pre-existing agent. PRD §4.1.15 and the file-layout diagram around PRD:447 should be updated to match.

    **Split rationale.** The user's chosen approach is plugin distribution *plus* a retained CLI installer surface. That is scoped across three tasks to keep each to a single PR: TASK-020 (this task, plugin packaging and namespace separation), TASK-021 (`nit install` / `nit update` for project-side scaffolding), TASK-022 (`nitVersion` compatibility checking).
  </notes>

</task>
