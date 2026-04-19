---
name: "nit:init"
description: "Initialize the nit workspace. Creates .nit/ directory structure, config file with project mode (greenfield/brownfield), and optionally triggers brownfield analysis. Use when the user says '/nit:init', 'initialize nit', 'setup nit', or at the very start of a new nit project."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
hooks:
  PreToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-init.sh"
          timeout: 10
---

> **Arguments**: `/nit:init` — no arguments required.

# nit:init — v2 Workspace Scaffolding

Initialize the `.nit/` workspace with all v2 config, registry, and boundaries files.

---

## Step 1 — Re-init Guard

Check if `.nit/` already exists with content:

```bash
ls .nit/ 2>/dev/null
```

If `.nit/` exists and is non-empty, warn the user:

> `.nit/` workspace already exists. Re-initializing will perform a **clean scaffold** — v1 artifacts will not be migrated and existing config will be replaced.
> Type **yes** to continue, or **no** to cancel.

If the user does not confirm, stop immediately.

---

## Step 2 — Gather Project Info

Ask the user:

1. **Project name** — short identifier (e.g., `my-service`). Required.
2. **Mode** — `greenfield` (new project, no existing code) or `brownfield` (existing codebase). Auto-detect if possible:
   - If the repo has source files beyond scaffolding/config → suggest `brownfield`
   - If the repo is empty or only has initial scaffolding → suggest `greenfield`
   - Always confirm with the user.
3. **Description** (optional) — one-sentence project description.

Store these as variables for use in the steps below:
- `PROJECT_NAME` — the project name
- `PROJECT_MODE` — `greenfield` or `brownfield`
- `PROJECT_DESCRIPTION` — the description (may be empty)

---

## Step 3 — Create Directory Structure

Create all required `.nit/` subdirectories:

```bash
mkdir -p .nit/config
mkdir -p .nit/registry
mkdir -p .nit/boundaries
mkdir -p .nit/phases
mkdir -p .nit/decisions
mkdir -p .nit/logs
mkdir -p .nit/plr
mkdir -p .nit/prd
mkdir -p .nit/project
```

---

## Step 4 — Write and Validate Config Files

Write each file, then immediately validate it. If validation fails, **stop and surface the exact error** to the user. Do not write subsequent files.

Validate each file with:
```bash
bun run ./cli/src/cli.ts validate --schema <type> <file>
```
If `bun` is not available, fall back to:
```bash
npx tsx ./cli/src/cli.ts validate --schema <type> <file>
```

### 4a — workspace.json

Write `.nit/config/workspace.json`:

```json
{
  "name": "<PROJECT_NAME>",
  "mode": "<PROJECT_MODE>",
  "nitVersion": "2.0",
  "description": "<PROJECT_DESCRIPTION>"
}
```

If `PROJECT_DESCRIPTION` is empty, omit the `description` field entirely.

Validate:
```bash
bun run ./cli/src/cli.ts validate --schema workspace .nit/config/workspace.json
```

### 4b — supervisor.json

Write `.nit/config/supervisor.json`:

```json
{
  "maxReopenCount": 3,
  "autoAdvance": {
    "enabled": false,
    "requireApproval": true
  }
}
```

Validate:
```bash
bun run ./cli/src/cli.ts validate --schema supervisor .nit/config/supervisor.json
```

### 4c — validation.json

Write `.nit/config/validation.json`:

```json
{
  "strictMode": false,
  "schemas": {
    "enabled": true
  },
  "policies": []
}
```

Validate:
```bash
bun run ./cli/src/cli.ts validate --schema validation-config .nit/config/validation.json
```

### 4d — role-routing.json

Write `.nit/config/role-routing.json`:

```json
{
  "rules": [
    { "role": "analyst",          "skills": ["clarify", "create-tasks", "phase-plan"] },
    { "role": "architect",        "skills": ["design", "phase-plan"] },
    { "role": "backend-engineer", "skills": ["implement"] },
    { "role": "frontend-engineer","skills": ["implement"] },
    { "role": "infra-engineer",   "skills": ["implement"] },
    { "role": "reviewer",         "skills": ["task-review"] },
    { "role": "qa",               "skills": ["implement"] }
  ]
}
```

Validate:
```bash
bun run ./cli/src/cli.ts validate --schema role-routing .nit/config/role-routing.json
```

### 4e — adr-triggers.json

Write `.nit/config/adr-triggers.json`:

```json
{
  "triggers": [
    {
      "id": "new-library",
      "condition": "A new external library or framework is added to the project",
      "template": "madr",
      "enabled": true
    },
    {
      "id": "architecture-change",
      "condition": "A significant architectural change is proposed that affects multiple modules",
      "template": "madr",
      "enabled": true
    },
    {
      "id": "cross-module-boundary",
      "condition": "A new cross-module dependency is introduced",
      "template": "madr",
      "enabled": true
    },
    {
      "id": "data-schema-change",
      "condition": "A breaking change to a shared data schema is proposed",
      "template": "madr",
      "enabled": true
    }
  ]
}
```

Validate:
```bash
bun run ./cli/src/cli.ts validate --schema adr-triggers .nit/config/adr-triggers.json
```

---

## Step 5 — Write and Validate Registry Files

Same fail-fast validation pattern: validate each file immediately after writing.

### 5a — task-types.json

Write `.nit/registry/task-types.json`:

```json
{
  "types": [
    {
      "id": "backend-feature",
      "label": "Backend Feature",
      "description": "Server-side logic, APIs, services, and data processing",
      "defaultArchetype": "backend-feature"
    },
    {
      "id": "frontend-feature",
      "label": "Frontend Feature",
      "description": "UI components, client-side logic, and styling",
      "defaultArchetype": "frontend-feature"
    },
    {
      "id": "infra-change",
      "label": "Infrastructure Change",
      "description": "CI/CD, deployment, containerization, and environment setup",
      "defaultArchetype": "infra-change"
    },
    {
      "id": "cross-module-change",
      "label": "Cross-Module Change",
      "description": "Changes that span multiple modules or module boundaries",
      "defaultArchetype": "cross-module-change"
    },
    {
      "id": "bugfix",
      "label": "Bug Fix",
      "description": "Defect correction in existing functionality",
      "defaultArchetype": "bugfix"
    },
    {
      "id": "architecture-decision",
      "label": "Architecture Decision",
      "description": "Significant design decision requiring an Architecture Decision Record",
      "defaultArchetype": "architecture-decision"
    }
  ]
}
```

Validate:
```bash
bun run ./cli/src/cli.ts validate --schema task-types .nit/registry/task-types.json
```

### 5b — roles.json

Write `.nit/registry/roles.json`:

```json
{
  "roles": [
    {
      "id": "analyst",
      "label": "Analyst",
      "description": "Clarifies requirements, creates tasks, and manages the backlog",
      "capabilities": ["clarify", "create-tasks", "phase-plan"]
    },
    {
      "id": "architect",
      "label": "Architect",
      "description": "Designs systems, makes architecture decisions, and writes ADRs",
      "capabilities": ["design", "adr", "phase-plan"]
    },
    {
      "id": "backend-engineer",
      "label": "Backend Engineer",
      "description": "Implements server-side features, APIs, and services",
      "capabilities": ["implement", "test"]
    },
    {
      "id": "frontend-engineer",
      "label": "Frontend Engineer",
      "description": "Implements UI components and client-side logic",
      "capabilities": ["implement", "test"]
    },
    {
      "id": "infra-engineer",
      "label": "Infrastructure Engineer",
      "description": "Manages CI/CD pipelines, deployment, and environment configuration",
      "capabilities": ["implement", "deploy"]
    },
    {
      "id": "reviewer",
      "label": "Reviewer",
      "description": "Validates implementation against acceptance criteria and project standards",
      "capabilities": ["review", "approve"]
    },
    {
      "id": "qa",
      "label": "QA Engineer",
      "description": "Implements test suites and validates quality and coverage",
      "capabilities": ["test", "validate"]
    }
  ]
}
```

Validate:
```bash
bun run ./cli/src/cli.ts validate --schema roles .nit/registry/roles.json
```

### 5c — skills.json

Write `.nit/registry/skills.json`:

```json
{
  "globalCustomSkills": [],
  "moduleSkills": []
}
```

Validate:
```bash
bun run ./cli/src/cli.ts validate --schema skills-registry .nit/registry/skills.json
```

### 5d — artifact-types.json

Write `.nit/registry/artifact-types.json`:

```json
{
  "types": [
    { "id": "source-code",    "label": "Source Code",          "description": "Production source code files",                            "filePattern": "src/**/*" },
    { "id": "test",           "label": "Test",                 "description": "Test files and test suites",                              "filePattern": "**/*.test.*" },
    { "id": "config",         "label": "Configuration",        "description": "Application and build configuration files",               "filePattern": "**/*.config.*" },
    { "id": "schema",         "label": "Schema",               "description": "JSON Schema, Avro, Protobuf, or similar schema files",    "filePattern": "**/*.schema.*" },
    { "id": "migration",      "label": "Migration",            "description": "Database migration scripts",                              "filePattern": "**/migrations/**/*" },
    { "id": "api-spec",       "label": "API Specification",    "description": "OpenAPI, AsyncAPI, or similar API specification files",   "filePattern": "**/*api*spec*" },
    { "id": "infrastructure", "label": "Infrastructure",       "description": "Infrastructure-as-code files (Terraform, Helm, etc.)",   "filePattern": "infra/**/*" },
    { "id": "dockerfile",     "label": "Dockerfile",           "description": "Container image definitions",                             "filePattern": "**/Dockerfile*" },
    { "id": "ci-pipeline",    "label": "CI Pipeline",          "description": "CI/CD pipeline definitions",                             "filePattern": ".github/**/*" },
    { "id": "documentation",  "label": "Documentation",        "description": "Markdown or other documentation files",                   "filePattern": "docs/**/*" },
    { "id": "adr",            "label": "ADR",                  "description": "Architecture Decision Records",                          "filePattern": ".nit/adr/**/*" },
    { "id": "task",           "label": "Task",                 "description": "nit task definition files (TASK.md)",                    "filePattern": ".nit/phases/**/TASK.md" },
    { "id": "design",         "label": "Design",               "description": "nit task design documents (DESIGN.md)",                  "filePattern": ".nit/phases/**/DESIGN.md" },
    { "id": "implementation", "label": "Implementation",       "description": "nit implementation summary files (IMPLEMENTATION.md)",   "filePattern": ".nit/phases/**/IMPLEMENTATION.md" },
    { "id": "review",         "label": "Review",               "description": "nit code review documents (REVIEW.md)",                  "filePattern": ".nit/phases/**/REVIEW.md" },
    { "id": "step-plan",      "label": "Step Plan",            "description": "nit implementation step tracking files (STEPS.md)",      "filePattern": ".nit/phases/**/STEPS.md" },
    { "id": "dependency",     "label": "Dependency Manifest",  "description": "Package and dependency manifests",                       "filePattern": "**/package.json" },
    { "id": "environment",    "label": "Environment Config",   "description": "Environment variable configuration files",               "filePattern": "**/.env*" },
    { "id": "script",         "label": "Script",               "description": "Build, utility, or automation scripts",                  "filePattern": "scripts/**/*" },
    { "id": "asset",          "label": "Static Asset",         "description": "Static assets (images, fonts, icons, etc.)",             "filePattern": "public/**/*" }
  ]
}
```

Validate:
```bash
bun run ./cli/src/cli.ts validate --schema artifact-types .nit/registry/artifact-types.json
```

---

## Step 6 — Write and Validate boundaries/modules.json

Write `.nit/boundaries/modules.json`:

**Greenfield mode:**
```json
{
  "modules": []
}
```

**Brownfield mode:** populate as described in Step 7 below, then write the file here.

Validate after writing:
```bash
bun run ./cli/src/cli.ts validate --schema modules .nit/boundaries/modules.json
```

---

## Step 7 — Brownfield: Language Detection and Skill Stubs

**Skip this step entirely in greenfield mode.**

In brownfield mode:

### 7a — Detect Modules and Languages

Scan the repository for directories containing source files. A directory qualifies as a module candidate if it contains ≥ 5 source files with recognized extensions, or has a build manifest (`package.json`, `pom.xml`, `build.gradle`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `requirements.txt`, etc.).

Use file extensions to assign a `languageId`:

| Extensions | languageId |
|---|---|
| `.ts`, `.tsx` | `typescript` |
| `.js`, `.jsx`, `.mjs`, `.cjs` | `javascript` |
| `.java` | `java` |
| `.py` | `python` |
| `.go` | `go` |
| `.rs` | `rust` |
| `.cs` | `csharp` |
| `.rb` | `ruby` |
| `.php` | `php` |
| `.swift` | `swift` |
| `.kt`, `.kts` | `kotlin` |
| `.sh`, `.bash` | `shell` |
| `.tf`, `.hcl` | `terraform` |
| `.yaml`, `.yml` | `yaml` |

If a directory contains files in multiple languages, use the language with the most files.

Exclude: `.nit/`, `.claude/`, `node_modules/`, `vendor/`, `dist/`, `build/`, `target/`, `.git/`.

### 7b — Populate modules.json

Write `.nit/boundaries/modules.json` with the detected modules:

```json
{
  "modules": [
    {
      "name": "<directory-name>",
      "path": "<relative-path-from-repo-root>",
      "languageId": "<detected-language>"
    }
  ]
}
```

Then validate:
```bash
bun run ./cli/src/cli.ts validate --schema modules .nit/boundaries/modules.json
```

### 7c — Generate Language Skill Stubs

For each unique `languageId` found, generate a minimal stub at `.claude/skills/<languageId>/SKILL.md`:

```markdown
---
name: "nit:<languageId>"
description: "Language-specific conventions and patterns for <languageId> modules. AUTO-GENERATED by nit:init — refine before first use."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# <languageId> Skill — AUTO-GENERATED

> **This file was auto-generated by `nit:init` and requires refinement.**
> Edit it to add project-specific conventions, patterns, and tooling details.

## Language

`<languageId>`

## Conventions

<!-- TODO: Document language-specific coding conventions for this project -->

## Tooling

<!-- TODO: List build tools, linters, formatters, and test runners -->

## Patterns

<!-- TODO: Document architectural patterns used in <languageId> modules -->

## Notes

<!-- TODO: Add any project-specific notes for working with <languageId> code -->
```

---

## Step 8 — Display Completion Summary

Display a confirmation message to the user:

```
nit workspace initialized successfully.

  Mode:    <greenfield|brownfield>
  Version: 2.0

  Config files created:
    .nit/config/workspace.json
    .nit/config/supervisor.json
    .nit/config/validation.json
    .nit/config/role-routing.json
    .nit/config/adr-triggers.json

  Registry files created:
    .nit/registry/task-types.json
    .nit/registry/roles.json
    .nit/registry/skills.json
    .nit/registry/artifact-types.json

  Boundaries:
    .nit/boundaries/modules.json   (<N> modules detected)

  All files validated against their schemas.
```

**If greenfield mode:**
```
Next steps:
  1. /nit:clarify <path-to-prd>   — clarify your PRD with the analyst
  2. /nit:phases                   — break the PRD into delivery phases
```

**If brownfield mode:**
```
  Language skill stubs generated:
    .claude/skills/<lang>/SKILL.md  (for each detected language)
    ⚠ These stubs require refinement before first use.

Next steps:
  1. /nit:brownfield-orchestrate   — run full codebase analysis (initial-state.md)
  2. Review .nit/boundaries/modules.json and correct any misdetected modules
  3. Refine .claude/skills/<lang>/SKILL.md for each language
  4. /nit:clarify <path-to-prd>    — clarify your PRD with the analyst
```

---

## Rules

- Always ask the user to confirm project mode — do not assume
- Do not overwrite existing `.nit/` content without explicit user confirmation
- Validate every generated file immediately after writing — halt on the first failure
- If validation fails, tell the user: "Validation failed for `<file>`: `<error>`. Fix the issue and re-run `/nit:init`."
- Do not auto-trigger brownfield orchestration — only inform the user to run it
- In brownfield mode, tell the user that skill stubs require refinement before use
- v1 `.nit/` artifacts are not migrated — clean scaffold only (A-2)
- If `bun` is not available, fall back to `npx tsx ./cli/src/cli.ts`
