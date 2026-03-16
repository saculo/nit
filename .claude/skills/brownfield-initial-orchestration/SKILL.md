---
name: "nit:brownfield-orchestrate"
description: "Brownfield initial-state generation orchestrator. Coordinates Architect and Engineer agents to produce .nit/project/initial-state.md for brownfield projects. Use when the user says '/nit:brownfield-orchestrate', 'generate initial state', 'brownfield scan', or during nit:init in brownfield mode."
allowed-tools: Read, Glob, Grep, Agent
hooks:
  PreToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-brownfield-orchestrate.sh"
          timeout: 10
---

> **Arguments**: `/nit:brownfield-orchestrate` — no arguments. Requires `.nit/` directory to exist and brownfield mode.

# Orchestrator Skill: Brownfield Initial-State Generation

## Purpose

Coordinate the generation of `initial-state.md` for a brownfield project by dispatching the Architect and Engineer agents in sequence with human review gates between each step.

## When to invoke

- During `nit init` when the user selects **brownfield** mode
- During `nit initial-state refresh` when the user explicitly requests a re-scan

## Critical rules

1. **You only orchestrate.** You dispatch tasks to agents and manage the human review flow. You do NOT create, modify, or write any files yourself.
2. **You do NOT provide analysis input to agents.** Agents read the repository and `initial-state.md` directly. You tell them which skill to use and which module to analyze — nothing more.
3. **Every agent output goes through human review before the next step.**

## Pre-conditions

Before starting, verify:

1. The repository exists and has committed code (not an empty repo)
2. The `.nit/` directory has been created by `nit init`
3. The user has confirmed brownfield mode

If any pre-condition fails, stop and report clearly which condition is not met.

---

## Flow

```
Step 1: Dispatch Architect (module discovery + per-module architecture analysis)
           Architect writes initial-state.md
  ↓
Step 2: Present initial-state.md to human as diff
  ↓
Step 3: Human reviews
         → If accepted: proceed to Step 4
         → If rejected: human provides feedback/corrections → re-dispatch Architect → back to Step 2
  ↓
Step 4: Dispatch Engineer (per-module implementation analysis)
           Engineer adds sections to initial-state.md
  ↓
Step 5: Present updated initial-state.md to human as diff
  ↓
Step 6: Human reviews
         → If accepted: initial-state generation complete
         → If rejected: human provides feedback/corrections → re-dispatch Engineer → back to Step 5
```

---

## Step 1: Dispatch Architect

Tell the Architect agent to execute the `nit:brownfield-analyze`.

The Architect will:
- Scan the repository structure to discover modules
- Detect ecosystem and stack per module
- Analyze architecture patterns, responsibilities, and integration points per module
- Produce system-level analysis (dependency map, cross-cutting concerns, system responsibility) if multi-module
- Write everything to `.nit/project/initial-state.md`

You provide:
- The skill to use: `nit:brownfield-analyze`
- Nothing else. The Architect reads the repository directly.

## Step 2: Present to human

After the Architect completes, present the generated `initial-state.md` to the human as a diff (new file creation).

Highlight:
- Number of modules discovered
- Ecosystem detected per module
- Any low-confidence findings that need human verification
- Any modules where the Architect was uncertain about purpose or ecosystem

## Step 3: Human review (Architect output)

The human may:
- **Accept** — proceed to Step 4
- **Reject with feedback** — provide corrections, tips, or additional context. Examples:
  - "That module is deprecated, remove it"
  - "The ecosystem is Micronaut, not Spring Boot"
  - "There's a hidden module in tools/ you missed"
  - "The system responsibility description is wrong — it's a billing system, not an admin portal"
- **Request re-run** — re-dispatch the Architect with the human's feedback included as additional context

If rejected, re-dispatch the Architect with instructions to incorporate the human's feedback. Return to Step 2.

## Step 4: Dispatch Engineer

After the human accepts the Architect's output, tell the Engineer agent to execute the `nit:brownfield-snapshot`.

The Engineer will:
- Read the existing `initial-state.md` (written by the Architect)
- Analyze code conventions, hot spots, tech debt, and toolchain per module
- Add Engineer sections to the existing `initial-state.md`

You provide:
- The skill to use: `nit:brownfield-snapshot`
- Nothing else. The Engineer reads `initial-state.md` and the repository directly.

## Step 5: Present to human

After the Engineer completes, present the updated `initial-state.md` to the human as a diff (showing only the Engineer's additions).

Highlight:
- Any high-severity tech debt items found
- Any hot spots identified
- Any low-confidence findings

## Step 6: Human review (Engineer output)

The human may:
- **Accept** — initial-state generation is complete
- **Reject with feedback** — provide corrections or additional context
- **Request re-run** — re-dispatch the Engineer with feedback

If rejected, re-dispatch the Engineer with instructions to incorporate feedback. Return to Step 5.

---

## Completion

When both reviews are accepted:
- Report: "Initial-state generation complete. File: `.nit/project/initial-state.md`"
- Report summary: N modules analyzed, key findings

---

## Re-dispatch rules

When re-dispatching an agent after human rejection:

1. Pass the human's feedback as additional context to the agent
2. Tell the agent which specific sections need correction (do not ask it to redo everything)
3. The agent modifies the existing `initial-state.md` — it does not start from scratch

---

## Refresh scenario

When running `nit initial-state refresh`:

1. Archive the current `initial-state.md` (rename to `initial-state.YYYY-MM-DD.bak.md`)
2. Run the full flow from Step 1 (Architect → human review → Engineer → human review)
3. After completion, present a diff between the old and new versions to the human
4. Let the human accept the new version, keep the old, or manually merge