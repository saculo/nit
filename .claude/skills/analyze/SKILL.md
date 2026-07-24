---
name: "nit:analyze"
description: "Analyze step skill for the nit workflow (analyst role). Reads the task and project context and produces a structured analysis-result: requirements findings, risks, recommendations, and a proposed archetype. Use when a task is dispatched to the analyst at the analyze step, or when the user says '/nit:analyze'."
allowed-tools: Read, Glob, Grep, Bash
---

> **Invocation**: dispatched by the supervisor (`nit:continue`) at the analyze step to the analyst
> agent. The base step skill for the analyze step is `nit:analyze`.

# nit Analyze

You are the Analyst. Read the task and the surrounding project context, then produce a structured
analysis that later steps (design, implementation) build on. Your output is a machine-readable
`analysis-result` embedded in the step `output.json`.

## Inputs

- `input.json` in the step directory — `taskId`, `stepId`, `role`, `skillList`, and `context`.
- `task.json` (or TASK.md) for the task under analysis — user story, acceptance criteria, module.
- `.nit/prd/summary.json` and `.nit/boundaries/modules.json` for product and module context, when present.
- `.nit/registry/task-types.json` for the default archetype of the task's type (starting point for
  the proposal).

## Procedure

1. Read the task's user story and acceptance criteria; identify the concrete requirements they imply.
2. Identify risks: ambiguity, cross-module impact, external dependencies, security or data concerns.
3. Form recommendations that guide the design step (patterns to prefer, boundaries to respect).
4. Propose a concrete archetype: start from the task type's `defaultArchetype` and refine by the
   task's description and target module (per U-11). Use one of the concrete archetypes in
   `cli/archetypes/` (e.g. `backend-feature`, `frontend-feature`, `infra-change`, `bugfix`,
   `cross-module-change`, `architecture-decision`) — never the abstract `base`.
5. Write `output.json` in the step directory and validate it:

   ```bash
   bun run ./cli/src/cli.ts validate --schema step-output \
     .nit/phases/PHASE-N/tasks/TASK-NNN/STEP-NNN-analyze/output.json
   ```

## Output shape

`output.json` conforms to `step-output.schema.json` with an `analysis` result:

```json
{
  "taskId": "TASK-016",
  "stepId": "analyze",
  "stepType": "analyze",
  "result": {
    "resultType": "analysis",
    "findings": ["Requirement: ...", "Requirement: ..."],
    "risks": ["Risk: ..."],
    "recommendations": ["Prefer ...", "Respect boundary ..."],
    "proposedArchetype": "backend-feature"
  }
}
```

`findings` is required and must capture the requirements analysis; `risks`, `recommendations`, and
`proposedArchetype` are strongly encouraged. A non-zero exit from the validator means the output is
malformed — fix and re-write before finishing.

## Rules

- Do NOT design or implement — analysis only; the design step owns technical decisions.
- Always propose exactly one concrete archetype, never `base`.
- Keep findings/risks concrete and traceable to the task's acceptance criteria.
