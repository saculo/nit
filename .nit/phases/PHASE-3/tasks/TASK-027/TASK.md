# TASK-027 — Rejection Routing Must Target a Step That Exists

<task>

  <meta>
    <id>TASK-027</id>
    <phase>PHASE-3</phase>
    <title>Rejection Routing Must Target a Step That Exists</title>
    <type>devops</type>
    <module>@nit/cli</module>
    <status>todo</status>
  </meta>

  <user-story>
    As someone rejecting a step on a task whose archetype removed steps from the base sequence,
    I want the rejection to reopen a step that is actually in the task's step order,
    So that `/nit:reject` does not leave the task pointing at a step that does not exist and crash the next `/nit:continue`.
  </user-story>

  <scope>
    <in-scope>
    - Fix `applyOverrides` / `resolveArchetype` in `cli/src/archetype-resolver.ts` so rejection routing cannot name a removed step. Today it deletes entries *keyed* by a removed step but never entries whose *target* was removed
    - Decide the fallback for an orphaned target — self-routing to the rejected step is the obvious candidate, since that is what the base archetype already does for `analyze`, `design`, and `implement`
    - Validate the invariant at resolution time: every `rejectionRouting` value must be a member of the resolved step list, and an archetype that cannot satisfy it should fail loudly rather than resolve into a broken state
    - Consider the same guard in `rejectState`, so a hand-edited or hand-authored archetype cannot move `currentStepId` outside `stepOrder`
    - Cover every shipped archetype, not only the one where the defect is currently visible
    </in-scope>
    <out-of-scope>
    - Redesigning the rejection-routing model or making it configurable per task
    - The `architecture-decision` archetype's step sequence itself — removing `implement` is correct for that archetype; only the stale routing entry is wrong
    - Recovery tooling for a task already left in the broken state; the manual `state.json` transition documented in `continue/SKILL.md` covers it
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given any archetype whose overrides remove a step,
      When it is resolved,
      Then no rejectionRouting entry names a removed step as its target, and every remaining target is a member of the resolved step list.
    </criterion>
    <criterion id="AC-2">
      Given an architecture-decision task parked at awaiting_approval on the review step,
      When the reviewer's work is rejected,
      Then the task reopens a step that exists in its stepOrder, and the following prepare produces a dispatch descriptor rather than throwing.
    </criterion>
    <criterion id="AC-3">
      Given an archetype authored with a rejectionRouting target that is not one of its steps,
      When it is resolved,
      Then resolution fails with a message naming the offending step and target, rather than returning an archetype that breaks at reject time.
    </criterion>
  </acceptance-criteria>

  <definition-of-ready>
  - User story defined in BDD format
  - Acceptance criteria defined in Given/When/Then format
  - Dependencies identified
  - No blocking open questions
  </definition-of-ready>

  <definition-of-done>
  - All acceptance criteria passed
  - Tests written and passed
  - Code review passed
  - No critical tech debt introduced
  </definition-of-done>

  <dependencies>
    - TASK-019 (the archetype inheritance and override resolution this corrects)
  </dependencies>

  <notes>
    **The defect, concretely.** `architecture-decision` removes `implement` and `qa`, but inherits
    `rejectionRouting.review = "implement"` from `base`. `resolveArchetype` deletes routing entries
    keyed by a removed step, so the `implement` and `qa` *keys* go — but the `review` entry still
    *points at* `implement`. Rejecting the review step therefore sets `currentStepId` to a step absent
    from `stepOrder`; `currentIndex()` returns `-1`, and the next `prepare()` dereferences
    `steps[-1]` — `undefined` — and throws. Reproduced directly against the resolver:

        reopened step: implement
        stepOrder:     ["analyze","design","review"]
        currentIndex:  -1   steps[i]: undefined

    **Why now.** The defect predates this phase, but TASK-021 made it materially more reachable. Before
    the review skill was rewritten, `nit:review` resolved to a directory that did not exist, so the
    review step could not run properly and rejecting it was unlikely. With the review step working and
    gated for approval, rejecting a review is a routine action — and on this one archetype it breaks
    the task. Raised as a finding in the TASK-021 review and split out rather than fixed there, to keep
    that task to the skill rewrite.

    **Why AC-3 matters more than the specific fix.** Silently resolving into a broken state is the
    real problem; `architecture-decision` is just the instance that exists today. Any future archetype
    that removes a step can reintroduce it. Validating the invariant at resolution time is what stops
    the class, not the one-line data fix.
  </notes>

</task>
