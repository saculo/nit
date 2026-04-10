# Clarifications

<clarifications>

  <unknowns>

    <unknown id="U-1">
      <question>Supervisor agent dispatch mechanism: The PRD says the supervisor "invokes agent with composed skill list" but does not specify how. Claude Code agents are defined by static `.md` files with fixed skill references. How does the supervisor dynamically pass a different skill list per invocation? Does it rewrite agent files on the fly, inject skill content into the prompt, or rely on a Claude Code feature for dynamic skill loading?</question>
      <answer>The supervisor dispatches agents via the Agent tool and includes the skill list in the prompt text. The agent then reads the referenced SKILL.md files itself. Agent definition files list allowed skills, but the supervisor's prompt tells the agent which to load for this specific invocation. No agent file rewriting needed.</answer>
    </unknown>

    <unknown id="U-2">
      <question>Task-to-module association: Skill resolution depends on knowing which module a task targets (to look up languageId, customSkills, etc.). The PRD does not define a `moduleId` or `targetModule` field on task.json. How is a task linked to its target module?</question>
      <answer>task.json includes a targetModule field referencing a module name from modules.json. Carries forward from v1's module field in TASK.md.</answer>
    </unknown>

    <unknown id="U-3">
      <question>Multi-module skill composition: The cross-module-change archetype exists for tasks spanning multiple modules. But skill resolution (Section 9) is described for a single module. If a task targets module A (Java) and module B (TypeScript), how are skills composed? Union of both language skills? Primary module only? Separate step invocations per module?</question>
      <answer>For cross-module-change, the supervisor resolves skills per module separately. The agent receives the union of all language + custom skills from all target modules. If module A is Java and module B is TypeScript, the agent loads: nit:implement + java + typescript + (union of custom skills). The boundary-check step validates cross-module dependencies.</answer>
    </unknown>

    <unknown id="U-4">
      <question>Greenfield vs. brownfield differences: workspace.json has a mode field (greenfield/brownfield). The PRD describes brownfield analysis and language auto-detection for existing modules. What concretely differs in greenfield mode? Is module registration entirely manual? Does nit:init skip the brownfield scan?</question>
      <answer>Greenfield: no brownfield scan, no initial-state.md, modules registered manually via nit:init prompts then expanded as tasks target new paths. Language detection runs on first task targeting a new module. Brownfield: nit:init triggers brownfield scan which auto-populates modules.json.</answer>
    </unknown>

    <unknown id="U-5">
      <question>nit:clarify output scope: Section 4.1.14 says nit:clarify outputs prd/summary.json and prd/glossary.json. The current v1 nit:clarify produces CLARIFICATIONS.md interactively. Does the v2 nit:clarify replace the interactive clarification flow with JSON output, or does it do both (interactive clarification AND produce summary.json/glossary.json)?</question>
      <answer>Both. Interactive clarification stays (core value). After clarification completes, it additionally produces prd/summary.json and prd/glossary.json as structured output for downstream supervisor consumption.</answer>
    </unknown>

    <unknown id="U-6">
      <question>Step directory numbering with dynamic archetypes: Steps are shown as STEP-001-analyze, STEP-002-design, etc. But archetypes can remove steps (bugfix removes analyze) or add steps (cross-module-change adds boundary-check). Is numbering based on the resolved step list position (so bugfix starts at STEP-001-design), or is there a fixed numbering scheme per step ID?</question>
      <answer>Based on resolved step list position. Bugfix starts at STEP-001-design. The step ID (analyze, design, etc.) is in the directory name for readability, numbering is sequential within the task's resolved archetype.</answer>
    </unknown>

    <unknown id="U-7">
      <question>Repair loop limits: The PRD tracks reopenCount in state.json and describes repair flows when validation fails. Is there a maximum number of repair attempts before the system escalates to the user or halts? If not, an agent could loop indefinitely on a step it cannot fix.</question>
      <answer>config/supervisor.json includes maxReopenCount (default: 3). After exceeding the limit, the supervisor stops and escalates to the user with accumulated validation errors.</answer>
    </unknown>

    <unknown id="U-8">
      <question>Definitive schema list: Section 6 lists 17 artifact types. The directory layout shows ~13 schema files. Some artifact types are "embedded in step-output" (analysis-result, design-result, etc.). Do embedded types get their own schema files for validation, or are they validated as part of step-output.schema.json?</question>
      <answer>Embedded types validated as part of step-output.schema.json using JSON Schema composition ($defs + $ref). No separate schema files for embedded types. The ~13 standalone schema files cover all non-embedded types.</answer>
    </unknown>

    <unknown id="U-9">
      <question>Chat context (Claude.ai) support: The NFR states the system works in both Claude.ai chat and Claude Code CLI contexts. However, skills, agents, and hooks are Claude Code features not available in Claude.ai. Is Claude.ai support a real requirement for v2, or is it aspirational/deferred?</question>
      <answer>Deferred. Skills/agents/hooks are Claude Code features not available in Claude.ai. v2 targets Claude Code CLI only. Remove Claude.ai from NFRs.</answer>
    </unknown>

    <unknown id="U-10">
      <question>Phase and task creation interactivity: The PRD lists nit:phases and nit:tasks as commands. In v1 these are interactive (the agent proposes phases/tasks, user approves). Does v2 keep this interactive flow, or do these commands now produce JSON output non-interactively based on prd/summary.json?</question>
      <answer>Stays interactive. Agent proposes, user approves. JSON output (phase.json, task.json) replaces Markdown format, but interactive approval flow is preserved.</answer>
    </unknown>

    <unknown id="U-11">
      <question>Archetype selection mechanism: When creating a task, how is the archetype determined? Does the user explicitly pick it (e.g., "this is a backend-feature"), does the analyst propose it during the analyze step, or does the supervisor infer it from tags/modules?</question>
      <answer>The analyst proposes the archetype during the analyze step based on task description + target module type. Supervisor validates it's a registered archetype. User can override during the approval gate.</answer>
    </unknown>

  </unknowns>

  <risks>

    <risk id="R-1">
      <question>Claude Code dynamic skill loading: The entire layered composition model assumes skills can be dynamically composed per agent invocation. Claude Code's current model loads skills from static agent definition files. If dynamic per-invocation skill loading is not supported, the core architecture may need significant workarounds (e.g., rewriting agent files before each dispatch, or inlining skill content into prompts). Has this been validated against Claude Code's actual capabilities?</question>
      <answer>Validated. The Agent tool accepts a freeform prompt where the supervisor lists which skills to load. This is how v1 already works (orchestrator tells agents which skill to run via prompt). Dynamic composition works through prompt instructions, not static agent file rewrites.</answer>
    </risk>

    <risk id="R-2">
      <question>jq-based JSON Schema validation: The PRD specifies jq-based validation hooks as the hard guardrail layer. However, jq does not natively support JSON Schema validation ($ref, $defs, pattern, allOf/oneOf, etc.). It can check field existence and types, but full schema validation requires a dedicated tool (e.g., ajv-cli, check-jsonschema). Will the hooks use jq for structural checks only, or is a proper JSON Schema validator expected? This affects the schema complexity that can be enforced.</question>
      <answer>jq alone cannot do full JSON Schema validation. Use check-jsonschema (Python) or ajv-cli (Node) for actual schema validation in hooks. jq for structural quick-checks only. Install script verifies the validator is available.</answer>
    </risk>

    <risk id="R-3">
      <question>Global install version drift: Core nit is installed globally at ~/.claude/skills/nit/. Project state lives in .nit/. If a user updates the global core but has an older project state structure, or vice versa, there is no version compatibility check described. This could cause silent failures (schemas expecting fields the core doesn't produce, or core expecting state structures the project doesn't have).</question>
      <answer>Add nitVersion field to config/workspace.json. Supervisor checks on startup and warns on mismatch with installed core version. No auto-migration, just warning + instructions.</answer>
    </risk>

    <risk id="R-4">
      <question>Archetype inheritance depth: The PRD shows single-level inheritance (backend-feature extends base). Is multi-level inheritance supported (e.g., a custom archetype extending backend-feature which extends base)? If so, merge conflicts in step overrides could produce unexpected results. If not, this should be stated as a constraint.</question>
      <answer>Single-level inheritance only. Stated as a constraint. Multi-level creates merge complexity not worth it for 6 archetypes.</answer>
    </risk>

    <risk id="R-5">
      <question>Bun as sole distribution mechanism: The distribution model requires `bunx @nit/cli install`. Users who do not have Bun installed face a friction barrier. Was npx (Node.js) considered as an alternative or fallback? Node.js has significantly higher install-base among the target users.</question>
      <answer>Support both bunx and npx — CLI is just file-copy logic, nothing Bun-specific. Default docs show bunx but npx @nit/cli install works identically.</answer>
    </risk>

    <risk id="R-6">
      <question>LLM-generated language skills quality: Language skill SKILL.md files are auto-generated by the agent during detection. The quality, accuracy, and consistency of these generated skills depend entirely on the LLM's knowledge. There is no template, no review step, and no validation. A poorly generated language skill could degrade all subsequent steps for that module.</question>
      <answer>Mitigated by making auto-generated language skills minimal (basic idioms, naming, test runner). Users enhance via nit:add-skill or edit directly. Generated skill includes header noting it was auto-generated and may need refinement.</answer>
    </risk>

  </risks>

  <assumptions>

    <assumption id="A-1">
      <statement>The supervisor (nit:orchestrate) is itself a Claude Code skill — an LLM reading detailed instructions about how to behave deterministically. "Deterministic" means the instructions are precise and unambiguous enough for consistent behavior, not that the supervisor is implemented as programmatic code (e.g., a TypeScript state machine).</statement>
      <answer>Confirmed. Supervisor is an LLM skill with precise instructions, not a programmatic state machine.</answer>
    </assumption>

    <assumption id="A-2">
      <statement>v1 is fully replaced by v2. There is no parallel maintenance period. v1 artifacts are preserved in git history as brownfield context but are not migrated or converted to v2 format.</statement>
      <answer>Confirmed. v1 fully replaced, no parallel maintenance. v1 artifacts preserved in git history only.</answer>
    </assumption>

    <assumption id="A-3">
      <statement>All ~20 JSON schemas will be hand-authored as .schema.json files, not generated from TypeScript types, Zod schemas, or another source of truth.</statement>
      <answer>Confirmed. Hand-authored .schema.json files.</answer>
    </assumption>

    <assumption id="A-4">
      <statement>The Bun CLI package (bunx @nit/cli) is a thin file-copy wrapper. It copies skill, agent, and hook files to ~/.claude/ and does nothing else. There is no persistent Bun runtime, no background process, no server.</statement>
      <answer>Confirmed. Thin file-copy CLI, no persistent runtime.</answer>
    </assumption>

    <assumption id="A-5">
      <statement>One task targets exactly one module, except for tasks using the cross-module-change archetype which can target multiple modules.</statement>
      <answer>Confirmed. One module per task except cross-module-change archetype.</answer>
    </assumption>

    <assumption id="A-6">
      <statement>Hooks (validation) run as shell scripts invoked by Claude Code's hook system, with the same timeout and execution constraints as current v1 hooks. They are not long-running processes.</statement>
      <answer>Confirmed. Same hook constraints as v1.</answer>
    </assumption>

    <assumption id="A-7">
      <statement>The delivery phases in Section 12 (v1.1, v1.2, v1.3) are the intended implementation order, and the requirement-gathering/task breakdown should follow this phasing.</statement>
      <answer>Confirmed. v1.1 → v1.2 → v1.3 implementation order, mapped to PHASE-2, PHASE-3, PHASE-4.</answer>
    </assumption>

  </assumptions>

</clarifications>
