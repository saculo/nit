---
name: "nit:brownfield-analyze"
description: "Brownfield architectural analysis. Scans repository structure, discovers modules, detects ecosystems, analyzes architecture patterns, and writes the foundational sections of initial-state.md. Use when dispatched by the brownfield orchestrator to perform architectural analysis of an existing codebase."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

> **Arguments**: none — reads the repository directly.

# Architect Skill: Brownfield Initial-State Analysis

## Purpose

Analyze the repository's structure, discover modules, assess architecture patterns, and produce the foundational sections of `initial-state.md`. You are the first agent to touch this file — the Engineer will add implementation-level sections after you.

## How you are invoked

The Orchestrator dispatches you with the `architect-initial-state-skill`. You receive no input data — you read the repository directly.

## What you produce

You write directly to `.nit/project/initial-state.md`. You create this file and populate all Architect-owned sections. Follow the template structure defined in `initial-state-template.md`.

## Critical rules

1. **You write to `initial-state.md` directly.** Do not return analysis as conversation text.
2. **Every finding must include a confidence level** — `high`, `medium`, or `low`.
3. **Describe what IS, not what SHOULD be.** You are documenting the current state, not prescribing improvements.
4. **Do not guess versions, names, or configurations.** Read them from files. If you cannot determine something, say "not determined" with low confidence.
5. **Be technology and language agnostic.** Your analysis approach applies to any ecosystem. Do not assume specific languages or frameworks.

---

## Step 1: Module Discovery and Per-Module Analysis

### 1.1 — Identify project root and build system

Scan the repository root for build configuration files. Look for:

- Package manifests (dependency declarations, build scripts)
- Workspace/multi-module configuration files
- Lock files that indicate the package manager
- Runtime configuration files (version pinning, environment config)
- Container definitions that reveal the runtime environment

Identify:
- **Primary build system** — what tool builds this project
- **Whether this is a multi-module project** — does the build config declare sub-modules, workspaces, or workspace members?
- **Primary language(s)** — from file extensions, build tool type, and dependency declarations

**Guardrails:**
- If multiple build systems exist at the root (e.g., two different package manifests for different ecosystems), this is likely a multi-ecosystem project. Flag all detected ecosystems.
- If NO build configuration is found at the root, scan first-level subdirectories — this may be a monorepo without a root build system.
- If the project uses a container orchestration file without other build configs, scan the service directories referenced in that file.

### 1.2 — Discover modules

A **module** is an independently buildable unit with its own build configuration. It could be a library, a service, an application, a schema definition, or a shared utility — anything that has its own build file and can be built separately.

**How to discover modules:**
1. Read the root build configuration for workspace/sub-module declarations
2. Resolve any glob patterns or directory references to actual paths
3. For each discovered module, verify it has its own build configuration file
4. Record the module's path relative to the repository root

**Single-module detection:** If no workspace or multi-module configuration is found, treat the entire repository as a single module.

**Guardrails:**
- Exclude vendored/third-party directories (commonly named `vendor/`, `third_party/`, or dependency cache directories)
- Exclude build output directories (commonly named `build/`, `dist/`, `target/`, `out/`, or framework-specific output directories)
- Exclude test fixtures or example directories unless they have their own build file
- For nested modules (a module containing sub-modules), treat each unit with its own build file as a separate module
- If you are uncertain whether a directory is a module, check for a build configuration file — if it has one and can be built independently, it is a module

### 1.3 — Detect ecosystem per module

For each discovered module, determine:

| Field | How to detect |
|-------|---------------|
| **Language** | File extensions in source directories, build tool type |
| **Language version** | Build configuration, version pinning files, runtime config |
| **Framework** | Dependency declarations (look for well-known framework packages) |
| **Framework version** | Version specified in dependency declaration or lock file |
| **Build tool** | Type of build configuration file + tool version (wrapper configs, lock files) |
| **Test framework** | Test-scoped dependencies or test configuration files |
| **Runtime** | Container definitions, CI configuration, version pinning files |
| **Lint/format tools** | Dedicated config files for linters/formatters, dev dependencies |
| **Data access** | Dependencies for ORMs, query builders, database drivers |
| **Database** | Container orchestration files, connection config, migration files |
| **Messaging/events** | Dependencies for message brokers, event systems |
| **Caching** | Dependencies for cache clients, cache config |

For each field record:
- The value
- The **source** where you found it: `build-file`, `config-file`, `lock-file`, `container-file`, `ci-config`, `inferred`
- The **confidence level**: `high` (read from explicit declaration), `medium` (inferred from patterns), `low` (guessed from partial evidence)

**Guardrails:**
- Read actual version numbers from files. Do NOT output versions from memory — they will be wrong.
- If a version cannot be determined, record "version not determined" rather than guessing.
- If the ecosystem detection from the build file is ambiguous (e.g., a dependency list that could indicate multiple frameworks), flag it and state what evidence you found.

### 1.4 — Analyze architecture patterns per module

For each module, read 5-10 representative source files from key structural areas. Select files that represent the module's entry points, core logic, data access, and configuration.

Analyze the following patterns:

**Error handling approach:**
- What mechanism is used? (exceptions, result types, error codes, error objects)
- Is there a centralized error handler or is error handling distributed?
- Is error handling consistent across the module?
- Record evidence: which files you examined, what you found

**API style (if the module exposes an API):**
- What protocol/style? (REST, GraphQL, gRPC, WebSocket, message-based, CLI, none)
- Is the API style consistent?
- What request/response format is used? (JSON, Protocol Buffers, XML, etc.)
- Record evidence

**Communication types:**
- How does this module communicate with other modules or external systems?
- Synchronous (HTTP calls, direct method invocation, RPC)
- Asynchronous (message queues, event buses, pub/sub, webhooks)
- Data sharing (shared database, shared files, shared cache)
- Record each communication type with direction (inbound/outbound) and target

**Guardrails:**
- Do NOT read every file. Select a representative sample of 5-10 files from different areas of the module.
- If patterns are inconsistent across your sample, record the inconsistency: "mixed — X in most places, Y in files A and B"
- If a pattern is unclear from the sample, say "inconclusive — limited sample" rather than guessing
- Base your analysis on actual code, not just file names or import declarations

### 1.5 — Define module responsibility

Write a **2-4 sentence description** of what each module does — its primary purpose, what it produces, and what it depends on.

Focus on WHAT the module does, not HOW it does it technically.

**Guardrails:**
- Keep it short. This is an orientation summary, not documentation.
- If the module's purpose is unclear, say so: "Purpose is unclear from code inspection. May be [best guess]. Needs human clarification." Mark as low confidence.

### 1.6 — Identify integration points per module

For each module, identify how it connects to other modules and external systems.

For each integration point record:
- **Direction:** inbound (this module receives) or outbound (this module calls)
- **Mechanism:** the communication type (from Step 1.5)
- **Target:** which module or external system
- **Contract:** how the interface is defined (schema file, interface definition, config, implicit)

**Guardrails:**
- Focus on inter-module and external integrations. Internal class-to-class calls within a module are not integration points.
- Check build dependencies for internal module references
- Check config files for external system connection details
- Check dependency lists for client libraries that indicate external integrations

---

## Step 2: System-Level Analysis

Perform this step after completing all per-module analysis. This step is **only for multi-module projects (2+ modules)**. For single-module projects, skip to writing the file.

### 2.1 — Produce module dependency map

From the per-module integration points and build dependencies, produce a dependency map.

Format:
```
module-a → module-b (mechanism, dependency type)
module-a → ExternalSystem (mechanism, external)
```

Rules:
- Arrow points from dependent → dependency (A → B means A depends on B)
- Include the mechanism in parentheses
- Mark external systems clearly
- If a dependency is bidirectional, show both arrows

### 2.2 — Identify cross-cutting concerns

Review all module analyses and identify patterns that span modules:

- **Authentication/Authorization** — shared auth mechanism? Where is it enforced?
- **Logging/Observability** — shared logging approach? Tracing? Correlation IDs?
- **Shared data models** — are models shared between modules? How?
- **Configuration management** — centralized config? Per-module?
- **Deployment model** — how are modules deployed relative to each other?
- **Database sharing** — do modules share a database or schema?

Record each concern with:
- Description of current approach
- Which modules are involved
- Confidence level

### 2.3 — Define system responsibility

Write a **2-5 sentence description** of what the overall system does, based on the collective module responsibilities. Focus on: business domain, primary users/consumers, key capabilities.

**Guardrails:**
- This should read like an elevator pitch, not a technical spec
- Synthesize module responsibilities — do not repeat them individually
- If the system's purpose is unclear, say "appears to be" with low confidence

---

## Step 3: Write to initial-state.md

Write all findings to `.nit/project/initial-state.md` following the template structure. Use **top-level XML tags only** — inner content uses prose, bullets, and markdown formatting. No nested XML.

Include only Architect-owned sections:

**System-level (top of file, inside `<initial-state>`):**
- `<system-responsibility>` — prose
- `<module-index>` — markdown table
- `<dependency-map>` — list of arrows (if 2+ modules)
- `<cross-cutting-concerns>` — bold headings with prose descriptions

**Per-module (one `<module path="...">` block each):**
- `<responsibility>` — prose
- `<stack>` — bullet list with values, sources, and confidence
- `<architecture-patterns>` — bold headings for error handling, API style, communication types
- `<integration-points>` — bullet list

Leave Engineer-owned sections as placeholders with `<!-- Engineer analysis pending -->`:
- `<code-conventions>`
- `<hot-spots>`
- `<tech-debt>`
- `<toolchain>`

---

## Edge cases

### Empty or near-empty modules
If a module has very few source files, flag it as potentially:
- Newly scaffolded (not yet implemented)
- A utility/library (thin by design)
- Deprecated (should be excluded)
Ask for human clarification via low confidence and a note.

### Very large modules
For modules with a very large number of source files:
- Focus analysis on entry points, public API, and core domain
- Sample from 5-10 representative files, not exhaustive review
- Explicitly note that analysis is based on sampling

### Monorepo with shared configuration
If configuration lives at the root level and is inherited by modules:
- Note shared configuration in cross-cutting concerns
- For each module, note when it inherits vs overrides root configuration