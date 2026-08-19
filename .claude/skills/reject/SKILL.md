---
name: "nit:reject"
description: "Reject the current step of a nit task. Writes a rejected approval.json and reopens the archetype's rejection-routing target (e.g. reject review -> reopen implement). Use when the user says '/nit:reject', 'reject step', 'request changes', or when a step parked at awaiting_approval needs rework."
allowed-tools: Read, Bash
---

> **Arguments**: `/nit:reject <phase> <task> [--comment "<text>"]` — resolves the task directory
> `.nit/phases/PHASE-N/tasks/TASK-NNN/`. Operates on the current active step (Q-1).

# nit Reject

Rejects the step the task is currently parked on (`state.json.currentStepId`, which must be
`awaiting_approval`) and reopens the step the archetype's `rejectionRouting` points to. The
deterministic transition lives in the CLI (`cli/src/supervisor.ts`).

```bash
bun run ./cli/src/cli.ts reject \
  --task-dir .nit/phases/PHASE-N/tasks/TASK-NNN \
  --archetype <archetypeName> \
  --comment "<reason for rejection>"
```

This writes `STEP-NNN-<stepId>/approval.json` (status=rejected, comment) and moves `state.json`
`currentStepId` to `rejectionRouting[currentStepId]` with status `in-progress`. For the base
archetype, rejecting `review` reopens `implement`; rejecting a step that self-routes (e.g. `design`)
reopens the same step. Output: `{"status":"in-progress","rejectedStep":"review","reopenedStep":"implement"}`.

Run `/nit:continue` afterwards to prepare and dispatch the reopened step.

## Rules

- The task must be at `awaiting_approval`; otherwise the command aborts with a clear message.
- Always provide a `--comment` explaining the rejection — it is the specialist's rework context, and
  it reaches them: the comment, the rejected step's id, and a path to its `output.json` are recorded in
  `state.json.reworkFrom` and threaded into the reopened step's `input.json` as `context.reworkFrom`
  (TASK-031). A vague comment is a vague rework instruction.
- Do NOT hand-edit `state.json` or `approval.json` — only the CLI transitions them.
