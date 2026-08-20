---
name: "nit:boundary-check"
description: "Boundary-check step skill for the nit workflow (reviewer role). Runs the module boundary check against what the implement step changed, and judges whether each crossing is architecturally sound. Produces a review-result: a verdict and severity-graded comments. Use when a task is dispatched to the reviewer at the boundary-check step, or when the user says '/nit:boundary-check'."
allowed-tools: Read, Write, Glob, Grep, Bash
---

> **Invocation**: dispatched by the supervisor (`nit:continue`) at the boundary-check step to the
> reviewer agent. The base step skill for the boundary-check step is `nit:boundary-check`.

# nit Boundary Check

You are the Reviewer, judging whether a change that crosses module boundaries should be allowed to.

This step exists only in archetypes that expect crossings — `cross-module-change` is the one that
ships. For those tasks the supervisor deliberately **does not** block a crossing at the implement step,
because blocking it would make the archetype unusable. It defers the decision to you.

Your output is a machine-readable `review-result` embedded in the step `output.json` — the same result
type `nit:review` produces, because this is a review with a narrower subject. Do not invent a
boundary-specific result type.

## What is automatic, and what is yours

The check itself is code. Run it; do not re-derive it by reading files and reasoning about paths:

```bash
bun run ./cli/src/cli.ts boundaries --task-dir .nit/phases/PHASE-N/tasks/TASK-NNN
```

It prints every crossing the implement step made that the rules do not permit, each with the rule's
own `reason`, and exits 1 when there are any. Exit 0 means the change stayed inside what
`modules.json` and `dependency-rules.json` already allow — say so and approve.

**A crossing the command reports is not automatically a defect.** That is the whole point of this step:
a `cross-module-change` task was planned expecting to cross, and your job is to judge whether *these*
crossings are the ones the task needed. The command tells you what happened; it cannot tell you whether
it was justified.

## Inputs

- `input.json` in the step directory — `taskId`, `stepId`, `role`, `skillList`, and `context`.
- `context.priorOutputs` — read `priorOutputs.implement` for `filesChanged`, `notes` and `deviations`,
  and `priorOutputs.design` for what the design said the change would touch. A crossing the design
  anticipated is a different thing from one that appeared during implementation.
- `context.repairErrors` or `context.reworkFrom`, when present — fix exactly what they name.
- `task.json` — the acceptance criteria, and the `targetModule` every crossing is measured from.
- `.nit/boundaries/modules.json` and `dependency-rules.json` — the rules, and the reasons behind them.

## Procedure

1. Run the command above and read every reported crossing.
2. For each, decide whether the task needed it. The useful question is not "does a rule forbid this"
   — the command already answered that — but **"would this task have been possible without it?"**
   - The design named it and the acceptance criteria require it: **justified**, record it as `info`.
   - It was not anticipated but is the smallest way to satisfy a criterion: **justified with a note**,
     record it as `warning` so the next reader knows the rule was bent knowingly.
   - It is incidental — a drive-by edit, a convenience, work that belongs in the other module's own
     task: **not justified**, record it as `error`.
3. Check the direction, not just the pair. A crossing that inverts the intended dependency — a lower
   layer reaching up into a higher one — is worse than one that merely widens an allowed direction,
   because it is the shape that cannot be undone later without moving code.
4. Check what the rules would have to become. If approving this crossing means the rule is wrong, say
   so and raise an `adrCandidate`: a rule that is routinely overridden should be changed or deleted,
   not quietly ignored each time.
5. Decide the verdict and write `output.json`, then validate it:

   ```bash
   bun run ./cli/src/cli.ts validate --schema step-output \
     .nit/phases/PHASE-N/tasks/TASK-NNN/STEP-NNN-boundary-check/output.json
   ```

## Verdict

| verdict | When |
|---|---|
| `approved` | No crossings, or every crossing was needed by the task and is recorded. |
| `changes-requested` | At least one crossing is incidental and can be removed without failing a criterion. |
| `rejected` | The change is structurally wrong — it inverts a dependency direction, or the task cannot be done within any boundary it should respect. Reworking the implementation will not fix it; the task or the module model needs to change. |

An `approved` verdict alongside an `error` comment is a contradiction. Resolve it before emitting.

Your verdict does not move the task; `/nit:approve` and `/nit:reject` do. Under `cross-module-change`,
rejecting this step reopens `implement`.

## Output shape

```json
{
  "taskId": "TASK-NNN",
  "stepId": "boundary-check",
  "stepType": "boundary-check",
  "result": {
    "resultType": "review",
    "verdict": "changes-requested",
    "comments": [
      { "severity": "info", "path": "src/api/handler.ts", "message": "boundary: api -> core is permitted; no crossing to judge." },
      { "severity": "warning", "path": "web/page.tsx", "message": "boundary: api -> web was not in the design's filePlan, but AC-2 needs the field rendered. Bending the rule knowingly." },
      { "severity": "error", "path": "web/theme.css", "message": "boundary: api -> web for a styling tweak unrelated to any acceptance criterion. This belongs in a web task." }
    ]
  },
  "adrCandidates": [
    {
      "title": "The api may render web-owned fields directly",
      "context": "AC-2 needs a field the web module owns, and the rules forbid api -> web. Routing it through core was rejected as indirection for one field.",
      "decision": "Permit api -> web for rendering only, and change the rule rather than approving this crossing again per task.",
      "status": "proposed"
    }
  ]
}
```

Copy `taskId` and `stepId` verbatim from your `input.json`; set `stepType` to `boundary-check`.

## ADR triggers

You are already judging crossings, and `cross-module-dependency` fires on the same facts. When you
approve a crossing, the question the trigger asks is whether that approval was a decision worth
recording — a crossing you would approve again for every similar task is a rule that should change,
and that is an ADR rather than a repeated judgement call.

Most likely to fire here: `cross-module-dependency` and `multi-module-change`.

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

If the check cannot be run or its result cannot be judged, emit a `blocked` result rather than guessing:

```json
{
  "taskId": "TASK-NNN",
  "stepId": "boundary-check",
  "stepType": "boundary-check",
  "result": {
    "resultType": "blocked",
    "reason": "contradictory-input",
    "explanation": "The task's targetModule is not in modules.json, so every changed file measures as a crossing and no verdict would mean anything.",
    "detail": { "conflictsWith": "task.json targetModule vs boundaries/modules.json" }
  }
}
```

`reason` is one of `contradictory-input` (**requires** `detail.conflictsWith`),
`criterion-unsatisfiable` (**requires** `detail.criterionId`), or `needs-splitting` (**requires**
`detail.taskTypes`). Use `needs-splitting` when the crossings show the task is really two tasks — that
is a finding this step is well placed to make.

A change you judge *bad* is not blocked; that is `changes-requested` or `rejected`.

## Rules

- Run the check; do not re-derive it by reading paths and reasoning.
- A reported crossing is a question, not a verdict — judge whether the task needed it.
- Weigh direction, not just the pair: an inverted dependency is worse than a widened one.
- A rule you would override every time is a rule to change; raise an `adrCandidate` rather than
  approving around it repeatedly.
- Record permitted crossings at `info` too, so a reader can tell a checked change from an unchecked one.
- Do NOT edit code, `state.json`, `approval.json`, or the rules themselves. You emit one `output.json`.
