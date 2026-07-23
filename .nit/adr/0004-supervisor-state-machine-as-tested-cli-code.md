---
status: proposed
date: 2026-07-23
decision-makers: [saculo]
---

# 0004 — Supervisor state machine implemented as tested CLI code

## Context and Problem Statement

The deterministic supervisor (`nit:continue`, TASK-015) advances a task through its archetype's
steps: computing the next step, building step input, dispatching a specialist, validating output, and
tracking state with a repair/reopen/escalate loop. Clarification A-1 stated the supervisor should be
"an LLM skill with precise instructions, NOT a programmatic state machine" — i.e. deterministic by
virtue of unambiguous prose, not code.

However, the sibling capabilities in PHASE-2 (archetype inheritance resolution, skill composition —
TASK-014) were implemented as tested TypeScript in the CLI, and the supervisor's acceptance criteria
are highly behavioural (exact state transitions, step numbering, reopen counting, escalation
thresholds). Encoding that logic purely as prose makes the Definition of Done requirement "tests
written and passed" unverifiable and risks inconsistent behaviour. We must decide where the
supervisor's decision logic lives.

## Decision Drivers

- Testability of the state-transition logic against the acceptance criteria
- Consistency with the archetype-resolver and skill-composition engine (already CLI code)
- Reliability/determinism of state progression
- The Agent tool (specialist dispatch) is only available to the LLM, not the CLI

## Considered Options

- Full CLI state machine with a thin prose wrapper for dispatch
- Pure prose supervisor skill delegating only to existing CLI commands
- Prose skill plus small tested CLI primitives

## Decision Outcome

Chosen option: "Full CLI state machine with a thin prose wrapper for dispatch", overriding A-1 by
explicit direction of the decision-maker. The supervisor's deterministic logic — next-step
computation, step-directory numbering, input assembly, output validation branching, and the
repair/reopen/escalate loop — is implemented as tested TypeScript in the CLI (`cli/src/supervisor.ts`
+ commands). The `nit:continue` skill remains a thin prose wrapper responsible only for the one step
that must be LLM-driven: dispatching the specialist via the Agent tool between the CLI's "prepare"
and "ingest" phases.

### Consequences

- Good, because the state machine is directly unit-testable against AC-1..AC-4 and behaves
  identically across runs.
- Good, because it is consistent with the archetype and routing engines already in the CLI.
- Bad, because it diverges from A-1's framing of the supervisor as a prose LLM skill; the prose layer
  is now minimal (dispatch only).
- Bad, because the CLI/LLM seam (prepare → dispatch → ingest) adds a two-phase interaction the skill
  must sequence correctly.

### Confirmation

`cli/tests` covers state creation, step advancement, invalid-output repair, and escalation. The
`nit:continue` skill documents the prepare → dispatch → ingest sequence and is exercised end-to-end
during dogfooding.

## Pros and Cons of the Options

### Full CLI state machine with a thin prose wrapper

- Good, because deterministic logic is testable and consistent with existing engines.
- Good, because the prose surface (and its ambiguity) shrinks to just dispatch.
- Bad, because it overrides an explicit clarification (A-1).

### Pure prose supervisor skill

- Good, because it is the most faithful to A-1.
- Bad, because the state-transition logic cannot be unit-tested; DoD rests on manual walkthrough.
- Bad, because prose is more prone to inconsistent execution for a many-state machine.

### Prose skill plus small tested CLI primitives

- Good, because it balances A-1 with some testability.
- Bad, because the boundary between "primitive" and "decision" is blurry, splitting the logic across
  two media and complicating both.

## More Information

- Supersedes the framing in clarification A-1 for the supervisor's implementation medium.
- Related: ADR-0003 (validate generated JSON at write time), TASK-014 (skill composition engine).
