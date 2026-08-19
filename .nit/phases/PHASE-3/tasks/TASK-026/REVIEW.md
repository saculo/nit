# Review — Task 26: Stop Scaffolding v1 Artifacts and Remove Orphaned Machinery

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-19) at first pass, after one finding raised during review was fixed.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: v1 prose records, implementation and review in one session, and
    CodeRabbit skipping — eight consecutive pull requests.

    This task is mostly **deletion**, which changes what review has to prove. For the earlier tasks the
    question was whether new behaviour is correct; here it is whether anything depended on what was
    removed. That was checked by grepping every reference to the deleted trees and hooks across the
    repository, and by confirming recovery from git actually works rather than asserting it in an ADR.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      The `artifact-types.json` template declares eleven nit-owned types, all of which the v2 pipeline
      writes, with patterns pointing at real paths including the `STEP-*/` directories. None of
      `DESIGN.md`, `STEPS.md`, `IMPLEMENTATION.md`, or `REVIEW.md` appears. Two tests cover it: one
      asserting the retired names are absent, one asserting the replacements point at the files that
      exist — the second matters because removing the old entries without adding correct ones would
      have satisfied the criterion while leaving the registry useless.
    </criterion>
    <criterion id="AC-2" result="pass">
      Four init templates — artifact-types, task-types, roles, role-routing — are extracted from the
      SKILL.md and validated against their schemas, so the generated workspace satisfies ADR-0003 by
      construction rather than by inspection. Passing only after RV-1 for the directory half of the
      criterion.
    </criterion>
    <criterion id="AC-3" result="pass">
      Five orphaned hooks deleted; five remain, each verified wired to a live skill. Two tests hold the
      invariant from both ends — no hook script without a skill referencing it, and no skill
      referencing a script that is gone. Checking only the first direction would have let a skill point
      at a hook that was deleted.
    </criterion>
    <criterion id="AC-4" result="pass">
      Q-4 is settled as ADR-0006 with the reasoning, the rejected alternatives, and the recovery path.
      `.nit/skills/`, `.nit/hooks/` and `.nit/agents/` are gone; `.nit/` now holds only `adr/`,
      `config/`, `phases/`, `plr/` and the v1 `CLARIFICATIONS.md`. The ADR states its own confirmation
      and a test enforces it, so the decision is not merely recorded but held.
      `.nit/agents/` was not named in the criterion but is the same class and the same staleness — it
      held `devops-engineer`, `qa-engineer` and `requirement-gatherer`, none of which exist under those
      names. Deleting the two named trees and leaving the third would have been literal compliance and
      an incoherent result.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 242 pass, 0 fail (13 added). Reproduced by the reviewer. Every hygiene check was
      verified by injecting the failure it guards: an orphaned hook, a reappearing `.nit/skills` tree, a
      retired artifact back in the template, and a removed `mkdir`.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced. Two observations below.</item>
  </dod-check>

  <architecture-conformance result="pass">
    ADR-0006 is the substance of this task and it is argued from the principle rather than from
    convenience: `.nit/` holds what a *project* accumulates, and nit's own machinery is not project
    state — the CLI already lives outside it. Keeping agents and skills in `.nit/` was the
    inconsistency; the divergence was its symptom. The ADR records both rejected options with reasons,
    including why sync tooling would have been a permanent cost to preserve a duplication nothing read.

    ADR-0003 is strengthened rather than merely respected: the init templates are now validated by
    test, so "validate at write time" is enforced against the templates themselves and not only against
    the files a run produces.

    One consequence the ADR names and does not dodge: `nit:init` no longer has any source for skills
    and agents in a target project. That is correct — distribution is PHASE-4's question — but it means
    the scaffold is now workspace-only, and the ADR says so rather than leaving a reader to discover it.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The deletions reduce surface: five hook
    scripts that executed on `PreToolUse` for skills that no longer take arguments are gone, and a tree
    of stale skill definitions that could have been dispatched by mistake no longer exists.
  </security-check>

  <test-quality result="pass">
    Thirteen tests, and the design is right for a task whose output is mostly absence: every check
    asserts a property of the repository rather than of a function, so the cleanup cannot silently
    regress.

    The strongest is the pair added for RV-1 and AC-1 together — the registry's patterns and init's
    `mkdir` list are now cross-checked against each other, so the scaffold and the registry cannot
    drift apart again. That check found the defect it was written for on its first run, which is the
    best evidence a conformance test can offer.

    All four checks were verified by injection. Worth recording that this discipline, adopted after
    TASK-024's first conformance check would have passed the bug it guarded, has now caught two real
    defects across three tasks — it is no longer just diligence.

    One limitation: these tests read the SKILL.md templates, not a real `nit:init` run. Nothing here
    proves init executes correctly, only that what it would write is coherent. Running init for real is
    not feasible in this suite, and the templates are the thing that was wrong.
  </test-quality>

  <scope-check result="pass">
    Init's templates, the hooks sweep, the tree deletions, the ADR, and the tests. `.nit/agents/` and
    the `.nit/adr` mkdir both go slightly beyond the letter of the criteria and both are defended
    above and in RV-1.

    Out-of-scope respected: this repository's v1 `.nit/` workspace is not migrated, no global namespace
    work was attempted, and no step skill's output changed. The PHASE-1 records that reference the
    deleted trees were deliberately left alone — they are history, and they describe what was true when
    written.
  </scope-check>

  <convention-guards>
    <guard description="Validate at write time (ADR-0003)" result="pass">Four init templates validated against their schemas by test.</guard>
    <guard description=".nit/ is project state, not nit infrastructure" result="pass">ADR-0006; enforced by test.</guard>
    <guard description="Every hook is wired to a live skill" result="pass">Asserted from both directions.</guard>
    <guard description="Declared artifacts must be ones the pipeline writes" result="pass">Retired names absent, replacements verified against real filenames.</guard>
    <guard description="A declared artifact's directory must be created" result="pass">Fixed as RV-1; cross-checked by test.</guard>
    <guard description="History is not rewritten to match the present" result="pass">PHASE-1 records referencing the deleted trees left intact.</guard>
  </convention-guards>

  <findings>
    - [minor, fixed] RV-1 — init created `.nit/decisions`, which nothing writes to, and did **not**
      create `.nit/adr`, which is where ADRs actually go and where init's own `artifact-types` template
      points. The scaffold and the registry disagreed about the workspace, which is the same defect as
      declaring an artifact the pipeline never writes — this task's whole subject — reached from the
      other direction. It survived the original AC-1 pass because that criterion looks at declared
      types, not at whether their directories exist.
    - [note] `.nit/decisions` remains in the mkdir list. PHASE-3's scope plans an `adr-index.json`
      there, so removing it would preempt a decision that task owns — but it means init still creates
      one directory nothing writes to, and the split between `adr/` for records and `decisions/` for an
      index is unexplained. Worth settling when the adr-index task runs, not before.
    - [note] `.nit/logs` is created for PHASE-4 run logging that does not exist yet. Same shape as
      `decisions/`, and the same argument for leaving it: a planned task owns it. Both sit slightly
      against the YAGNI rule `nit:phases` enforces on itself.
    - [note] During implementation, `git checkout` was used to undo a test injection on a file with
      uncommitted changes, silently reverting the artifact-types migration. It was caught because the
      injection test kept failing after the supposed restore, the change was reapplied, and the earlier
      committed edits to that file were verified intact. The verification was then redone with a file
      copy. Recorded because the failure mode is quiet: a destructive undo used as a cheap one, on a
      task whose subject is deletion.
    - [note] An unrelated untracked file, `PHASE-4/tasks/TASK-020/TASK.md`, was swept into the staging
      area by `git add -A .nit` and unstaged before committing. `git add -A` on a directory containing
      someone else's untracked drafts is worth avoiding.
    - [note] With this task the v1 to v2 migration is complete: no skill reads or writes a retired
      prose artifact, all five step skills resolve, and a freshly scaffolded workspace describes only
      what v2 produces.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `mkdir -p .nit/adr` added to init's directory step. A new test derives the set of directories init
      creates from its own `mkdir` lines, derives the set the `artifact-types` patterns reference, and
      asserts the second is a subset of the first — so the scaffold and the registry are checked against
      each other rather than each against an assumption. Verified by removing the `mkdir` again and
      confirming the test fails.
    </item>
    <verification>
      `bun test` — 242 pass, 0 fail after the fix.
    </verification>
  </finding-resolution>

</review>
