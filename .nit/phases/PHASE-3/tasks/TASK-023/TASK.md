# TASK-023 — Rewrite nit:phase-summary for JSON Output and PLR

<task>

  <meta>
    <id>TASK-023</id>
    <phase>PHASE-3</phase>
    <title>Rewrite nit:phase-summary for JSON Output and PLR</title>
    <type>devops</type>
    <module>.claude/skills</module>
    <status>todo</status>
  </meta>

  <user-story>
    As the architect closing a completed phase,
    I want to aggregate the phase's step outputs from their output.json files and emit a structured summary plus a Phase Learning Record,
    So that deviations and tech debt recorded across a dozen tasks become input to the next phase's planning instead of dying in per-task artifacts nobody re-reads.
  </user-story>

  <scope>
    <in-scope>
    - Rewrite `.claude/skills/phase-summary/SKILL.md` to read `task.json` and each task's step `output.json` files, not `DESIGN.md` / `IMPLEMENTATION.md` / `REVIEW.md`
    - Aggregate from structured fields: `implementation-result.deviations[]`, `implementation-result.techDebt[]`, `review-result.comments[]`, `qa-result.issues[]`, and `adrCandidates[]` across every task in the phase
    - A `phase-summary.schema.json` for the machine-readable output: milestone verification, per-task roll-up, aggregated deviations and tech debt, impact on future phases, and the ADR candidates promoted
    - Keep the Phase Learning Record as prose in `.nit/plr/` — it is written for humans and is not step output, so ADR-0005 does not apply
    - Update the phase's `status` to `done` only when the milestone is verified as reached
    - Handle a phase whose tasks are recorded as v1 prose (this repository's own workspace) by reporting what it cannot read rather than failing
    </in-scope>
    <out-of-scope>
    - Promoting adrCandidates to numbered ADRs automatically — collecting them is in scope, writing `.nit/adr/` files stays behind a human gate
    - Retrofitting completed PHASE-1 and PHASE-2 summaries to the new format
    - The adr-index.json work, which is its own PHASE-3 task
    </out-of-scope>
  </scope>

  <acceptance-criteria>
    <criterion id="AC-1">
      Given a phase whose tasks all completed through the supervisor,
      When nit:phase-summary runs,
      Then it emits a machine-readable summary validating against phase-summary.schema.json, aggregating deviations, tech debt, and adrCandidates read from the tasks' step outputs.
    </criterion>
    <criterion id="AC-2">
      Given a phase where the milestone was not reached,
      When nit:phase-summary runs,
      Then it reports the milestone as not met with the specific criteria outstanding, and does not set the phase status to done.
    </criterion>
    <criterion id="AC-3">
      Given the aggregated deviations and tech debt,
      When the summary is written,
      Then each item is traceable to the task that reported it, and items with impact on a later phase are named as recommendations for that phase.
    </criterion>
    <criterion id="AC-4">
      Given a phase containing tasks recorded as v1 prose artifacts,
      When nit:phase-summary runs,
      Then it summarises what it can and reports the unreadable tasks explicitly, rather than throwing or silently omitting them.
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
    - TASK-017 (implementation-result deviations and techDebt fields this aggregates)
    - TASK-021 and TASK-022 (review-result and qa-result, the other two sources)
  </dependencies>

  <notes>
    **AC-4 is not hypothetical.** This repository's own `.nit/` workspace holds PHASE-1 and PHASE-2 as
    `PHASE.md` and `TASK.md` prose, so the first real invocation of the rewritten skill will hit mixed
    v1 and v2 tasks. A skill that throws on the first unreadable task is useless here. Degrading
    honestly — summarise what parses, name what does not — is the requirement, and it is also what
    makes the skill safe for any brownfield adopter mid-migration.

    **Why the PLR stays prose.** ADR-0005 governs step output. A Phase Learning Record is a
    retrospective written to be read by people; forcing it into JSON would lose the part that carries
    the value. The machine-readable summary and the human PLR are two artifacts with two audiences,
    and that is deliberate rather than an inconsistency.
  </notes>

</task>
