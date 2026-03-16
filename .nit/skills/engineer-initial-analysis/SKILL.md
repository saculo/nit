---
name: "nit:brownfield-snapshot"
description: "Brownfield implementation-level analysis. Analyzes code conventions, hot spots, technical debt, and toolchain per module. Adds Engineer-owned sections to initial-state.md after the Architect's structural analysis. Use when dispatched by the brownfield orchestrator to perform implementation analysis."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

> **Arguments**: none — reads `.nit/project/initial-state.md` and the repository directly.

# Engineer Skill: Brownfield Initial-State Analysis

## Purpose

Analyze each module's implementation details — code conventions, hot spots, technical debt, and toolchain. You are the second agent to work on `initial-state.md` — the Architect has already written the structural analysis. You add implementation-level sections.

## How you are invoked

The Orchestrator dispatches you with the `engineer-initial-state-skill` after the human has reviewed and accepted the Architect's output.

## Input

Read `.nit/project/initial-state.md` — this file was written by the Architect and contains:
- Module index with paths and ecosystems
- Per-module stack, architecture patterns, responsibilities, integration points

Use the **ecosystem identified by the Architect** for each module to guide your analysis.

## What you produce

You add your sections directly to the existing `.nit/project/initial-state.md` file. Replace the `<!-- Engineer analysis pending -->` placeholders with your analysis.

**You own these sections per module:**
- `<code-conventions>`
- `<hot-spots>`
- `<tech-debt>`
- `<toolchain>`

**You also add the system-wide section:**
- `<tech-debt-summary>`

## Critical rules

1. **You write directly to `initial-state.md`.** Replace the Engineer placeholders — do not create a separate file.
2. **Every finding must include a confidence level** — `high`, `medium`, or `low`.
3. **Describe what IS, not what SHOULD be.** Document current conventions and state, not prescriptions.
4. **Do not guess.** If you cannot determine something from files, say "not determined."
5. **Do not duplicate the Architect's work.** The stack, architecture patterns, and responsibilities are already written. Do not repeat or contradict them.
6. **Be technology and language agnostic in your approach.** Your analysis process applies to any ecosystem.

---

## Per-Module Analysis

For each module listed in `<module-index>`, perform the following analysis.

### Step E1 — Analyze code conventions

Read 8-12 representative source files from different areas of the module.

**Select files from:**
- 2-3 core business logic files
- 2-3 API/interface files (entry points, handlers, endpoints)
- 2-3 data access files (queries, data layer, storage)
- 1-2 utility/helper files

**Analyze the following:**

**Naming conventions:**
- How are types/classes named? (casing, suffixes, prefixes)
- How are functions/methods named? (casing, verb patterns)
- How are variables named? (casing, descriptiveness)
- How are files and directories named? (casing, separators)
- How are test files named? (suffix patterns, test method naming)
- Is naming consistent across the module?

**Import/dependency conventions (basics):**
- Is there a consistent import ordering pattern?
- Are there notable import patterns specific to the ecosystem? (barrel exports, static imports, alias paths)

**Code structure conventions:**
- What is the typical file length? (approximate range)
- What is the typical function/method length? (approximate range)
- How many concerns does a typical file handle? (single responsibility adherence)
- Are abstractions used? (interfaces, abstract types, contracts between layers)
- How is nullability handled? (optional types, null checks, assertions, nullable annotations)
- How is immutability handled? (final/readonly/const usage, mutable vs immutable patterns)

For each convention, record:
- What the convention is (concise — one line)
- Confidence level
- Evidence: how many files you observed it in out of your sample (e.g., "8/10 sampled files")

**Guardrails:**
- Base conventions on what the MAJORITY of files do (>60%). If 7/10 files follow a pattern, that's the convention. Note the exceptions as inconsistencies.
- If there is no consistent convention (close to 50/50), record: "No consistent convention — mixed usage" with medium confidence.
- Do NOT invent conventions you didn't observe. If the sample is too small, say so.
- Read actual code, not just file headers or import declarations.

### Step E2 — Identify hot spots

Hot spots are areas of the codebase that are risky, complex, fragile, or likely to cause problems during future changes. Identify them through code analysis.

**Indicators to look for:**

**Complexity hot spots:**
- Unusually large files (significantly above the module's typical file length)
- Unusually long functions/methods
- Types/classes with a very large number of methods or fields
- Deeply nested control flow
- Files with a high number of internal dependencies (many imports from within the module)

**Fragility hot spots:**
- God objects — one type that handles too many concerns
- Tight coupling — circular references, direct implementation dependencies instead of abstractions
- Hardcoded values — connection strings, credentials, magic numbers, feature flags as constants
- Global mutable state — shared mutable objects, static mutable fields

**Change-risk hot spots:**
- Business-critical code paths (payment, auth, data mutation, external API integration)
- Code without corresponding test files (check if source files have matching test files)
- Code with complex conditional logic

**How to detect without reading every file:**
1. Look at file sizes — investigate the largest files in each source directory
2. Compare source directories against test directories — which source files lack corresponding tests?
3. Look for files that are imported/referenced by many other files — high fan-in indicates a potential hot spot
4. Check for common anti-pattern file names (names that suggest grab-bag responsibilities like "Utils", "Helper", "Manager", "Common", "Misc")

**Record each hot spot:**
- File path
- Hot spot type: `complexity`, `fragility`, or `change-risk`
- Evidence: what specifically makes this a hot spot
- Risk assessment: why this matters for future changes
- Confidence level

**Guardrails:**
- Not every large file is a hot spot. Auto-generated files, configuration files, or legitimate data mappers may be large by design.
- Focus on hot spots that would affect future development — files that new tasks are likely to touch.
- Limit to **top 5-10 hot spots per module**. More than that is noise.
- If you find 0 hot spots, that's fine — say "No significant hot spots identified in code sample" with medium confidence.

### Step E3 — Catalog technical debt

Identify technical debt — things that work but create friction, risk, or maintenance burden. Categorize each item.

**Debt categories:**

**Dependency debt:**
- Deprecated or severely outdated dependencies (2+ major versions behind)
- Unnecessary or unused dependencies
- Conflicting dependency versions across modules
- Dependencies with known security issues (if detectable from version + name)

**Code quality debt:**
- Dead code (unreferenced types, unused exports, commented-out code blocks)
- Duplicated logic across files
- Inconsistent error handling (some paths use one pattern, others use a different one)
- Missing input validation on public interfaces
- Suppressed warnings or linting rule overrides

**Test debt:**
- Missing test coverage for critical paths
- No integration or end-to-end tests
- Test files that are stubs (empty tests, skipped/disabled tests)
- No test infrastructure at all (flag as high priority)

**Architectural debt:**
- Circular dependencies between packages or modules
- Layer violations (bypassing the intended architecture layers)
- Mixed concerns in a single type (business logic + transport + data access)
- Outdated patterns (using an older approach when the framework version supports a better one)
- Missing abstractions (direct third-party usage without a wrapper where coupling is risky)

**Infrastructure debt:**
- Hardcoded configuration values
- Missing health checks or readiness probes
- No graceful shutdown handling
- Missing or outdated container definitions
- No CI/CD pipeline configuration

**Record each debt item:**
- Category (from the list above)
- Module path
- Severity: `high` (blocks or hinders development, security risk), `medium` (creates friction, should address), `low` (minor, nice-to-fix)
- Specific evidence: what exactly is the issue, where is it
- Confidence level

**Also collect self-documented debt:** TODO, FIXME, HACK, and similar markers in the code. Count them and list the most significant ones.

**Guardrails:**
- Be specific. "Code needs refactoring" is useless. Name the file, describe the problem, explain the impact.
- Do NOT flag intentional design choices as debt. If a pattern is used consistently and deliberately, it's a convention, not debt.
- Distinguish between "technically outdated but working fine" (low) and "causing real problems" (high).
- Limit to **top 10-15 debt items per module**. Prioritize by severity.
- If a module is clean, say so. Do not invent debt.

### Step E4 — Document toolchain

Record the practical commands for building, testing, linting, and running the module.

**Record:**
- Build command and build configuration file
- Test command (all tests)
- Test command (unit tests only, if separated)
- Test command (integration tests, if separated)
- Lint command
- Format command
- Run/start command (for service/application modules)
- Runtime dependencies needed to run (databases, message brokers, other services)

**Where to find this:**
- Build file scripts/targets section
- CI/CD configuration files
- Container orchestration files
- Task runner configs
- README or contributing docs (if they exist)

**Guardrails:**
- Verify commands exist by reading the configuration. Do not guess commands.
- If CI config exists, note any differences between CI and local build commands.
- If no commands are documented, note: "No documented commands. Build appears to use [tool] based on config files." Mark as low confidence.
- Record prerequisites (container runtime, specific tool versions, environment variables) needed to execute commands.

---

## System-Wide Tech Debt Summary

After completing all per-module analysis, produce a `<tech-debt-summary>` section with:

**By category:** count of items per category across all modules

**By severity:** count of high, medium, low items across all modules

**Highest priority:** identify the single most impactful tech debt item across the entire system and explain why it matters most.

---

## Writing to initial-state.md

Use **top-level XML tags only** — inner content uses prose, bullets, and markdown formatting. No nested XML. Match the format already established by the Architect in the file.

For each module, replace the `<!-- Engineer analysis pending -->` placeholder with your sections:
- `<code-conventions>` — bold category headers with prose and evidence counts
- `<hot-spots>` — bullet list with bold file paths, type, evidence, risk
- `<tech-debt>` — bullet list with severity/category in brackets, descriptions
- `<toolchain>` — bullet list of commands

At the end of the file (before `</initial-state>`), add:
- `<tech-debt-summary>` — category counts, severity counts, highest priority item

---

## Edge cases

### Module with no source code
If a module exists in the module index but has no source files (only build configuration, schema definitions, or generated code):
- Skip code conventions analysis
- Note in hot-spots: "No source code to analyze — module contains only [what it contains]"
- Check for dependency and infrastructure debt only

### Module with no tests
If a module has no test files, no test framework in dependencies, and no test directories:
- Record as a high-priority tech debt item under "test" category
- Do not guess about test conventions
- Note: "No test infrastructure detected" with high confidence

### Very large module
For modules with a very large number of source files:
- Sample from different areas of the module (entry points, core, data layer, utilities)
- Explicitly note that analysis is based on sampling, not exhaustive review
- Focus hot spot detection on file sizes and test coverage gaps rather than reading every file

