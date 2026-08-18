---
name: "nit:continue"
description: "Deterministic supervisor for the nit workflow. Advances a task through its archetype's steps: computes the next step, scaffolds the step directory, builds input.json, dispatches the specialist, validates output, and tracks state with a repair/reopen/escalate loop. Use when the user says '/nit:continue', 'continue task', 'advance task', 'run supervisor', or to move a task to its next step."
allowed-tools: Read, Bash, Agent
---

> **Arguments**: `/nit:continue <phase> <task> [--dry-run]` — resolves the task directory
> `.nit/phases/PHASE-N/tasks/TASK-NNN/` and its archetype (from `task.json.archetype`).

# nit Deterministic Supervisor

Advances one task by one step. The deterministic state machine lives in the CLI
(`cli/src/supervisor.ts`, see ADR-0004); this skill is a thin wrapper that performs the single
action the CLI cannot: dispatching the specialist via the Agent tool. Each step is processed in two
CLI phases around that dispatch.

## Inputs

- `task.json` (or TASK.md) in the task directory — supplies `archetype` and `targetModule`.
- The resolved archetype (`nit archetype <name>`) — the step sequence.
- `config/supervisor.json` — `maxReopenCount` (defaults to 3 when absent).

## Procedure

### 1. Prepare the next step

```bash
bun run ./cli/src/cli.ts continue \
  --task-dir .nit/phases/PHASE-N/tasks/TASK-NNN \
  --archetype <archetypeName> \
  --target <targetModule> --modules .nit/boundaries/modules.json \
  --registry .nit/registry/skills.json
```

This creates/advances `state.json`, scaffolds `STEP-NNN-<stepId>/`, writes `input.json` (with the
resolved `skillList`), and prints a dispatch descriptor:

```json
{ "taskId": "...", "stepId": "design", "role": "architect",
  "skillList": ["nit:design", "java", "..."], "stepDir": "...", "inputPath": "...", "action": "advance" }
```

If it prints `{"blocked": true, "status": "awaiting_approval"}` the current step still needs approval
(run `/nit:approve`); `{"blocked": true, "status": "escalated"}` means the reopen budget was exceeded
and `{"blocked": true, "status": "blocked"}` means a specialist reported it cannot proceed — both
need a human, not another dispatch. `{"done": true}` means all steps are complete.

### 2. Dispatch the specialist (LLM step)

Read `input.json`, then use the **Agent** tool with `subagent_type` = the descriptor's `role`. In the
prompt, instruct the agent to load the skills listed in `skillList` (it reads the referenced
`SKILL.md` files itself — per U-1) and to write its result to `output.json` in the step directory,
conforming to `step-output.schema.json`.

### 3. Ingest the output

```bash
bun run ./cli/src/cli.ts continue --task-dir <dir> --archetype <name> --ingest
```

This validates `output.json`. On success it writes a pending `approval.json` and sets the task to
`awaiting_approval` (prints `{"valid": true, ...}`). On failure it writes `validation.json`,
increments `reopenCount`, and either reopens the step with the errors embedded in a fresh
`input.json` (`{"valid": false, "escalated": false}`) or, once `reopenCount` exceeds
`maxReopenCount`, sets the task to `escalated` and reports the accumulated errors. On a reopen,
return to step 2 with the updated `input.json`.

Two outcomes park the task at `blocked` instead, both printing `{"blocked": true, "status":
"blocked", "reason": "..."}`. A schema-valid `blocked` result means the specialist reported it cannot
proceed (`needs-splitting`, `contradictory-input`, `criterion-unsatisfiable`); a missing `output.json`
is reported as `no-output` and records the miss in `validation.json` with `action: "block"`. Neither
touches `reopenCount` and neither schedules a repair — re-running the step would not help. Surface
the reason to the user and stop.

## Dry run

```bash
bun run ./cli/src/cli.ts continue --task-dir <dir> --archetype <name> --dry-run
```

Prints the resolved step list, the skill composition, and the `input.json` that would be built for
the next step — writing nothing and dispatching no agent.

## Rules

- Do NOT hand-edit `state.json` — only the CLI transitions it.
- Dispatch exactly the role and skills the descriptor names; do not substitute.
- After an escalation, stop and surface the accumulated errors to the user — do not loop further.
- After a block, stop and surface the reason and explanation — do not re-dispatch the step. Resolving
  a blocked task is a human decision (split it, fix the criterion, edit `state.json`).
- Approve/reject is a separate command (`/nit:approve`, `/nit:reject`, TASK-016); this skill parks a
  valid step at `awaiting_approval` and advances only once the prior step is approved.
