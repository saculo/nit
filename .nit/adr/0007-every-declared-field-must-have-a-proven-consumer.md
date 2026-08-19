---
status: accepted
date: 2026-08-19
deciders: PHASE-3 summary; candidate raised in TASK-027
---

# 0007 — Every declared field must have a consumer, proven by test

## Context and Problem Statement

Four defects in PHASE-3 turned out to share one root cause. Each was a contract nit declared and
nothing honoured:

| Task | Declared | What actually read it |
|---|---|---|
| TASK-027 | `rejectionRouting` targets in `archetype.schema.json` | validated for keys, never for targets |
| TASK-028 | the `$detect` placeholder role | nothing resolved it |
| TASK-029 | the per-step `approval` flag | nothing read it |
| TASK-030 | phase success criteria | nothing *produced* them — the inverse |

Every one of them resolved cleanly and validated successfully. Three then failed at runtime or
silently did nothing; the fourth left a consumer requiring data no producer wrote. The consequences
were not cosmetic: two of six shipped archetypes could not dispatch their implement step, a five-step
task demanded five approvals rather than the two `base.json` describes, rejecting an
`architecture-decision` review crashed the next `prepare`, and the first real phase summary had to
invent its own criteria.

None was caught by a test, and the suite was green throughout. The tests asserted what the code *did*.
Nothing asserted that what the schemas *declared* was honoured, so the two drifted apart by default
and the drift was invisible.

The recurrence is the finding. One instance is a bug; four in a single phase, every one surfaced by
review rather than by a passing suite, is a gap in what the suite is asked to check.

## Decision Drivers

- A green suite must mean more than "the code does what the code does"
- Schema and archetype fields are the project's contracts; an unread contract is a lie in the codebase
- The gap is invisible by construction — nothing fails when a declaration is ignored
- Whatever we adopt must be cheap enough to apply to every field, or it will be applied to none
- PHASE-3 already proved the technique works on skill prose

## Considered Options

1. **A conformance test per declared field, asserting something consumes it**
2. **Review checklist item** — reviewers verify each new field has a reader
3. **Runtime warning** — the CLI logs when it encounters a declared field it does not read
4. **Accept it** — treat the four as unrelated bugs, now fixed

## Decision Outcome

**Option 1.** Every field a schema or archetype declares is covered by a test asserting something
reads it. A field with no consumer is either wired up or removed — it does not ship declared and inert.

This is the same technique PHASE-3 adopted for skill prose, applied to data. Those tests already assert
that `nit:status` advertises only runnable commands, that every archetype step resolves to a SKILL.md
on disk, that every hook is wired to a live skill, and that every step skill documents both reopen
causes. Each was written after a defect of exactly this shape and each has since caught a regression
or a fresh instance. Extending the same idea from prose to schema fields is a small step from a
practice that is already working here.

Two forms count as a consumer, and the distinction matters:

- **Code reads it.** Prefer asserting the behaviour the field produces rather than that the field is
  referenced — TASK-029's test asserts `base.json` gates exactly `design` and `review`, which fails
  loudly if the flag stops being read, whereas a grep for `approval` would not.
- **A documented procedure reads it**, where the consumer is an agent rather than a function. Then the
  test asserts the skill names the field, as the `reworkFrom` and `successCriteria` checks do. Weaker,
  but it is the only check available for a contract whose reader is a language model, and it is
  strictly better than nothing.

Option 2 was rejected as the status quo: reviewers *did* find all four, one at a time, after each had
shipped. A checklist depends on the reviewer knowing to look, and this class is defined by being easy
to miss. Option 3 was rejected because a warning fires only on the paths that run, and the failure mode
here is a path that never runs. Option 4 was rejected because four instances in one phase is a rate,
not a coincidence — and the fifth was nearly shipped in TASK-030, whose review caught `nit:tasks`
asking about criteria it did not read.

### Consequences

- Adding a schema field costs a test. That is the point: the cost is proportionate to the claim the
  field makes, and it is paid when the context is cheapest.
- Existing fields are not retrofitted in one pass. `pending` and `failed` in `task-state.schema.json`
  are already known to have no writer, and `step-input.schema.json` declares `context` as an open
  object so none of its five fields is enforced. These are recorded, not urgent, and the tests arrive
  as each area is next touched.
- Some consumers can only be checked by asserting prose contains a token. That is a weak test and
  should be recognised as one — it catches deletion and renaming, not misuse.
- The suite grows in a direction that pays off unevenly: most of these tests will never fail. The four
  that would have are the justification.

### Confirmation

The four defects are closed, each with a test that fails when its fix is reverted — verified by
reverting, not assumed. New schema fields added under this ADR are `reworkFrom` (TASK-031) and
`successCriteria` (TASK-030); both shipped with producer and consumer checks in
`cli/tests/workspace-hygiene.test.ts`.

## Pros and Cons of the Options

### Option 1 — conformance test per declared field

- Good: catches the class at the moment the field is added, when the author knows what should read it
- Good: extends a technique already proven in this codebase rather than introducing a new one
- Good: the test documents the intended consumer, which is otherwise nowhere written down
- Bad: prose-token assertions are weak and can pass while the consumer ignores the field in practice
- Bad: a per-field cost on every schema change, including fields whose consumer is obvious

### Option 2 — review checklist

- Good: no code, no maintenance
- Bad: this is what already happened, four times, each time after the defect shipped
- Bad: depends on the reviewer holding the pattern in mind; the pattern is defined by being easy to miss

### Option 3 — runtime warning on unread fields

- Good: catches real usage rather than intent
- Bad: silent on the paths that never execute, which is exactly where these defects lived
- Bad: needs a registry of what each component reads — most of the work of Option 1, without the test

### Option 4 — accept it

- Good: no cost
- Bad: the rate was four per phase, all found by review; the next one is likelier than not

## More Information

Raised as an `adrCandidate` in `.nit/phases/PHASE-3/summary.json` and left unpromoted there, since
writing a numbered ADR is a human decision behind the approval gate. Promoted here after all four
instances were closed, so the decision rests on resolved evidence rather than on open defects.

Related: ADR-0003 (validate generated files at write time) covers whether an artifact *matches* its
schema; this covers whether the schema's fields *mean* anything. The two are complementary — an
artifact can be perfectly valid against a schema whose fields nothing reads.
