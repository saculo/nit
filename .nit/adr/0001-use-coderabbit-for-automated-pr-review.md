---
status: accepted
date: 2026-03-24
decision-makers: [lgrula]
---

# 0001 — Use CodeRabbit for Automated PR Review Instead of Claude Code Review

## Context and Problem Statement

The project needs automated code review on pull requests to maintain quality and catch issues early. Initially, a Claude Code Review GitHub Actions workflow (`claude-code-review.yml`) was used, which ran Claude Code Action with the `code-review` plugin on every PR. However, the project also uses Claude Code Action as a general-purpose GitHub collaborator (`claude.yml`) triggered by `@claude` mentions. Running both creates overlapping concerns: Claude is both the author (via nit workflow) and the reviewer, and the review workflow lacks path-aware context for the project's unique structure (skills, agents, hooks).

## Decision Drivers

- Separation of concerns: the tool authoring code should not also be the default reviewer
- Path-aware review context: different areas of the repo (.claude/skills, .nit/phases, .github/workflows) require different review expertise
- Reducing noise: the Claude Code review workflow triggered on every PR regardless of content relevance
- Keeping Claude Code Action for its strength: interactive, on-demand collaboration via `@claude` mentions
- Cost efficiency: dedicated review tools optimize for the review use case

## Considered Options

- Option 1: Keep Claude Code Review workflow as-is
- Option 2: Replace with CodeRabbit
- Option 3: Remove automated review entirely

## Decision Outcome

Chosen option: "Option 2 — Replace with CodeRabbit", because it provides a dedicated review tool with path-specific instruction support, separates the reviewer from the author toolchain, and preserves Claude Code Action for interactive on-demand use.

### Consequences

- Good, because PR reviews are handled by a purpose-built tool with native path-instruction support
- Good, because Claude Code Action remains available for interactive `@claude` collaboration without review overlap
- Good, because CodeRabbit configuration is declarative (`.coderabbit.yaml`) and version-controlled
- Bad, because it introduces a dependency on the CodeRabbit GitHub App (must be installed separately)
- Bad, because CodeRabbit free tier has limitations that may require a paid plan for larger teams

### Confirmation

- `.coderabbit.yaml` exists in repo root with valid configuration
- `claude-code-review.yml` is removed
- `.github/workflows/claude.yml` remains intact for `@claude` interactions
- CodeRabbit reviews appear on new PRs targeting `main`

## Pros and Cons of the Options

### Option 1 — Keep Claude Code Review workflow

- Good, because no additional tooling required
- Good, because uses the same Claude model the team already works with
- Bad, because Claude is both author (nit workflow) and reviewer — no separation of concerns
- Bad, because the review plugin lacks path-specific instruction support for this repo's structure
- Bad, because it triggers on every PR regardless, creating noise

### Option 2 — Replace with CodeRabbit

- Good, because CodeRabbit is purpose-built for code review with path-specific instructions
- Good, because separates review from authoring toolchain
- Good, because configuration is declarative and lives in the repo
- Good, because supports request-changes workflow, high-level summaries, and chat interaction
- Bad, because requires installing a third-party GitHub App
- Bad, because free tier may have limitations

### Option 3 — Remove automated review entirely

- Good, because simplest approach, no external dependencies
- Bad, because loses automated quality checks on PRs
- Bad, because relies entirely on manual review, which doesn't scale

## More Information

- CodeRabbit configuration: `.coderabbit.yaml` in repo root
- Claude Code Action workflow (retained): `.github/workflows/claude.yml`
- Related task: TASK-008 in PHASE-1
