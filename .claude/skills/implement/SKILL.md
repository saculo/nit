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
- `context.priorOutputs` — a map of completed step id to that step's `output.json`, as a path relative
  to the task directory (e.g. `STEP-002-design/output.json`). Read `priorOutputs.design` for the
  decisions, components, interfaces, and file plan you implement against; read `priorOutputs.analyze`
  for the risks behind them. If the map is absent, fall back to the directory convention:
  `STEP-NNN-<stepId>/output.json` under the task directory.
- `context.repairErrors`, when present — schema errors from your previous attempt at this step. Fix
  exactly those and re-emit.
- `context.reworkFrom`, when present — this step was reopened because a **later** step was rejected,
  not because your output was malformed. It carries `stepId` (the step that was rejected), `comment`
  (the reviewer's reason — the whole point of the rejection), and `output` (that step's `output.json`,
  relative to the task directory, since a rejection routes backwards and `priorOutputs` cannot reach
  it). Read the comment and the rejected step's findings, and fix what they name. Re-doing the step
  without reading them sends the same work back to the same reviewer.
- `task.json` for the task — acceptance criteria and definition of done.
- The language and project skills in `skillList`; load them before writing code.
- **Brownfield only**: `.nit/project/initial-state.md` for existing conventions to follow.

## Procedure

1. Read the design result from `context.priorOutputs.design`. If it is missing or contradicts the
   task's acceptance criteria, emit a blocked result rather than guessing — see "When you cannot
   proceed".
2. Derive an ordered plan from the design's `filePlan` and `components` — dependency order, tests
   included. Keep it in working memory; it is not a persisted artifact.
3. Implement, following the project's conventions for its ecosystem and the skills in `skillList`.
4. Record any departure from the design as you go:
   - **minor** (naming, file placement) — proceed, note it in `deviations`
   - **moderate** (different approach, extra component) — proceed, note it in `deviations`
   - **major** (the design is wrong, or scope must change) — STOP; emit a blocked result and do not
     implement past it
5. Run the test suite. Capture the command and the outcome for the `tests` field.
6. Verify each acceptance criterion against actual behaviour, not intent. If one cannot be satisfied,
   emit a `criterion-unsatisfiable` blocked result.
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

   ```text
   TASK-<id>: Short task title

   - What was implemented
   - Key changes

   Phase: PHASE-N
   Type: backend|frontend|devops|qa
   ```

   `Type:` is the task's `type` from `task.json` — one of `backend`, `frontend`, `devops`, `qa` — not
   the engineer role that ran the step. The `infra` engineer works tasks of type `devops`.

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

## Boundary errors

A `repairError` whose message begins `boundary:` is not a malformed output — your result was
schema-valid. It says the files you changed reach a module your task's `targetModule` is not allowed
to depend on, and it quotes the rule that forbids it. `validation.json` records this as
`policyValid: false` with `schemaValid: true`, which is how a reader tells the two apart.

There are two honest responses, and only one of them is a re-attempt:

- **The change was avoidable.** You reached into another module when the work belongs in your own —
  put it back, and re-emit. This is the repair case.
- **The task genuinely spans two modules.** Then no number of attempts will satisfy the rule, and
  retrying burns the reopen budget until the task escalates. Emit a `needs-splitting` blocked result
  instead, with `detail.taskTypes` naming what the split should produce and the boundary error quoted
  in your `explanation`. One task, one module is the rule the boundary check enforces; a task that
  cannot obey it needs re-planning, not another attempt.

Do not work around the rule by leaving the cross-module change out and reporting success. A step that
passes by omitting required work is worse than one that blocks.

## ADR triggers

Triggers evaluate what you actually changed, which may differ from what the design planned. A trigger
that fires here and did not fire at design is worth attention: it usually means the implementation
made a decision the design did not anticipate — which is exactly the kind that goes unrecorded.

Most likely to fire here: `new-infra-capability` when you add a dependency, `cross-module-dependency`
when the change reaches another module, and `boundary-change` when it edits the module registry or the
rules themselves.

Run it and read what fired:

```bash
bun run ./cli/src/cli.ts adr-triggers --task-dir .nit/phases/PHASE-N/tasks/TASK-NNN --step implement
```

**Order matters.** The query reads your step's `output.json`, so write your result first, run the
query, then add any candidates and re-write. Running it before you have written anything fails with
`No output.json for step` — that is the command telling you it has nothing to evaluate yet, not that
triggers are unconfigured.

Each match names the `condition` that fired and the `evidence` that satisfied it. Exit 1 means
something fired; exit 0 means nothing did, and nothing is what you should then emit.

**A trigger firing is not an instruction to write an ADR.** It is the project noticing that this change
has the shape of a decision, and asking you whether one was made. Two answers are legitimate:

- **A decision was made** — emit an `adrCandidate` with `title`, `context` and `decision`. Write the
  `context` as the problem that forced the choice, not as a description of the change, and the
  `decision` as what was chosen *and what was rejected*. A candidate that only says what happened is a
  changelog entry; the point of a record is the reasoning that would otherwise be lost.
- **No decision was made** — the trigger's shape matched but nothing was actually decided. Say so in
  your `notes` and emit no candidate. Emitting an empty candidate to satisfy a trigger is worse than
  emitting none: it fills the index with records nobody needs and trains the next reader to skim them.

You do **not** write into `.nit/adr/`. Promotion of a candidate to a numbered ADR is a human decision
behind the approval gate — you propose, a person records.

## When you cannot proceed

A major deviation, a design that contradicts the acceptance criteria, or a criterion you cannot
satisfy all mean the same thing: stop implementing. Do NOT stop with prose — emit a `blocked` result,
which is a valid `output.json`, so the supervisor parks the task at `blocked` for a human rather than
crashing or re-running you against the same wall:

```json
{
  "taskId": "TASK-018",
  "stepId": "implement",
  "stepType": "implement",
  "result": {
    "resultType": "blocked",
    "reason": "criterion-unsatisfiable",
    "explanation": "AC-3 requires sub-100ms p99, but the upstream service's own SLO is 250ms; no implementation on this path can satisfy it.",
    "detail": { "criterionId": "AC-3" }
  }
}
```

`reason` is one of:

| reason | Use when |
|---|---|
| `contradictory-input` | The design contradicts the acceptance criteria, a prior ADR, or itself. **Requires** `detail.conflictsWith`. |
| `criterion-unsatisfiable` | An acceptance criterion cannot be met as written. **Requires** `detail.criterionId`. |
| `needs-splitting` | The work turns out to span two task types. **Requires** `detail.taskTypes`. |

`explanation` is required and must be specific enough to act on. Commit whatever complete, working
source you have before reporting; leave partial work uncommitted. Validate the blocked output exactly
as you would an implementation result. Do not report `no-output` — that reason is the supervisor's,
for a step that wrote nothing at all.

A blocked report is not a substitute for a `deviation`. Minor and moderate deviations are noted and
the work continues; only a major one blocks.

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
