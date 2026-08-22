# Review — Task 42: task-types.json Is Keyed by Archetype, Not Task Type

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-23), after one finding fixed during review. The task's central change reaches
    into a second task's scope, which is recorded rather than glossed.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    twenty-three consecutive pull requests.

    One deviation specific to this task: it substantially completes TASK-033, which is still `draft`.
    That is recorded in the findings and left for the user to close or re-scope; deciding it here would
    be closing someone else's task on their behalf.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      All four task types from `task.schema.json`'s enum have entries, each with a `defaultArchetype`
      naming a shipped, non-abstract archetype. The schema now requires the field rather than hoping
      for it — left optional, an entry could exist and still leave the Archetype Proposal with nothing,
      which is the same failure one level down from the one this task fixes.
    </criterion>
    <criterion id="AC-2" result="pass">
      Settled as task types, and the settlement is forced rather than asserted: a test compares the
      `nit:init` template against the shipped registry and fails if they diverge. The reasoning is that
      the file's name, its schema title and its only consumer all say task types, while the archetypes
      already exist as files in `cli/archetypes/` — the old contents were a second registry of a thing
      that already had one. `nit:init`'s section now states why the key matters, so the next person to
      edit it knows what breaks.
    </criterion>
    <criterion id="AC-3" result="pass">
      Asserted per task type, and it did not pass as written — see the qa finding below. The strongest
      form of this check is not the per-type assertion but the one behind it: every engineer role the
      resolver knows is reachable from some shipped archetype. That is the invariant that was broken,
      and it fails if a future archetype change breaks it again.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All three acceptance criteria verified.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 566 pass, 0 fail (32 added). Reproduced. Verified by reversion: re-keying by
      archetype fails 4, removing the qa entry fails 4, hardcoding `infra-engineer` again fails 2, and
      making `defaultArchetype` optional fails 2.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed; the remaining items recorded as notes.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The defect was a lookup that could never succeed, and its worst property was how it failed. A
    missing default is indistinguishable from an analyst exercising judgement, so the Archetype
    Proposal appeared to work for as long as the registry has existed. This is the fourth defect in
    this phase of the form "a declared thing that nothing successfully reads", after the archetype
    fields in TASK-022, `template` in TASK-039, and `moduleSkills` in TASK-041. ADR-0007 was written
    for the first three; this one is the same shape with the consumer present and the key wrong.

    The qa change is the more consequential half and is right on the merits, not only because AC-3
    demanded it. An archetype describes a **step sequence**; the engineer follows from the task's type.
    `bugfix` and `cross-module-change` already said so with `$detect`, and `infra-change` disagreed for
    no reason anyone recorded. Deferring makes the three consistent, leaves `devops` behaviour
    byte-identical, and makes the qa engineer reachable for the first time.

    What this does not do is give qa its own archetype. `infra-change` now dispatches correctly for a
    qa task but reads oddly as a name, and that residue is what remains of TASK-033.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The change is registry data, a schema
    constraint, one archetype field, and tests.
  </security-check>

  <test-quality result="pass">
    Thirty-two tests. The best of them assert relationships between files rather than the contents of
    one: every task type in the schema has an entry, every `defaultArchetype` names a shipped
    archetype, no entry is keyed by an archetype id, and the init template equals the workspace
    registry. Each of those would have failed on the state this task found, which is the test one wants
    for a defect that was invisible.

    The reachability test is the one with the longest life. It does not care which archetype provides
    which role, so it survives a future `qa-setup` archetype and still fails if a role becomes
    orphaned.

    RV-1 came from asking what the tests did *not* cover: reachable is not dispatchable. The qa role
    had never been reached, so nothing had exercised the rest of its path.
  </test-quality>

  <scope-check result="pass">
    The registry, its schema, the `nit:init` template, one archetype field, and the tests.

    The archetype edit is the scope question. It belongs here because AC-3 cannot be satisfied without
    it: no shipped archetype reached the qa engineer, so a qa entry would have carried a default that
    dispatched the wrong specialist — worse than no default, because nothing downstream questions a
    specialist that turns up. Recorded as overlapping TASK-033 rather than absorbed silently.

    Out of scope and left alone: a dedicated qa archetype, and the thirty tasks in this workspace with
    no `archetype` at all, which is v1 residue and not this task's business.
  </scope-check>

  <convention-guards>
    <guard description="A declared thing must be successfully read" result="pass">The lookup key now matches what the consumer looks up; asserted from both sides.</guard>
    <guard description="A template must match what ships" result="pass">init template compared against the workspace registry by test.</guard>
    <guard description="An archetype describes steps, not specialists" result="pass">infra-change defers to $detect, consistent with bugfix and cross-module-change.</guard>
    <guard description="Every role a task type implies is dispatchable" result="pass">Added as RV-1: agent file, roles entry, routing rule.</guard>
    <guard description="Existing behaviour changes are asserted, not assumed" result="pass">A devops task still reaches infra-engineer; asserted directly.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — reachable is not dispatchable. Making the qa engineer reachable from an
      archetype is only the first hop; dispatch also needs an agent definition, a `roles.json` entry,
      and a `role-routing.json` rule carrying the implement skill. Because the role had never been
      reachable, none of that had ever been exercised, and a gap would have surfaced at dispatch —
      later and harder to read than a proposal-time failure. Checked for all four engineers and all
      four are complete, so this is a confirmation rather than a repair; the tests are the fix, since
      the property was true by luck rather than by assertion.
    - [note] `infra-change` now defers the engineer, which changes behaviour for any task that paired a
      **non-devops** type with it: a backend task on `infra-change` now gets `backend-engineer` where it
      previously got `infra-engineer`. That is the intended reading — the type decides the specialist —
      but it is a silent change for anyone who chose the pairing to get the infrastructure engineer.
      No task in this workspace is affected: all eleven `infra-change` tasks are `devops`, checked
      rather than assumed.
    - [note] This substantially completes TASK-033. Its AC-1 (a qa task's archetype dispatches to the
      qa engineer) and AC-2 (every task type's engineer reachable, asserted by test) are now satisfied
      here, and its AC-3 depended on this task's registry. What remains is a dedicated `qa-setup`
      archetype, which is a naming and clarity improvement rather than a defect. Left `draft` for the
      user to close or re-scope — deciding it here would be closing another task on their behalf.
    - [note] `qa`'s default is `infra-change`, whose steps and engineer are now correct and whose name
      is not. A test-harness task is infrastructure work in this project, so the pairing is defensible,
      but the name will read as a mistake to someone who has not read this review.
    - [note] Three of the six shipped archetypes are now no type's default — `bugfix`,
      `cross-module-change`, `architecture-decision` are reachable only when the analyst refines the
      proposal. That is correct (they describe situations, not types) but it means the registry no
      longer enumerates the archetypes, and nothing else does either except the prose list in
      `nit:tasks` and `nit:analyze`. `nit archetype` can resolve one but not list them.
    - [note] Thirty tasks in this workspace carry no `archetype` at all. Pre-v2 residue, unrelated to
      this change, and invisible to these tests because they read the registry rather than the tasks.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      Twelve tests assert that every engineer role in `ENGINEER_ROLE_FOR_TASK_TYPE` has an agent
      definition in `.claude/agents/`, an entry in `roles.json`, and a `role-routing.json` rule that
      includes the implement skill. All four pass against the current tree, so the newly reachable qa
      path is complete end to end rather than merely proposable.
    </item>
    <verification>
      `bun test` — 566 pass, 0 fail.
    </verification>
  </finding-resolution>

</review>
