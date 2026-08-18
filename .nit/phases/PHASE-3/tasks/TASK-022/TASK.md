# TASK-022 — Dedicated nit:qa Step Skill

<task>

  <meta>
    <id>TASK-022</id>
    <phase>PHASE-3</phase>
    <title>Dedicated nit:qa Step Skill</title>
    <type>qa</type>
    <module>.claude/skills</module>
    <status>todo</status>
  </meta>

  <user-story>
    As the qa role dispatched by the supervisor at the final archetype step,
    I want a step skill that validates behaviour against the acceptance criteria and reports a structured qa-result,
    So that the fifth step of every archetype actually runs instead of being a step id with no skill behind it.
  </user-story>

  <scope>
    <in-scope>
    - Create `.claude/skills/qa/SKILL.md` as a v2 step skill: read `input.json` and `context.priorOutputs`, emit one `output.json` carrying a `qa-result`
    - Define what QA does that review does not: exercise the acceptance criteria against running behaviour, rather than reading the diff. Review judges the change; QA judges the result
    - Report `testsRun`, `testsPassed`, `testsFailed`, optional `coverage`, and `issues[]` for behaviour that does not match an acceptance criterion
    - Emit the blocked contract (TASK-018) when QA cannot be performed — no runnable target, no test command, criteria not verifiable
    - Resolve the naming collision: the archetype step role is `qa` while `.claude/agents/` has no `qa` agent file (it has `qa.md` for the role and PHASE-1 shipped `qa-engineer.md` under `.nit/agents/`). Settle one name and make the archetype, agent file, and skill agree
    </in-scope>
    <out-of-scope>
    - Writing the project's tests — those are DoD for every task, not QA's job
    - Coverage tooling or thresholds; `coverage` stays an optional report of what the project already measures
    - Performance or load testing
    - Extending `qa-result` beyond its existing shape unless an acceptance criterion demands it
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given an implemented and reviewed task,
      When the qa step runs,
      Then it produces an output.json carrying a qa-result with testsRun, testsPassed, and testsFailed, and that output validates against step-output.schema.json.
    </criterion>
    <criterion id="AC-2">
      Given behaviour that does not satisfy an acceptance criterion,
      When QA records it,
      Then the mismatch appears in issues[] naming the criterion, and testsFailed is non-zero rather than the outcome being reported only in prose.
    </criterion>
    <criterion id="AC-3">
      Given a task whose acceptance criteria cannot be exercised — no runnable target or no test command,
      When the qa step runs,
      Then it emits the TASK-018 blocked contract rather than reporting zero tests as if that were a pass.
    </criterion>
    <criterion id="AC-4">
      Given the resolved archetype for any concrete archetype that includes the qa step,
      When the supervisor dispatches it,
      Then the step role, the agent definition, and the skill name agree, and routing resolves the base skill to a SKILL.md that exists on disk.
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
    - TASK-018 (the blocked contract required by AC-3)
    - TASK-021 (nit:review rewrite; qa follows review in every archetype, and the two must not duplicate each other's job)
  </dependencies>

  <notes>
    **AC-4 is the hidden work.** `base.json` declares the step role as `qa`, and `routing-resolver`
    derives the base skill by convention as `nit:qa`. With no `.claude/skills/qa/SKILL.md` on disk the
    layer is silently dropped — routing treats a missing skill as normal, not an error — so today the
    qa step would dispatch with an empty instruction set rather than failing loudly. Creating the skill
    closes that, but the role/agent naming should be settled at the same time or the next reader hits
    the same ambiguity.

    **Scope discipline.** The risk with a QA step is that it becomes a second review. The distinction
    to hold: review reads the change, QA runs the result. If a criterion can only be checked by reading
    code, it belonged to review.
  </notes>

</task>
