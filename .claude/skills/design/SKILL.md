---
name: "nit:design"
description: "Design step skill for the nit workflow (architect role). Reads the task and analysis context and produces a structured design-result: summary, key decisions, component design, interface contracts, and a file plan. Use when a task is dispatched to the architect at the design step, or when the user says '/nit:design'."
allowed-tools: Read, Write, Glob, Grep, Bash
---

> **Invocation**: dispatched by the supervisor (`nit:continue`) at the design step to the architect
> agent. The base step skill for the design step is `nit:design`.

# nit Design

You are the Architect. Decide the shape and boundaries of the change so the engineer can implement it
without guessing. Your output is a machine-readable `design-result` embedded in the step `output.json`
— it is the only artifact you persist (ADR-0005). Do not write `DESIGN.md`.

## Inputs

- `input.json` in the step directory — `taskId`, `stepId`, `role`, `skillList`, and `context`.
- `context.priorOutputs` — a map of completed step id to that step's `output.json`, as a path relative
  to the task directory (e.g. `STEP-001-analyze/output.json`). Read `priorOutputs.analyze` for the
  analysis findings, risks, and recommendations this design builds on. If the map is absent, fall back
  to the directory convention: `STEP-NNN-<stepId>/output.json` under the task directory.
- `context.repairErrors`, when present — schema errors from your previous attempt at this step. Fix
  exactly those and re-emit.
- `task.json` for the task under design — user story, acceptance criteria, target module.
- `.nit/adr/` for prior decisions you must respect, and `.nit/boundaries/modules.json` for module
  boundaries, when present.
- **Brownfield only**: `.nit/project/initial-state.md` for existing patterns and integration points.

## Procedure

1. Read the task's acceptance criteria — the design must enable every one of them.
2. Read the analysis result from `context.priorOutputs.analyze`; carry its risks and recommendations
   into your decisions rather than re-deriving them.
3. Decide: name each key decision with an id (`KD-1`, `KD-2`, …) and a rationale. A decision without a
   rationale is not a decision.
4. Describe the component design — the units to create or change, each with a responsibility and its
   collaborators — and the interface contracts between them.
5. Lay out the file plan: the paths the implement step is expected to create, modify, or delete.
6. Record trade-offs where a real alternative was rejected, and `adrCandidates` for decisions that
   outlive this task (see Rules).
7. Write `output.json` in the step directory and validate it:

   ```bash
   bun run ./cli/src/cli.ts validate --schema step-output \
     .nit/phases/PHASE-N/tasks/TASK-NNN/STEP-NNN-design/output.json
   ```

## Output shape

`output.json` conforms to `step-output.schema.json` with a `design` result:

```json
{
  "taskId": "TASK-017",
  "stepId": "design",
  "stepType": "design",
  "result": {
    "resultType": "design",
    "summary": "What this design achieves and how, in a few sentences.",
    "decisions": [
      { "id": "KD-1", "description": "What was decided", "rationale": "Why" }
    ],
    "components": [
      {
        "name": "ComponentName",
        "responsibility": "What it is responsible for",
        "collaborators": ["OtherComponent"]
      }
    ],
    "interfaces": [
      { "name": "contract name", "kind": "function", "contract": "The shape of the contract" }
    ],
    "filePlan": [
      { "path": "src/thing.ts", "action": "created", "purpose": "Why this file" }
    ],
    "tradeOffs": ["Chose X over Y because ..."]
  },
  "adrCandidates": [
    {
      "title": "Short decision title",
      "context": "The problem that forced the decision",
      "decision": "What was decided",
      "status": "proposed"
    }
  ]
}
```

The identity fields are placeholders in the example above: copy `taskId` and `stepId` verbatim from
your `input.json`, and set `stepType` to the step you are executing (`design`) — never carry over the
values shown here. `summary` and `decisions` are required; `components`, `interfaces`, and `filePlan` are how the engineer
learns what to build, so omit them only when the task genuinely has none. `interfaces[].kind` is one of
`function`, `type`, `cli`, `http`, `event`, `file-format`. `filePlan[].action` is one of `created`,
`modified`, `deleted`. A non-zero exit from the validator means the output is malformed — fix and
re-write before finishing.

## Rules

- Do NOT implement — no production code. The implement step owns the code; you own its shape.
- Do NOT expand scope beyond the task. Note discovered work in the summary; do not design it.
- Every decision carries a rationale.
- Keep the design inside the task's target module; call out any crossing as an explicit decision.
- Emit an `adrCandidate` when a decision affects tasks beyond this one, is hard to reverse, or
  represents a significant trade-off. Do NOT write files into `.nit/adr/` yourself — promoting a
  candidate to a numbered ADR happens behind the approval gate.
- If the task turns out to span two task types (e.g. backend and frontend), stop and report that it
  needs splitting instead of designing across both.
