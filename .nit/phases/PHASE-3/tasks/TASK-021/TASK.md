# TASK-021 — Rewrite nit:review for JSON Step Output

<task>

  <meta>
    <id>TASK-021</id>
    <phase>PHASE-3</phase>
    <title>Rewrite nit:review for JSON Step Output</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>done</status>
  </meta>

  <user-story>
    As the reviewer role dispatched by the supervisor at the review step,
    I want to read the implementation result from the prior step's output.json and emit a schema-valid review-result,
    So that the review step completes inside the deterministic pipeline instead of failing its own input validation on artifacts that ADR-0005 retired.
  </user-story>

  <scope>
    <in-scope>
    - Rewrite `.claude/skills/task-review/SKILL.md` as a v2 step skill: read `input.json`, read `context.priorOutputs`, emit one `output.json` carrying a `review-result`
    - Drop the v1 Step 0 input validation that requires `STEPS.md` and `IMPLEMENTATION.md`; the review reads `priorOutputs.implement` and `priorOutputs.design` instead
    - Keep the substance of the v1 review procedure — acceptance criteria verification, DoD, architecture conformance, security, test quality, scope creep — as the reviewer's checklist, expressed through `review-result.comments[]` with severity
    - Emit the blocked contract (TASK-018) when the review cannot be performed at all, rather than a skill-specific convention
    - Verdict maps to the existing `review-result.verdict` enum: `approved`, `changes-requested`, `rejected`
    - Retire the orphaned `.claude/hooks/validate-review.sh` argument-validation hook if the rewritten skill is supervisor-dispatched
    </in-scope>
    <out-of-scope>
    - PR creation (v1 Step 11) — this moves out of the skill; whether the pipeline opens PRs at all is TASK-025's question as the orchestrator is rewritten
    - Extending `review-result` beyond its existing shape unless an acceptance criterion demands it; prefer using `comments[]` over new fields
    - Boundary enforcement in review — that is its own PHASE-3 task
    - Writing `REVIEW.md` — ADR-0005 makes `output.json` the sole artifact
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a completed implement step whose output.json is in context.priorOutputs,
      When the reviewer runs the review step,
      Then it produces an output.json carrying a review-result with a verdict and comments, and that output validates against step-output.schema.json.
    </criterion>
    <criterion id="AC-2">
      Given a review that finds defects,
      When the reviewer records them,
      Then each appears as a comments[] entry with a message and a severity of info, warning, or error, and a verdict of changes-requested or rejected rather than approved.
    </criterion>
    <criterion id="AC-3">
      Given a review step for a task whose implement step produced no output,
      When the reviewer cannot perform the review,
      Then it emits the TASK-018 blocked contract with a reason code and explanation rather than stopping with prose.
    </criterion>
    <criterion id="AC-4">
      Given the rewritten skill,
      When it is inspected for v1 artifacts,
      Then it references neither STEPS.md nor IMPLEMENTATION.md nor writing REVIEW.md, and its documented worked example validates against the schema.
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
    - TASK-017 (the design/implement JSON output contract this review reads)
    - TASK-018 (the blocked contract required by AC-3)
  </dependencies>

  <notes>
    **Why this is first.** The v1 nit:review skill could not run its own Step 0 for either TASK-017 or
    TASK-018, because it requires the prose artifacts ADR-0005 retired. Both reviews were conducted
    manually and recorded the deviation. Until this lands, no task can complete its archetype through
    the supervisor, so every later migration task inherits the same manual workaround.

    **Reviewer independence.** The v1 skill assumed a human-triggered review. Under the supervisor the
    reviewer is an agent dispatched at the review step, which means it may review work another agent
    in the same run produced. That is a known weakness of the pipeline rather than of this task, but
    the rewritten skill should not pretend otherwise — it should state what it verified by execution
    versus by reading.
  </notes>

</task>
