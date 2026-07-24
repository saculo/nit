---
name: "nit:implement"
description: "Implement step skill for the nit workflow, shared by all engineer roles (backend, frontend, infra, qa). Reads the design output and task, implements the change, runs the tests, and produces a structured implementation-result: files changed, notes, deviations, tech debt, and test outcome. Use when a task is dispatched to an engineer at the implement step, or when the user says '/nit:implement'."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

> **Invocation**: dispatched by the supervisor (`nit:continue`) at the implement step to the engineer
> resolved by the archetype (`$engineer` — backend, frontend, infra, or qa). The base step skill for
> the implement step is `nit:implement`.

# nit Implement

You are the Engineer. Build what the design specifies, verify it against the acceptance criteria, and
report what you did. Your output is a machine-readable `implementation-result` embedded in the step
`output.json` — it is the only artifact you persist (ADR-0005). Do not write `STEPS.md` or
`IMPLEMENTATION.md`.

## Inputs

- `input.json` in the step directory — `taskId`, `stepId`, `role`, `skillList`, and `context`.
- `context.priorOutputs` — a map of completed step id to that step's `output.json` path. Read
  `priorOutputs.design` for the decisions, components, interfaces, and file plan you implement against;
  read `priorOutputs.analyze` for the risks behind them. If the map is absent, fall back to the sibling
  directory convention (`STEP-NNN-<stepId>/output.json` under the task directory).
- `context.repairErrors`, when present — schema errors from your previous attempt at this step. Fix
  exactly those and re-emit.
- `task.json` for the task — acceptance criteria and definition of done.
- The language and project skills in `skillList`; load them before writing code.
- **Brownfield only**: `.nit/project/initial-state.md` for existing conventions to follow.

## Procedure

1. Read the design result from `context.priorOutputs.design`. If it is missing or contradicts the
   task's acceptance criteria, stop and report rather than guessing.
2. Derive an ordered plan from the design's `filePlan` and `components` — dependency order, tests
   included. Keep it in working memory; it is not a persisted artifact.
3. Implement, following the project's conventions for its ecosystem and the skills in `skillList`.
4. Record any departure from the design as you go:
   - **minor** (naming, file placement) — proceed, note it in `deviations`
   - **moderate** (different approach, extra component) — proceed, note it in `deviations`
   - **major** (the design is wrong, or scope must change) — STOP and report; do not implement past it
5. Run the test suite. Capture the command and the outcome for the `tests` field.
6. Verify each acceptance criterion against actual behaviour, not intent. If one cannot be satisfied,
   stop and report.
7. Commit the source changes (see Git below).
8. Write `output.json` in the step directory and validate it:

   ```bash
   bun run ./cli/src/cli.ts validate --schema step-output \
     .nit/phases/PHASE-N/tasks/TASK-NNN/STEP-NNN-implement/output.json
   ```

## Git

Commit source changes before reporting; do not push and do not open a PR — that follows review.

1. Branch `feature/TASK-NNN`, or `bugfix/TASK-NNN` when the task is explicitly a bug fix.
2. Stage the source files you changed. Do NOT stage `.nit/` step artifacts.
3. Commit with:

   ```
   TASK-<id>: Short task title

   - What was implemented
   - Key changes

   Phase: PHASE-N
   Type: backend|frontend|devops|qa
   ```

## Output shape

`output.json` conforms to `step-output.schema.json` with an `implementation` result:

```json
{
  "taskId": "TASK-017",
  "stepId": "implement",
  "stepType": "implement",
  "result": {
    "resultType": "implementation",
    "filesChanged": [
      { "path": "src/thing.ts", "action": "created" },
      { "path": "tests/thing.test.ts", "action": "created" }
    ],
    "notes": [
      "How the design was realised, and what the reviewer should know."
    ],
    "tests": { "command": "bun test", "outcome": "passed", "passed": 94, "failed": 0 },
    "deviations": ["KD-2: used X instead of Y because ..."],
    "techDebt": ["Left Z unhandled; tracked for a follow-up task."]
  },
  "artifacts": [
    { "type": "commit", "path": "feature/TASK-017", "description": "Implementation commit" }
  ],
  "adrCandidates": []
}
```

The identity fields are placeholders in the example above: copy `taskId` and `stepId` verbatim from
your `input.json`, and set `stepType` to the step you are executing (`implement`) — never carry over
the values shown here. `filesChanged` is required and every entry needs an `action` of `created`,
`modified`, or `deleted`; it lists the source files you changed, while non-source outputs and the
commit reference go in `artifacts[]` (ADR-0005).
`tests.outcome` is one of `passed`, `failed`, `not-run`; report it honestly — a failing suite is a
result the reviewer needs, not something to hide. `deviations` and `techDebt` may be empty arrays but
should be present so their emptiness is a deliberate claim. A non-zero exit from the validator means
the output is malformed — fix and re-write before finishing.

## Rules

- Implement the design; do NOT redesign. A design you disagree with is a major deviation to report,
  not one to quietly route around.
- Do NOT add features beyond the acceptance criteria.
- Do NOT refactor unrelated code — record it as `techDebt` instead.
- Tests are part of the work, not a follow-up; attempt the suite before you report. Only report
  `tests.outcome: "not-run"` when running it is genuinely unavailable, and record why in `notes`.
- Never claim an acceptance criterion passes without having verified the behaviour.
- Emit an `adrCandidate` only for a decision forced during implementation that outlives this task; do
  NOT write files into `.nit/adr/` yourself.
- Code review is the reviewer's step — never mark it satisfied here.
