---
status: proposed
date: 2026-03-30
decision-makers: [lgrula]
---

# 0002 — Use JSON Schema 2020-12 with ajv Library for All Schema Validation

## Context and Problem Statement

nit v2 moves from XML-in-Markdown artifacts to JSON artifacts validated against formal JSON Schema files. All ~13 standalone schemas and ~6 embedded types need a consistent schema dialect and a validation mechanism. The chosen dialect and validator will be used across every task that touches schemas, validation hooks, and the `nit validate` command. This decision affects TASK-001 through the entire PHASE-2 and beyond.

## Decision Drivers

- Schema files must support $defs/$ref for embedded types in step-output (per U-8)
- The validator must run inside the @nit/cli Bun/TypeScript package without external binary dependencies
- Validation hooks call `npx nit validate` -- the validator must support structured error output
- Support both bunx and npx invocation (per R-5)
- Schemas should be usable by external tools (IDE plugins, CI linters) without nit-specific tooling

## Considered Options

- Option 1: JSON Schema 2020-12 with ajv as a library
- Option 2: JSON Schema 2020-12 with ajv-cli as a subprocess
- Option 3: JSON Schema draft-07 with ajv as a library

## Decision Outcome

Chosen option: "Option 1 -- JSON Schema 2020-12 with ajv as a library", because 2020-12 provides the cleanest $defs/$ref model needed for embedded types, and using ajv as a library (not a CLI subprocess) keeps validation in-process with full control over error formatting and extensibility.

### Consequences

- Good, because all schemas use the latest stable JSON Schema spec with first-class $defs support
- Good, because ajv is the most widely adopted JSON Schema validator in the Node ecosystem
- Good, because in-process validation enables structured error output, custom exit codes, and future custom keywords
- Good, because schemas remain standard JSON Schema -- usable by any compliant tool outside of nit
- Bad, because ajv 2020-12 support requires a specific import path (ajv/dist/2020), which is a minor API surface to know about
- Bad, because the validate command requires implementing a small harness (schema loading, error formatting) rather than delegating to a ready-made CLI

### Confirmation

- All .schema.json files declare `"$schema": "https://json-schema.org/draft/2020-12/schema"`
- step-output.schema.json uses $defs and $ref for embedded types
- `npx nit validate --schema <type> <file>` runs validation using ajv library, not a subprocess
- Each schema file passes meta-schema validation (validates against the 2020-12 meta-schema)

## Pros and Cons of the Options

### Option 1 -- JSON Schema 2020-12 with ajv as a library

- Good, because 2020-12 is the latest stable spec with the cleanest $defs/$ref model
- Good, because ajv library gives full control over error formatting and exit codes
- Good, because no external binary dependency -- everything runs in the Bun/Node process
- Good, because extensible with custom keywords and format validators for future needs
- Bad, because requires writing a validation harness (schema loading, error formatting)
- Bad, because ajv 2020-12 uses a separate import path from the default ajv

### Option 2 -- JSON Schema 2020-12 with ajv-cli as a subprocess

- Good, because zero validation harness code needed
- Good, because ajv-cli is a well-tested interface
- Bad, because error output format is fixed and cannot be customized for nit's needs
- Bad, because subprocess spawning adds overhead per validation call
- Bad, because ajv-cli must be installed as a separate binary and resolvable on PATH
- Bad, because less control over exit codes and structured error output

### Option 3 -- JSON Schema draft-07 with ajv as a library

- Good, because draft-07 is the most widely supported draft across all tools
- Good, because ajv default import supports draft-07 without special paths
- Bad, because draft-07 uses `definitions` instead of `$defs` -- the older pattern
- Bad, because `$ref` behavior in draft-07 has known quirks (e.g., sibling keywords ignored next to $ref)
- Bad, because adopts a pattern already superseded by two newer drafts

## More Information

- Related design: .nit/phases/PHASE-2/tasks/TASK-001/DESIGN.md
- ajv 2020-12 support: https://ajv.js.org/json-schema.html#draft-2020-12
- JSON Schema 2020-12 spec: https://json-schema.org/draft/2020-12/json-schema-core
