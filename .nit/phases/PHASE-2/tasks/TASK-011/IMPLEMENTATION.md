# Implementation — Task 11: Config and Registry Scaffolding (nit:init Rewrite)

<implementation>

  <summary>
    Rewrote `.claude/skills/init/SKILL.md` to implement the full v2 nit:init workflow. The new skill
    replaces the v1 YAML-based config approach (single `nit.yaml`) with the v2 JSON-first model that
    scaffolds 9 subdirectories and 9 JSON files across config/, registry/, and boundaries/.

    The implementation follows the three-concern split from DESIGN.md: (1) directory creation via
    `mkdir -p` for all 9 subdirectories, (2) static default file generation for 5 config and 4
    registry files with hardcoded schema-valid defaults, and (3) mode-specific boundaries work
    (greenfield: empty modules.json; brownfield: extension-heuristic language detection + modules.json
    population + SKILL.md stub generation).

    Each generated file is validated immediately after writing using `bun run ./cli/src/cli.ts validate
    --schema <type> <file>` per KD-4 and ADR-0003. All 9 default JSON payloads were verified to pass
    schema validation during implementation.

    The skill preserves the existing hooks configuration from the v1 skill (validate-init.sh git repo
    check) and retains the re-init guard pattern with explicit user confirmation before proceeding.
  </summary>

  <files-changed>
    <file action="modified">.claude/skills/init/SKILL.md</file>
  </files-changed>

  <deviations>
    S-1 minor deviation: CLI validation invocation uses `bun run ./cli/src/cli.ts validate` rather than
    `bunx nit validate` as specified in DESIGN.md KD-4. The `@nit/cli` package is not published to npm
    and is not globally linked, so `bunx nit` would fail with "package not found." Running the CLI
    directly via bun achieves the same validation behavior. The SKILL.md Rules section documents the
    `npx tsx ./cli/src/cli.ts` fallback if bun is unavailable. This deviation has no impact on schema
    validation correctness.
  </deviations>

  <tech-debt>
    None introduced. The CLI invocation pattern (direct bun run vs. bunx nit) will resolve itself when
    the @nit/cli package is published or globally linked in PHASE-4 (CLI install command). The SKILL.md
    will need a one-line update at that point to switch to `bunx nit validate`.
  </tech-debt>

  <self-check>
    - AC-1: pass — SKILL.md creates all 9 subdirectories and 9 JSON files; all defaults validated against schemas
    - AC-2: pass — workspace.json template includes name, mode, nitVersion="2.0", optional description
    - AC-3: pass — SKILL.md Steps 7a-7c define brownfield detection, modules.json population with languageId, and SKILL.md stub generation; brownfield payload validated
    - AC-4: pass — task-types.json contains all 6 concrete types with defaultArchetype fields; validated against schema
    - AC-5: pass — roles.json contains all 7 specialist roles; validated against schema
    - DoD: all criteria done; tests (schema validation) passed; code review pending reviewer; no critical tech debt
  </self-check>

</implementation>
