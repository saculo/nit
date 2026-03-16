---
name: "nit:init"
description: "Initialize the nit workspace. Creates .nit/ directory structure, config file with project mode (greenfield/brownfield), and optionally triggers brownfield analysis. Use when the user says '/nit:init', 'initialize nit', 'setup nit', or at the very start of a new nit project."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
hooks:
  PreToolUse:
    - matcher: Skill
      hooks:
        - type: command
          command: "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-init.sh"
          timeout: 10
---

> **Arguments**: `/nit:init` — no arguments required.

# nit Init

Initialize the `.nit/` workspace for a new project.

## Process

### Step 1 — Check Existing State

Check if `.nit/` already exists:
- If it exists and has content → warn the user: "nit workspace already exists. Re-initializing will reset configuration. Continue?"
- If it doesn't exist → proceed

### Step 2 — Detect Project Mode

Ask the user:

> Is this a **greenfield** (new project, no existing code) or **brownfield** (existing codebase) project?

Alternatively, auto-detect:
- If the repo has significant source code (more than just config/scaffolding) → suggest brownfield
- If the repo is empty or only has initial scaffolding → suggest greenfield
- Confirm with user either way

### Step 3 — Create Directory Structure

```bash
mkdir -p .nit/config
mkdir -p .nit/phases
mkdir -p .nit/adr
mkdir -p .nit/plr
mkdir -p .nit/project  # brownfield only
```

### Step 4 — Create Config

Write `.nit/config/nit.yaml`:

```yaml
# nit project configuration
mode: greenfield  # or brownfield
```

### Step 5 — Place Workflow Files

Ask the user:

> Place nit workflow files in **project-local** (`.claude/`) or **global** (`~/.claude/`)?

Then copy all nit workflow files from `.nit/` to the chosen target directory:

1. **Agents** — copy `.nit/agents/*.md` → `{target}/agents/`
2. **Skills** — copy each `.nit/skills/{skill-name}/` directory → `{target}/skills/{skill-name}/` (preserving directory structure and all files including examples/)
3. **Hooks** — copy `.nit/hooks/*.sh` → `{target}/hooks/` and set executable permissions (`chmod +x`)

**Conflict handling:**
- Before copying, check if any target files already exist
- If conflicts found, list them and ask: "These files already exist. Overwrite all / Skip existing / Choose per file?"
- Never silently overwrite

**Create target directories** if they don't exist:
```bash
mkdir -p {target}/agents
mkdir -p {target}/skills
mkdir -p {target}/hooks
```

### Step 6 — Brownfield: Trigger Initial State Analysis

If mode is brownfield:
1. Tell the user: "Brownfield mode selected. Run `/nit:brownfield-orchestrate` to generate initial-state.md."
2. Do NOT auto-trigger — let the user decide when to run it

### Step 7 — Confirmation

Display:

```
nit workspace initialized.
  Mode: greenfield|brownfield
  Config: .nit/config/nit.yaml
  Directories: .nit/phases/, .nit/adr/, .nit/plr/
  Workflow files: placed in .claude/ (or ~/.claude/)

Next step: /nit:clarify <prd-file>
```

If brownfield, also show:
```
  Brownfield: run /nit:brownfield-orchestrate to analyze existing codebase
```

## Rules

- Always ask the user to confirm project mode — do not assume
- Do not overwrite existing `.nit/` content without explicit confirmation
- Do not auto-trigger brownfield analysis — just suggest it
- Keep config minimal — only what is needed now
