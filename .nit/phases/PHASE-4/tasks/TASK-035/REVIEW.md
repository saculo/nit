# Review — Task 35: Boundary Enforcement at Ingest

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-20), after two findings fixed during review. A third — what the enforcement
    reveals about this repository's own tasks — is recorded rather than resolved, because it is a
    question about the module model and not a defect in this task.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    sixteen consecutive pull requests.

    This task is the first in the project that will **reject other people's work**. A false positive
    here does not mislead a reader; it blocks a step and burns the reopen budget. That raises the cost
    of the missing independent review more than any previous task, and the mitigation used — pointing
    the finished enforcement at the repository's own merged history — is the closest available
    substitute for someone else trying it.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      A change reaching a forbidden module fails validation, verified through the real CLI as well as
      by test: a `@nit/cli` task editing `.claude/skills/design/SKILL.md` produced a violation quoting
      the rule that forbids it. Files in the task's own module and files no module owns are correctly
      not violations.
    </criterion>
    <criterion id="AC-2" result="pass">
      Answered structurally rather than by convention. `validation-result` has carried `schemaValid`
      and `policyValid` since PHASE-2 with nothing ever setting `policyValid` false; a boundary
      violation is precisely a policy failure on a well-formed artifact. A reader distinguishes the two
      by a declared field rather than by parsing a message prefix, and a test asserts both directions —
      boundary sets `policyValid: false`, malformed output sets `schemaValid: false`.
      This is the fifth field in the project found declared and unread, and the first wired up by
      needing it rather than by auditing for it.
    </criterion>
    <criterion id="AC-3" result="pass">
      A compliant output advances exactly as before and writes no `validation.json`. The 309 tests
      that existed before this task all still pass untouched, which is the strongest evidence for "as
      before" — the change is inert on every path that does not configure boundaries.
    </criterion>
    <criterion id="AC-4" result="pass">
      Checking runs only when the project supplies both a module registry and a rule set. Verified two
      ways: through the CLI with `--rules` pointing at a missing file, and by test with neither
      supplied. A project that configured nothing is unaffected.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified, AC-1 and AC-4 through the CLI.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 331 pass, 0 fail (22 added). Reproduced by the reviewer. Both mechanisms verified by
      reversion: not setting `policyValid` fails 1, removing the own-record exclusion fails 1.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 and RV-2 fixed; RV-3 recorded for decision.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The enforcement asks TASK-034's question once per changed file, which keeps the precedence decision
    in one place rather than re-deciding it here. `moduleForPath` resolves by longest prefix so a
    nested module is not shadowed, and a file no module owns is ignored — a repository may contain
    files no module claims, and treating those as violations would make the rule unusable in any real
    project.

    Only implementation results are checked, because only they report changed files. A design or review
    step cannot violate a boundary it does not touch.

    The own-record exclusion is the judgement this task turns on. Every task writes its own
    `.nit/phases/*/tasks/<id>/` record — task definition, step outputs, review — and counting that as a
    dependency flagged all five recent tasks in the first measurement. That is the failure PHASE-4's
    risk register names in advance: "a rule that cries wolf gets disabled". Excluding it is not
    weakening the rule; the workflow recording itself was never the dependency the rule is about.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The rules data is read, not executed. The
    failure mode worth naming is availability rather than confidentiality: an over-broad rule blocks
    legitimate work, which is why AC-4's opt-in and the own-record exclusion matter as much as the
    detection itself.
  </security-check>

  <test-quality result="pass">
    Twenty-two tests across mapping, checking and ingest. The mapping table covers the nested-module
    and unowned-file cases that would otherwise be discovered in production, and the ingest suite
    asserts both halves of AC-2 rather than only the new one — a boundary violation sets
    `policyValid: false` *and* a malformed output still sets `schemaValid: false`.

    The strongest verification is not in the suite. Running the finished enforcement against the
    repository's own merged history found that it flagged five of five recent tasks, which no unit
    test would have shown, and which turned out to be one systematic false positive plus four genuine
    crossings. A rule that has never been run against real history is a guess about what it will
    accept.
  </test-quality>

  <scope-check result="pass">
    `boundary-check.ts`, the ingest wiring, the CLI flag, and the tests. Two edits reach further and
    both are consequences: `ingestInvalid` gained an optional validity argument because a policy
    failure is not a schema failure, and `nit:implement` gained the guidance in RV-1.

    Deliberately not done: no further exclusions were added for ADRs, tests or reviews, despite each
    accounting for a remaining violation. That is RV-3, and adding exclusions until the rule stops
    complaining is how a rule becomes decorative.
  </scope-check>

  <convention-guards>
    <guard description="A declared field must have a consumer (ADR-0007)" result="pass">policyValid, declared since PHASE-2, is now set and asserted in both directions.</guard>
    <guard description="Additive for projects that have not opted in" result="pass">Requires both registry and rules; 309 pre-existing tests pass untouched.</guard>
    <guard description="Enforcement the specialist is told about" result="pass">Fixed as RV-1 and pinned by conformance test.</guard>
    <guard description="Verified against real history, not only fixtures" result="pass">Run against five merged tasks; results recorded in RV-3.</guard>
    <guard description="Verified by reversion" result="pass">Both mechanisms broken and confirmed to fail.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — `nit:implement` said nothing about boundary errors, so the engineer received
      a `repairError` beginning `boundary:` with no guidance. Worse than silence: the natural response
      to a repair error is to try again, and for a task that genuinely spans two modules **no attempt
      can succeed** — it burns the reopen budget until the task escalates. The blocked contract already
      has the right answer, `needs-splitting`, and nothing connected the two.
      The skill now explains the `policyValid` distinction, names the two honest responses, and states
      which is which: put the change back if it was avoidable, emit `needs-splitting` if the task
      genuinely spans modules. It also forbids the third option nobody would admit to — passing the
      step by leaving the cross-module work out.
    - [minor, fixed] RV-2 — the own-record exclusion matched any path containing `/tasks/<id>/`, so
      `vendor/tasks/TASK-035/thing.ts` was excluded from checking. `tasks` is a common directory name;
      a loose substring match in a rule that decides whether work is blocked is the wrong kind of
      lenient. Now anchored to `.nit/phases/*/tasks/<id>/`.
    - [major, recorded for decision] RV-3 — with the systematic false positive removed, the enforcement
      still flags four of five recent merged tasks, and inspection says they are **genuine**:
      TASK-031 (`@nit/cli`) edited seven SKILL.md files; TASK-032 (`@nit/workspace`) wrote tests;
      TASK-034 (`@nit/cli`) edited another task's record; TASK-026 (`@nit/skills`) wrote ADR-0006.
      Either this project has been routinely breaking its own one-task-one-module rule, or the module
      model is too coarse — ADRs, reviews and tests are cross-cutting artifacts that do not belong to
      whichever module's code changed. Both readings are plausible and they lead to different fixes:
      the first means task planning must get stricter, the second means the model needs an
      artifact-versus-code distinction.
      Not resolved here, and no exclusions were added to make the number go down. Adding one per
      complaint is how a rule ends up enforcing nothing, which is the state `dependency-rules.json` was
      in before TASK-034.
    - [note] A boundary violation currently consumes the reopen budget and can escalate. That is right
      for an avoidable crossing and wrong for a task that genuinely spans modules — RV-1's guidance
      routes the second case to `needs-splitting` before the budget runs out, but nothing enforces it.
      A specialist that ignores the guidance still escalates after three attempts.
    - [note] `changedPaths` reads only `result.filesChanged`. A task that changed a file and did not
      report it is invisible to the check. That is inherent to enforcing against a self-reported list
      rather than against the diff, and it is worth knowing that this checks what the engineer *says*
      it changed.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `nit:implement` gains a "Boundary errors" section: what the `boundary:` prefix means, the
      `schemaValid`/`policyValid` distinction, the two honest responses, and the instruction to emit
      `needs-splitting` rather than retry when the task genuinely spans modules. A conformance test
      asserts the skill mentions `boundary:`, `policyValid`, `needs-splitting` and the reopen budget,
      so the guidance cannot quietly disappear.
    </item>
    <item id="RV-2" result="fixed">
      `isOwnRecord` is anchored to `^\\.nit/phases/[^/]+/tasks/<id>/`. Verified: the task's own record
      matches with and without a leading `./`, another task's record does not, and `vendor/tasks/...`
      and `src/tasks/...` no longer do.
    </item>
    <item id="RV-3" result="recorded for decision">
      Left open deliberately. The measurement is in this review; the decision is whether task planning
      or the module model is wrong, and it belongs to whoever owns the phase's scope rather than to the
      task that happened to surface it.
    </item>
    <verification>
      `bun test` — 331 pass, 0 fail after both fixes.
    </verification>
  </finding-resolution>

</review>
