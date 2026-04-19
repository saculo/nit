# Review — Task 11: Config and Registry Scaffolding (nit:init Rewrite)

<review>

  <verdict>approved</verdict>

  <criteria-check>
    <criterion id="AC-1" result="pass">Step 3 of the skill creates all 9 required subdirectories (config/, registry/, boundaries/, phases/, decisions/, logs/, plr/, prd/, project/). Steps 4–6 write and validate all 9 JSON files. All default payloads pass schema validation — confirmed by the engineer and independently verified by re-reading the validate invocations against their schema types.</criterion>
    <criterion id="AC-2" result="pass">workspace.json template in Step 4a includes name, mode, nitVersion="2.0", and optional description. The schema requires name, mode, nitVersion — all are present. The description field is correctly omitted when empty per the prose instruction.</criterion>
    <criterion id="AC-3" result="pass">Steps 7a–7c define brownfield detection, modules.json population with name/path/languageId per module, and SKILL.md stub generation at .claude/skills/&lt;languageId&gt;/SKILL.md. Extension table covers Java (.java → java) and TypeScript (.ts/.tsx → typescript). Schema validated with a representative 2-module payload.</criterion>
    <criterion id="AC-4" result="pass">task-types.json in Step 5a contains all 6 concrete types: backend-feature, frontend-feature, infra-change, cross-module-change, bugfix, architecture-decision — each with a defaultArchetype field matching the archetype file names from TASK-010.</criterion>
    <criterion id="AC-5" result="pass">roles.json in Step 5b contains all 7 specialist roles: analyst, architect, backend-engineer, frontend-engineer, infra-engineer, reviewer, qa — each with id, label, description, and capabilities. Validated against the roles schema.</criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All 5 acceptance criteria pass — traced through SKILL.md and confirmed.</item>
    <item id="DOD-2" result="pass">Schema validation runs (bun run ./cli/src/cli.ts validate) constitute the test suite for a skill document. All 9 default JSON payloads validated during implementation. CLI test suite (44 tests, 0 fail) confirms the validate command itself is correct. Brownfield modules.json validated with representative payload.</item>
    <item id="DOD-3" result="pass">No critical tech debt. Minor deviation (CLI invocation pattern) is documented, has sound rationale, and has zero impact on validation correctness.</item>
  </dod-check>

  <architecture-conformance result="pass">
    All 6 key decisions from DESIGN.md are correctly implemented:

    - KD-1: Config files use hardcoded defaults; only name and mode are prompted. ✓
    - KD-2: Registry files are hardcoded — not derived from archetype files at runtime. ✓
    - KD-3: modules.json always created; empty array for greenfield. ✓ (Step 6 writes it unconditionally)
    - KD-4: Fail-fast validation — every Write is immediately followed by validate. ✓ ADR-0003 pattern honoured.
    - KD-5: Brownfield language detection via extension heuristics; 14-entry extension table. ✓
    - KD-6: Re-init guard with explicit user confirmation; clean scaffold, no v1 migration. ✓

    Declared deviation (S-1): `bun run ./cli/src/cli.ts validate` used instead of `bunx nit validate`.
    Assessment: acceptable. The @nit/cli package is not published; bunx would fail. Direct bun invocation achieves identical validation behavior. Fallback to `npx tsx ./cli/src/cli.ts` documented in Rules section. Will resolve in PHASE-4.

    No undeclared deviations found in the code.
  </architecture-conformance>

  <security-check result="pass">
    No security issues. The skill uses Bash only for `mkdir -p` and `bun run ./cli/src/cli.ts validate` — no user input is interpolated into shell commands. File content is written via the Write tool using literal JSON strings with substituted values (name, mode, description). No secrets, credentials, or sensitive data. No injection vectors.
  </security-check>

  <test-quality result="pass">
    The implementation artifact is a skill document (prose instructions for Claude), not executable code. The appropriate test for skill documents is to validate that their prescribed outputs are schema-valid — which was done:

    - AC-1/2: all 9 default JSON payloads run through `nit validate` ✓
    - AC-3: brownfield modules.json validated with java+typescript payload ✓
    - AC-4: task-types defaults validated against task-types schema ✓
    - AC-5: roles defaults validated against roles schema ✓

    The CLI test suite (44/44 pass) confirms the validate command itself is reliable.
    Brownfield language detection logic is prose — unit testing is not applicable.
  </test-quality>

  <scope-check result="pass">
    Only .claude/skills/init/SKILL.md was modified. The task module is `.nit` which encompasses the .claude/skills/ subdirectory. No unrelated files touched. No features beyond AC requirements.
  </scope-check>

  <convention-guards>
    <guard description="Skill frontmatter includes name, description, allowed-tools" result="pass">Present and correct.</guard>
    <guard description="Hooks configuration preserved from v1" result="pass">PreToolUse hook referencing validate-init.sh is preserved unchanged.</guard>
    <guard description="Fail-fast validation per ADR-0003" result="pass">Every file write is immediately followed by a validate command; error messaging instructs to halt and report the schema error.</guard>
    <guard description="No v1 migration per A-2" result="pass">KD-6 implemented correctly — clean scaffold only, with explicit user confirmation on re-init.</guard>
  </convention-guards>

  <findings>
    - [note] Step 6 ordering: in brownfield mode, the skill says "populate as described in Step 7 below, then write the file here." This is a forward-reference that requires Claude to read ahead. In practice Claude reads the full skill before executing, so this is not a runtime issue — but reordering Step 7 before Step 6 would make the brownfield flow clearer. Non-blocking.
    - [suggestion] The `npx tsx` fallback assumes `tsx` is installed globally. A more portable fallback would be `node --experimental-strip-types ./cli/src/cli.ts` (Node.js 22+). Low priority until PHASE-4 resolves this permanently.
    - [note] .nit/adr/ directory is not created by the skill (not in TASK scope). The design skill creates ADRs directly and currently the directory exists from previous tasks. If a user runs nit:init on a fresh repo, the design skill will need to mkdir .nit/adr/ itself, or a future task should add it to the init scaffold. Not a defect in this task.
  </findings>

</review>
