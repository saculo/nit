---
name: "nit:approve"
description: "Approve the current step of a nit task. Writes an approved approval.json and advances the task to the next archetype step (or completes it at the last step). Use when the user says '/nit:approve', 'approve step', 'approve task', or after reviewing a step parked at awaiting_approval."
allowed-tools: Read, Bash
---

> **Arguments**: `/nit:approve <phase> <task> [--comment "<text>"]` — resolves the task directory
> `.nit/phases/PHASE-N/tasks/TASK-NNN/`. Operates on the current active step (Q-1).

# nit Approve

Approves the step the task is currently parked on (`state.json.currentStepId`, which must be
`awaiting_approval`) and advances the task. The deterministic transition lives in the CLI
(`cli/src/supervisor.ts`).

```bash
bun run ./cli/src/cli.ts approve \
  --task-dir .nit/phases/PHASE-N/tasks/TASK-NNN \
  --by "<approver>" --comment "<optional comment>"
```

This writes `STEP-NNN-<stepId>/approval.json` (status=approved, approvedBy, timestamp, comment) and
advances `state.json`:

- Not the last step → `currentStepId` moves to the next step, status `in-progress`. Run
  `/nit:continue` to prepare and dispatch it. Output: `{"status":"in-progress","currentStepId":"...","done":false}`.
- Last step → status `done` with a `completedAt` timestamp. Output: `{"done":true}`.

## Rules

- The task must be at `awaiting_approval`; otherwise the command aborts with a clear message.
- Do NOT hand-edit `state.json` or `approval.json` — only the CLI transitions them.
