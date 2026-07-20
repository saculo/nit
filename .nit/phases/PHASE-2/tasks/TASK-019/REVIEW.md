# Review — TASK-019: Archetype Definitions with Inheritance

<review>

  <verdict>approved</verdict>

  <criteria-check>
    <criterion id="AC-1" result="pass">base.json has `"abstract": true`. `resolveArchetype("base")` throws `Archetype "base" is abstract and cannot be used directly`. Integration test confirms exit code 1 and stderr contains both "abstract" and "cannot be used directly".</criterion>
    <criterion id="AC-2" result="pass">backend-feature.json extends base with `engineerRole: "backend-engineer"`. Resolver produces 5 steps (analyze, design, implement, review, qa) with implement.role = "backend-engineer". Both unit and integration tests verify step count, order, and role replacement.</criterion>
    <criterion id="AC-3" result="pass">bugfix.json extends base with `engineerRole: "$detect"`, removes analyze, sets design.approval to false. Resolver produces 4 steps (design, implement, review, qa), design.approval=false, implement.role="$detect", engineerRole="$detect". Unit and integration tests verify all properties.</criterion>
    <criterion id="AC-4" result="pass">cross-module-change.json extends base with addSteps inserting boundary-check after implement. Resolver produces 6 steps in exact order: analyze, design, implement, boundary-check, review, qa. Both unit and integration tests verify step count and order.</criterion>
    <criterion id="AC-5" result="pass">Resolver loads the parent and checks `parent.extends` — if present, throws `Single-level inheritance only: "X" extends "Y", which itself extends "Z"`. Integration test creates a temp archetype extending backend-feature (which extends base) and confirms the rejection. Cleanup via try/finally.</criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All 5 acceptance criteria passed</item>
    <item id="DOD-2" result="pass">44 tests across 4 files, 0 failures. Tests cover all AC with meaningful assertions on step counts, step order, role values, approval flags, exit codes, and error messages.</item>
    <item id="DOD-3" result="pass">Code review completed (this review)</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced. Per-invocation Ajv2020 instantiation is acknowledged minor tech debt carried forward from TASK-009.</item>
  </dod-check>

  <architecture-conformance result="pass">
    All 6 key decisions from DESIGN.md followed:

    - KD-1: Archetypes live in cli/archetypes/ as static JSON files, mirroring the cli/schemas/ pattern.
    - KD-2: Resolver is a pure-function module (archetype-resolver.ts) with exported functions: loadArchetype, validateArchetype, replacePlaceholders, applyOverrides, resolveArchetype. No side effects.
    - KD-3: $engineer replaced with engineerRole value; $detect preserved as-is. Lines 95-102 of archetype-resolver.ts implement this correctly.
    - KD-4: Override application order is removeSteps → step modifications → addSteps (lines 116-143). Verified by the compound override test in archetype-resolver.test.ts.
    - KD-5: validateArchetype loads archetype.schema.json via the existing schema-resolver and validates with Ajv2020 before resolution.
    - KD-6: Output is a ResolvedArchetype with flat steps array, engineerRole, and rejectionRouting — no inheritance metadata.

    One deviation noted: archetype.schema.json was updated from TASK-009's original structure (steps with id/type/role/required/description, rejectionRouting with targetStep/maxRetries) to match the PRD's actual structure (steps with id/role/approval, rejectionRouting as step-to-step map). This is a justified correction — the TASK-009 schema was a placeholder that didn't match the PRD's archetype model. Documented in IMPLEMENTATION.md.
  </architecture-conformance>

  <security-check result="pass">
    No security issues. All file paths are derived from internal constants (ARCHETYPES_DIR, SCHEMA_DIR). The archetype name from CLI args is used only to construct a filename within the fixed archetypes/ directory. No path traversal risk — Bun.file resolves the join'd path. No network access, no secrets, no user-controlled data beyond the archetype name.
  </security-check>

  <test-quality result="pass">
    AC-to-test mapping:

    - AC-1: archetype-resolver.test.ts "rejects abstract archetype" + archetype-command.test.ts "rejects abstract base archetype with exit code 1"
    - AC-2: archetype-resolver.test.ts "resolves backend-feature with 5 steps and replaced engineer role" + archetype-command.test.ts "resolves backend-feature with 5 steps and backend-engineer role"
    - AC-3: archetype-resolver.test.ts "resolves bugfix with 4 steps, design approval false, $detect role" + archetype-command.test.ts "resolves bugfix with 4 steps, design approval false, $detect role"
    - AC-4: archetype-resolver.test.ts "resolves cross-module-change with 6 steps including boundary-check" + archetype-command.test.ts "resolves cross-module-change with 6 steps including boundary-check after implement"
    - AC-5: archetype-command.test.ts "resolver rejects multi-level inheritance"

    Every AC has both unit-level and integration-level coverage. Assertions are specific: step counts, step ID arrays, individual role/approval values, exit codes, error message substrings. Edge cases covered: non-existent archetype, missing CLI args, anchor-not-found for addSteps, immutability of input steps. Tests are deterministic; the AC-5 temp file uses try/finally for cleanup.
  </test-quality>

  <scope-check result="pass">
    All changes within cli/ (@nit/cli module). Files changed: 1 modified schema, 7 new archetype JSON files, 2 new TypeScript modules (resolver + command), 1 modified CLI entry point, 2 new test files. No files outside the module. No features beyond AC requirements. The archetype.schema.json modification is within scope as it was an existing schema that needed correction to match the PRD.
  </scope-check>

  <convention-guards>
    <guard description="TypeScript strict mode" result="pass">tsconfig.json has "strict": true; all new code type-safe with explicit interfaces</guard>
    <guard description="ESM module system" result="pass">All imports use ESM syntax; package.json type: "module"</guard>
    <guard description="Bun-native (no build step)" result="pass">No dist/ directory; CLI runs from .ts source</guard>
    <guard description="Command pattern consistency" result="pass">archetype.ts follows the same pattern as validate.ts: exported async function returning exit code, registered in cli.ts switch</guard>
    <guard description="Schema naming convention" result="pass">archetype.schema.json follows {name}.schema.json pattern</guard>
    <guard description="Archetype data matches PRD" result="pass">All 7 archetype JSON files match PRD Section 4.1.2 examples exactly</guard>
  </convention-guards>

  <findings>
    - [note] archetype.schema.json was reworked from the TASK-009 placeholder structure to match PRD Section 4.1.2. This is a necessary correction, not scope creep.
    - [note] The `validateArchetype` function uses `require()` for synchronous schema loading (line 74), while the rest of the codebase uses `Bun.file().json()`. Both work in Bun; `require()` is simpler for synchronous contexts. Minor style inconsistency, does not warrant rework.
    - [suggestion] Rejection routing cleanup removes entries whose KEY is a removed step, but does not verify that routing TARGETS still reference valid steps. Current data has no dangling target references, but a future archetype that removes a step used as a target could produce invalid routing. Consider adding a validation pass after resolution in a future task.
    - [suggestion] The AC-5 integration test writes a temp file into the actual archetypes/ directory. If the test process is killed before cleanup, a stale `multi-level-test.json` would remain. The try/finally mitigates this; an alternative would be testing via the resolver function directly with mock data (which is already partially done in the unit tests). Not blocking.
  </findings>

  <pr-url>https://github.com/saculo/nit/pull/11</pr-url>

</review>
