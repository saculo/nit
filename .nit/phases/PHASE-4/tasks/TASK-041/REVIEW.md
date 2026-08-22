# Review — Task 41: nit:skills Listing Command

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-22), after three findings fixed during review.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    twenty-two consecutive pull requests.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      Four routing layers plus `other`, each skill naming the modules that associate it and, where it
      applies, the step ids. Verified through the CLI against this repository. The fifth group is a
      deliberate addition, not scope creep: fifteen of this project's twenty-three skills belong to no
      routing layer at all — `init`, `status`, `continue`, the brownfield analysis skills — and a
      listing that omitted them would answer "what is wired" while looking like "what is here".
    </criterion>
    <criterion id="AC-2" result="pass">
      A declared-but-absent skill is listed as `MISSING` with the reason spelled out, and the criterion
      earned its keep on first run: this repository declares `typescript` and `markdown` across all
      three modules and has neither. Language-stub generation lives in `nit:init` Step 7c, on the
      brownfield path only, so a greenfield workspace names a language per module and scaffolds nothing
      for it. That gap has existed since PHASE-2 and nothing could see it.
    </criterion>
    <criterion id="AC-3" result="pass">
      Exits 0 with no arguments and reports the actual tree. The base layer comes from resolving every
      shipped archetype — `boundary-check` is carried only by `cross-module-change`, so a list written
      down inside the command would keep insisting it does not exist. The reversion pass is what
      established this, and it initially failed to: hardcoding the list inside the command changed
      nothing, because the derivation was only tested through the helper. A command-level test now
      covers it.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All three acceptance criteria verified, each through the CLI.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 534 pass, 0 fail (48 added). Reproduced. Verified by reversion: omitting missing
      skills fails 9, dropping on-disk-only skills fails 4, dropping the language layer's modules
      fails 3, hardcoding the step ids fails 1, `--missing` not failing fails 1, and each review fix
      fails 1.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1, RV-2 and RV-3 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced; one declared-and-unread field retired.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The command's shape follows from one observation: routing's silent drop is correct behaviour and
    invisible consequence. TASK-040 answered "why did this task's agent not get that skill"; this
    answers "which skills does this project claim and not have", which is the question you can ask
    before dispatching anything. Listing an absent skill rather than omitting it is the whole design —
    a listing built from `readdir` alone would have reproduced the silence it exists to break.

    Deriving the base layer from the archetypes rather than from a constant is the other decision worth
    defending. It costs an archetype resolution per file and buys the property that adding a step to an
    archetype immediately shows up as a skill the project owes, with no second place to update.

    `moduleSkills` is removed under ADR-0007: declared by the registry schema, scaffolded by
    `nit:init`, and read by nothing since it was written. This task is where it had to be decided
    rather than deferred, because listing those skills would have claimed availability for skills
    routing would never load — the command's first output would have been a lie. Module-scoped skills
    already live on the module in `modules.json`, so nothing is lost but the second place to put them.
    Second such removal in three tasks, after `template` in TASK-039.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The command reads directories and file
    headers, writes nothing, and truncates descriptions so a hostile SKILL.md cannot flood a terminal.
  </security-check>

  <test-quality result="pass">
    Forty-eight tests. Two properties are pinned that would otherwise rot: every group the model
    declares can actually be produced, and the groups come out in composition order.

    The tests against this repository are the ones that will age usefully. One asserts that every step
    of every shipped archetype has a skill on disk — the invariant TASK-036 established and the first
    thing a new step would break. The other asserts that the *only* missing skills are `markdown` and
    `typescript`. It is deliberately not a test that they exist: writing that would assert the gap away
    rather than record it, and this project has twice before encoded a migration state as an invariant
    and paid for it. When someone writes those skills, the test fails and is corrected, which is the
    right way for it to end.

    The limit: nothing here tests that a specialist behaves differently for a missing skill, because
    nothing can. The listing reports what routing would do; whether that matters is downstream.
  </test-quality>

  <scope-check result="pass">
    The inventory module, the command, the CLI wiring, `nit:init`'s verification step, the registry
    schema change, and the tests.

    `nit:init` is the load-bearing edit outside `@nit/cli`: it is where a workspace first declares
    skills it may not have, and a command that reports the gap with nobody running it is decoration.
    The step deliberately forbids creating stubs to make the check pass — an empty SKILL.md is worse
    than an absent one, because routing loads it and the specialist acts on empty guidance.

    Out of scope and left alone: the two missing language skills. Writing them is project content, not
    this task, and the command reporting them is the command working.
  </scope-check>

  <convention-guards>
    <guard description="A declared field must have a consumer (ADR-0007)" result="pass">`moduleSkills` removed from schema, workspace and init template.</guard>
    <guard description="Derived, not written down (AC-3)" result="pass">Base layer resolved from the archetypes; asserted at command level after the reversion found the gap.</guard>
    <guard description="A new capability has a caller" result="pass">nit:init runs `nit skills --missing`; asserted by test.</guard>
    <guard description="A listing is not a verdict" result="pass">Plain form exits 0 with gaps present; `--missing` is the pipeline form.</guard>
    <guard description="Report the gap, do not paper over it" result="pass">init forbids stub-creation to silence the check.</guard>
  </convention-guards>

  <findings>
    - [minor, fixed] RV-1 — the footer counted the filtered view as the project's skills, so
      `nit skills --missing` on this repository reported "2 skills, 2 declared and missing" when the
      project has twenty-three. The number a reader takes away from a filtered view was a statement
      about the filter, not the project. `renderInventory` now takes the inventory size separately.
    - [minor, fixed] RV-2 — the description was read from the first `description:` line anywhere in the
      first 4000 characters, so a skill whose body contains a config example would have had someone
      else's words quoted as its own summary. Several skills in this repository document JSON and YAML
      shapes, so this was live rather than theoretical. Now read from the frontmatter block only.
    - [minor, fixed] RV-3 — two names for one file. `nit:review` and a custom skill called `review`
      resolve to the same `SKILL.md`, and routing composes them into different layers, so the agent
      receives the same guidance twice under two names. This is the same defect class TASK-040's RV-2
      found between the language and custom layers, and this command is where it is visible, because
      it is the only place every skill name is listed side by side. The listing now says so. Not fixed
      in routing: whether `review` as a custom skill is meant to be `nit:review` is a question about
      intent, and guessing it would silently drop a skill someone configured.
    - [note] The first registration of a name wins its group, so a skill that is both a module custom
      skill and a registry global is listed as `custom` only. The routing consequence is correct — the
      custom layer contributes it first and the global entry is a duplicate — but the listing does not
      show that the registry also declares it.
    - [note] `--missing` exits 1, and the plain listing exits 0 even with gaps. Deliberate, and the
      opposite of `nit boundaries` and `nit adr-triggers`, which exit non-zero when they find
      something. A listing that failed would stop being run to find things out.
    - [note] The two missing language skills are the visible half of a structural gap: `nit:init`
      generates stubs only on the brownfield path. A greenfield project silently gets no language layer
      at all, for every module, forever. Fixing that is a change to `nit:init`'s greenfield path and
      belongs in its own task; this one makes it visible and says so at init time.
    - [note] This task targets `@nit/cli` and changes `.claude/skills/`. Sixth consecutive task. This
      is now a finding about the module model rather than about any task, and the phase summary is
      where it should land.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `renderInventory(records, total)` takes the inventory size, and the command passes it when
      showing a filtered view. A test asserts the footer reports the project's count and not the
      filter's.
    </item>
    <item id="RV-2" result="fixed">
      The description is matched inside the leading `---` frontmatter block only; a file without one
      has no description. A test builds a skill whose body contains a `description:` line in a code
      fence and asserts nothing is quoted from it.
    </item>
    <item id="RV-3" result="fixed">
      `sameFile()` groups present records by resolved path, and the listing reports each collision
      naming the file. Four tests: both names listed in their own layers, the collision detected, the
      warning rendered, and an absent file not counted as a collision — two names for one missing skill
      is one gap, not a duplicate. A fifth asserts this repository has none.
    </item>
    <verification>
      `bun test` — 534 pass, 0 fail after all three. Each fix confirmed by reversion.
    </verification>
  </finding-resolution>

</review>
