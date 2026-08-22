# Review — Task 43: task.json Cannot Record Task Dependencies

<review>

  <verdict>approved</verdict>

  <verdict-history>
    approved (2026-08-23), after two findings fixed during review.
  </verdict-history>

  <input-validation-deviation>
    Standing deviations unchanged: implementation and review in one session, CodeRabbit skipping —
    twenty-four consecutive pull requests.
  </input-validation-deviation>

  <criteria-check>
    <criterion id="AC-1" result="pass">
      `dependsOn` is an array of task ids, `uniqueItems`, each pattern-checked. Recording the same
      dependency twice is rejected — it says nothing the once did not, and a list that tolerates it
      invites the reader to look for a meaning that is not there.
    </criterion>
    <criterion id="AC-2" result="pass">
      `nit deps [--phase PHASE-N]` derives the graph from `dependsOn`: what each task waits on, what it
      blocks, and what is startable now. `nit:tasks` runs it instead of assembling a graph from the
      conversation. Verified through the CLI against this repository, where it correctly reports
      TASK-033 as waiting on TASK-042.
    </criterion>
    <criterion id="AC-3" result="pass">
      `nit validate --schema task` resolves each id against the project's tasks and fails on one that
      names nothing, and separately on a self-dependency, because the two need different corrections.
      A schema can check that a string looks like a task id; only the project can say whether the task
      exists.
    </criterion>
    <criterion id="AC-4" result="pass">
      Three consumers, each demonstrably reading it: the graph renders both directions of every edge,
      readiness computes what is startable, and validation resolves the references. The strongest of
      the three is readiness, because removing the field changes its answer rather than merely
      shortening its output — asserted directly.
    </criterion>
  </criteria-check>

  <dod-check>
    <item id="DOD-1" result="pass">All four acceptance criteria verified, AC-2 and AC-3 through the CLI.</item>
    <item id="DOD-2" result="pass">
      `bun test` — 613 pass, 0 fail (47 added). Reproduced. Verified by reversion: narrowing resolution
      by `--phase` fails 6; removing the validate resolution, the cycle detection, or the readiness
      read fails 3 each; re-narrowing the id pattern fails 1; and each review fix fails 1–2.
    </item>
    <item id="DOD-3" result="pass">Code review — RV-1 and RV-2 fixed.</item>
    <item id="DOD-4" result="pass">No critical tech debt introduced.</item>
  </dod-check>

  <architecture-conformance result="pass">
    The defect is the one this phase keeps finding from new angles: an instruction whose subject does
    not exist. `nit:tasks` was told to set dependencies between tasks and to present a dependency
    graph, and `task.json` had no field for either — so the ordering lived in prose that nothing reads
    and the graph was assembled from memory of the session that produced it. A graph built from memory
    agrees with the tasks only by luck, and nothing downstream can tell the difference.

    Three decisions are worth defending.

    **An unresolvable dependency fails, including when the file sits outside the phases layout.** The
    tempting alternative is to skip the check when the layout is unrecognisable, which would report the
    reference as validated when nothing had validated it. A task with no dependencies still validates
    anywhere, so ad-hoc use is unaffected — the strictness lands only on a claim that was made.

    **`--phase` narrows the view, not the resolution.** Dependencies cross phase boundaries by nature —
    a later phase's task waiting on an earlier one is the common case — and resolving against a single
    phase would report real tasks as unknown. A check that cries wolf is a check that gets turned off,
    which is the same reasoning TASK-035 recorded about boundary enforcement.

    **Cycles are reported even though every id in one resolves.** Nothing is invalid one task at a
    time; the whole graph is unsatisfiable. That is precisely the class of problem that justifies
    assembling the graph rather than validating tasks individually.
  </architecture-conformance>

  <security-check result="pass">
    No secrets, injection vectors, or insecure defaults. The command reads task files and reports; it
    writes nothing. Cycle detection is bounded by the visited set, so a malicious graph cannot spin it.
  </security-check>

  <test-quality result="pass">
    Forty-seven tests. The negative cases carry the weight: a diamond is not a cycle, a dependency on a
    non-existent task is not mistaken for one, and a longer cycle is found once rather than once per
    entry point. Without the last of those, the canonicalisation would be untested and a three-task
    cycle would be reported three times, which reads as three problems.

    The AC-4 pair is the honest form of an ADR-0007 check: not "the field is mentioned" but "removing
    it changes the answer", asserted against `readyTasks` where the change is a different set rather
    than a shorter one.

    The repository-level tests are the first real data the field has — every recorded dependency
    resolves, no cycle exists, and TASK-033 records what it actually waited on. They will fail if
    someone adds a dependency on a task they have not written, which is the intended way for them to
    earn their place.
  </test-quality>

  <scope-check result="pass">
    The schema field, the graph module, the `deps` command, the validate integration, `nit:tasks`, and
    the tests.

    The id-pattern widening is scope this task did not ask for and had to take. `nit:tasks` documents
    splitting a two-type task into `TASK-044a` and `TASK-044b`, and `^TASK-\d+$` rejected both halves —
    so the documented procedure produced task files that could not validate. It surfaced while deciding
    what `dependsOn` should accept, and leaving it would have shipped a dependency field that cannot
    express the one case the skill explicitly tells the analyst to create.

    Recording TASK-033's dependency on TASK-042 is a one-line workspace change and deliberate: a field
    whose only instances are fixtures has not been shown to work on real data.
  </scope-check>

  <convention-guards>
    <guard description="A declared field must have a consumer (ADR-0007)" result="pass">Three, and removing the field changes readiness rather than just its output.</guard>
    <guard description="Deterministic logic in tested code (ADR-0004)" result="pass">The graph is a command; nit:tasks reads its output rather than deriving one.</guard>
    <guard description="Fail loudly rather than silently skipping" result="pass">An unverifiable reference fails instead of passing unchecked.</guard>
    <guard description="A check must not cry wolf" result="pass">--phase narrows the view, not the resolution; asserted.</guard>
    <guard description="One question, one answer" result="pass">Fixed as RV-1: completion follows the supervisor's record.</guard>
  </convention-guards>

  <findings>
    - [major, fixed] RV-1 — two files answer "is this task done", and readiness followed the wrong one.
      `task.json.status` is maintained by hand; `state.json.status` is written by the supervisor. A
      task the pipeline had finished would keep blocking everything behind it until someone remembered
      to edit its `task.json`, and the graph would show `[draft]` beside a task that was done. This is
      the same defect class as TASK-036's RV-1 and TASK-040's AC-3 — two sources for one question — and
      it is the third time this phase has found it. Readiness now prefers the supervisor's record and
      falls back to `task.json` when no `state.json` exists, and the graph shows the status readiness
      actually used, so a stale `task.json` no longer explains nothing.
    - [minor, fixed] RV-2 — phases were ordered lexicographically, so `PHASE-10` would sort before
      `PHASE-2` the first time a project reached ten phases. Invisible in this repository, which has
      five, and exactly the kind of defect that surfaces long after the code is trusted.
    - [note] `--json` narrows `tasks` by `--phase` but reports `problems` and `cycles` for the whole
      project. That is deliberate — a cycle passing through another phase still blocks this one — but a
      consumer reading the JSON could reasonably expect all three to be scoped alike.
    - [note] The dependency graph is advisory. Nothing stops `nit continue` from advancing a task whose
      dependencies are unfinished; `dependsOn` informs the analyst and the reader, and the supervisor
      does not consult it. That is the right first step — a gate would need a policy for what "done"
      means for a blocked or escalated dependency — but it means the field records an intention rather
      than enforcing one.
    - [note] Thirty of this workspace's tasks predate v2 and record no dependencies at all. Their real
      ordering is in git history and in prose, and this task does not recover it. The graph is
      therefore complete for what was recorded and silent about what was not, which is worth knowing
      before reading it as the project's history.
    - [note] This task targets `@nit/cli` and changes `.claude/skills/` and `.nit/`. Seventh
      consecutive task. The phase summary now has seven instances of the same crossing, which is the
      evidence needed to decide whether the module model or the task planning is wrong.
    </findings>

  <finding-resolution>
    <item id="RV-1" result="fixed">
      `loadTasks` reads each task's `state.json` when present and records its status separately;
      `isDone` prefers it and falls back to `task.json`. Four tests: state's `done` unblocks what waits
      on it despite a `draft` task.json, state's `in-progress` keeps it blocking despite a `done`
      task.json, the fallback holds with no state.json, and the graph displays the status readiness
      followed.
    </item>
    <item id="RV-2" result="fixed">
      Phases are ordered by their number, with a lexicographic tiebreak for anything unnumbered. A test
      builds `PHASE-2` and `PHASE-10` and asserts the order.
    </item>
    <verification>
      `bun test` — 613 pass, 0 fail after both fixes. Each confirmed by reversion.
    </verification>
  </finding-resolution>

</review>
