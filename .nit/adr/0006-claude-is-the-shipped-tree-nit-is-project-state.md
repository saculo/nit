---
status: accepted
date: 2026-08-19
deciders: TASK-026
---

# 0006 — `.claude/` is the shipped tree; `.nit/` holds project state only

## Context and Problem Statement

PHASE-1 created nit's agents, skills, and hooks under `.nit/agents/`, `.nit/skills/`, and
`.nit/hooks/`, and `nit:init` copied them into a target project's `.claude/` directory. Later work
edited the `.claude/` copies directly and stopped touching the `.nit/` originals, so two trees existed
with the same names and diverging contents.

By the end of PHASE-3 the `.nit/` copies were badly stale: 13 skills, none of them migrated to the v2
contract, still describing `DESIGN.md` and `STEPS.md`; 7 agents including `devops-engineer`,
`qa-engineer` and `requirement-gatherer`, none of which exist under those names any more; and 10
hooks, half of them orphaned. Nothing referenced any of it except itself.

Two trees with one set of names is a trap. Someone finds the stale copy first, edits it, and their
change has no effect — or worse, `nit:init` ships it. The question deferred as design Q-4 in TASK-017
was which tree is authoritative.

## Decision Drivers

- `.nit/` is for project business state, not nit's own infrastructure
- A skill edit must have exactly one correct target
- `nit:init` must not scaffold a project from stale definitions
- Whatever is deleted must be recoverable from git history if the decision is wrong

## Considered Options

1. **`.claude/` is authoritative; delete the `.nit/` copies**
2. **`.nit/` is authoritative; regenerate `.claude/` from it**
3. **Keep both, and add tooling to keep them in sync**

## Decision Outcome

**Option 1.** `.claude/agents/`, `.claude/skills/`, and `.claude/hooks/` are the shipped definitions
and the only place they are edited. `.nit/skills/`, `.nit/hooks/`, and `.nit/agents/` are deleted.

This follows from the directory principle rather than from convenience: `.nit/` holds what a *project*
accumulates — its PRD, phases, tasks, step outputs, decisions, retrospectives. nit's own machinery is
not project state, and the CLI already lives outside `.nit/` in `cli/`. Keeping agents and skills in
`.nit/` was the inconsistency; the divergence was its symptom.

Option 2 was rejected because it puts nit's infrastructure back inside the project-state directory, the
thing that caused this. Option 3 was rejected because sync tooling is a permanent cost to preserve a
duplication with no benefit — the second tree was never read.

### Consequences

- One target for every skill, agent, and hook change. A stale copy cannot be edited by mistake.
- `nit:init` scaffolds a project's `.nit/` workspace but does not populate skills or agents from it.
  How nit's definitions reach a target project is a distribution question, and PHASE-4 owns it
  (`bunx @nit/cli install` into `~/.claude/`).
- The deleted trees remain in git history. Recovering the PHASE-1 v1 definitions means checking out a
  commit before this one, which is the right cost for content nothing referenced.
- This repository's `.nit/` is now consistent with the principle it documents, which matters because
  it is also the reference workspace people will copy.

### Confirmation

`.nit/` contains only `adr/`, `config/`, `phases/`, `plr/`, and the v1 `CLARIFICATIONS.md`. A test
asserts no skill, agent, or hook directory reappears under `.nit/`.

## More Information

Raised as Q-4 in TASK-017's design, deferred through TASK-018 and TASK-025, settled in TASK-026.
Related: the `.nit/` directory principle, and PHASE-4's global namespace separation, which decides how
`.claude/` definitions are distributed rather than where they are authored.
