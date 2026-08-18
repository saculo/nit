# Review — Task 24: Rewrite nit:status for v2 Artifacts

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-18) at first pass, after two findings raised during review were fixed. Both were
    in the task's own work; nothing was split out.
  </verdict-history>

  <input-validation-deviation>
    The two standing deviations are unchanged: this task's artifacts are v1 prose because the workspace
    has not migrated (TASK-026 excludes it), and implementation and review shared a session.

    One deviation is now worse and should be stated plainly rather than carried as boilerplate.
    CodeRabbit reports "Review skipped: manual review required for this OSS repository" and has not
    reviewed the last three pull requests. The external check these reviews have been citing as
    mitigation for the shared session is **not running**. Every finding in this phase since TASK-021
    was self-generated. That is a weaker guarantee than the earlier reviews implied, and it will not
    improve without either restoring CodeRabbit or a second human reading the diffs.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      The dashboard reads `phase.json`, `task.json`, and each task's `state.json`, with `state.json`
      named as the source of truth for pipeline position and `task.json.status` demoted to planning
      intent — including an instruction to report the disagreement rather than silently resolve it.
      A test asserts each of the five v2 artifacts is actually referenced, so the input list cannot
      quietly regress to the v1 set.
    </criterion>
    <criterion id="AC-2" result="pass">
      `awaiting_approval`, `blocked`, and `escalated` get a dedicated section above the listing, with
      the action that unblocks each. A blocked task shows `result.reason` and `result.explanation` from
      the current step's `output.json`, and the `no-output` case is handled correctly — there is no
      `output.json` to read, so the reason comes from `validation.json`. Missing that branch would have
      left the one blocked state the supervisor synthesises showing no reason at all.
      `reopenCount` is surfaced when non-zero, which the criterion did not ask for and which matters:
      a task at 2 of 3 is one failure from escalation.
    </criterion>
    <criterion id="AC-3" result="pass">
      Thirteen priority-ordered rows, each naming one v2 command. Signatures were checked against the
      skills they invoke rather than assumed — `/nit:approve <p> <t>`, `/nit:reject <p> <t>`,
      `/nit:continue <p> <t>`, `/nit:tasks <phase>`, `/nit:phase-summary <phase>` all match the
      argument lines those skills declare.
      The ordering changed deliberately: halted tasks now outrank planning work. The v1 order walked
      the pipeline from clarification forwards, so a workspace with an escalated task and an unplanned
      phase would have been told to write tasks. That is a behaviour change beyond the criterion, and
      the right one.
    </criterion>
    <criterion id="AC-4" result="pass">
      A **NOT READ** section carries phases and tasks that could not be read, with what was found
      instead, and parsing v1 prose into v2 columns is forbidden. The distinction between *unreadable*
      and *not started* is drawn explicitly — a task with `task.json` but no `state.json` has simply not
      begun, and conflating the two would misreport a healthy workspace as broken.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 160 pass, 0 fail (13 added). Reproduced by the reviewer. Each of the three
      conformance checks was verified by injecting the failure it guards against, not by assuming it
      works; see test-quality.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 and RV-2 fixed here.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced. One limitation is disclosed below.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The skill is strictly read-only and says so as its second sentence — correct, and worth stating in
    a codebase where every other skill writes something. ADR-0004 is respected: no state transition
    moved into the dashboard, and it derives step directory names from `state.json.stepOrder` rather
    than globbing, so it consumes the supervisor's naming convention instead of re-implementing it.

    The decision to keep the output prose is consistent with the task's scope and with what the command
    is for. A machine-readable status would duplicate `state.json`, which is already the machine-readable
    form.

    One conformance judgement: the skill declines to advertise `/nit:orchestrate`. That is a correct
    reading of ADR-0005's spirit — the command still routes on `DESIGN.md` and dispatches an agent that
    does not exist, so listing it would send a user at something that cannot work. A test pins the
    omission so it is not restored by accident before TASK-025 lands.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. Read-only by construction. No absolute paths
    are written anywhere — the skill writes nothing at all, which makes it the only skill in this phase
    where that class of defect is structurally impossible.
  </security-check>

  <test-quality result="pass">
    This skill has no schema, so the tests pin the two claims that are checkable and that have already
    drifted silently once: the commands it advertises, and the states it routes on.

    The important part is that the first attempt was wrong and was caught by adversarial verification
    rather than by inspection. The initial check asserted every advertised command resolves to a skill
    that exists — which **passes** for `/nit:design`, because that skill does exist. It is
    supervisor-dispatched, not user-invocable. So the check would have accepted the exact v1 bug it was
    written to prevent: the old dashboard telling users to run `/nit:design 2 2`. The check now asserts
    against an explicit user-facing command set.

    All three checks were then verified by injection: suggesting a step skill as a next step, putting a
    retired artifact in the next-step table, and removing `blocked` handling each produce a failure.
    A conformance test that has never been seen to fail is a guess, and two of these would have been
    wrong guesses.

    Limitation, disclosed rather than hidden: these tests verify the *documentation*, not behaviour.
    The dashboard's rendering is an agent's judgement and is not executable, so nothing here proves the
    skill produces a correct dashboard — only that it is not instructing an agent to do something
    impossible. That is a real ceiling on what this task could test, not an omission.
  </test-quality>

  <scope-check result="pass">
    One skill file and one test file. The two scope items added by TASK-023's review — reading
    `summary.json`, and replacing the `SUMMARY.md` trigger — are both delivered.

    Out-of-scope items respected: no run-log integration, no machine-readable output, and nothing the
    dashboard reads is modified.
  </scope-check>

  <convention-guards>
    <guard description="Read-only" result="pass">Stated in the skill and in its Rules; allowed-tools are Read, Glob, Grep only.</guard>
    <guard description="state.json is the truth about pipeline position" result="pass">Stated, with task.json.status demoted and disagreement reported.</guard>
    <guard description="Derive step dirs from stepOrder, not globbing" result="pass">Stated, with the reason: a stale directory from an earlier archetype must not read as progress.</guard>
    <guard description="Declare gaps rather than omit them" result="pass">NOT READ section; prose parsing forbidden.</guard>
    <guard description="Do not advertise commands that do not work" result="pass">/nit:orchestrate omitted, pinned by test.</guard>
    <guard description="Only user-invocable commands are suggested" result="pass">Pinned by test against an explicit set, verified by injection.</guard>
  </convention-guards>

  <findings>
    - [minor, fixed] RV-1 — `summary.json` was a declared input with no use. The Inputs table claimed to
      read a closed phase's `milestone.reached` and outstanding criteria, but only the file's
      *existence* was consumed, as the trigger for row 11 of the next-step table. Nothing did anything
      with the values. This is the same fault this phase has now produced five times — a declared
      contract with no consumer — and it appeared in my own work one task after I flagged the pattern
      in TASK-023's review, which is worth recording as evidence that noticing a pattern does not
      inoculate against it.
    - [minor, fixed] RV-2 — row 6 of the next-step table read "`summary.json` has an empty `answer`",
      meaning `prd/summary.json`, in a table that also uses `summary.json` for the phase summary in
      row 11. TASK-023's review predicted this collision as a note ("unambiguous by directory,
      ambiguous in conversation"); it took one task to become an actual ambiguity in a decision table.
    - [note] The worked example initially showed PHASE-1 twice in contradictory states — once as a
      closed phase with an unmet criterion, once under NOT READ as unreadable v1 prose. A phase cannot
      be both. Caught while fixing RV-1 and corrected. The dashboard example is documentation an agent
      copies, so an incoherent one teaches an incoherent output.
    - [note] The test that asserts every task state is handled matches the backticked token, not a bare
      substring. The bare version passed for `pending` and `failed` because both occur incidentally in
      prose ("is pending", "failed validation"), which would have reported two unhandled states as
      handled. Worth remembering for any future prose-conformance test.
    - [note] `pending` and `failed` remain in `task-state.schema.json` with nothing writing them. The
      test now asserts the unhandled list is exactly those two, so it will fail if a third appears —
      which is the useful behaviour, but it also means the schema's overstatement is now pinned in a
      test rather than fixed.
    - [note] CodeRabbit has not reviewed the last three PRs. See the input-validation deviation; this
      is the more consequential observation in this review.
  </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      Added a "Reading a closed phase" section giving both fields a use: `milestone.reached: false`
      renders the phase as `milestone not reached` with its `unmet` criteria listed beneath, and the
      summary's own `unreadable[]` is carried into NOT READ rather than re-derived. It also handles the
      contradiction case — a `phase.json` saying `done` while its `summary.json` says the milestone was
      not reached means one of the two was hand-edited, since `nit:phase-summary` sets the status only
      when the milestone is reached; the skill reports both and declines to pick a winner.
    </item>
    <item id="RV-2" result="fixed">
      Row 6 now reads `prd/summary.json` explicitly.
    </item>
    <verification>
      `bun test` — 160 pass, 0 fail after both fixes and the example correction.
    </verification>
  </finding-resolution>

</review>
