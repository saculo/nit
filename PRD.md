# PRD: nit v2 — Deterministic Archetype-Driven Orchestration

## 1. Problem Statement

The current nit workflow system (v1) is a working Claude Code skill-based orchestration engine that manages a full software delivery pipeline (clarify → phases → tasks → design → implement → review → phase-summary). While functional, it has fundamental limitations:

- **Hardcoded workflow**: The step sequence is embedded as prose in the orchestrator skill. Adding a new step (e.g., QA) or changing the order requires rewriting the orchestrator.
- **No stack awareness**: Task routing is based on a fixed 4-type enum (backend/frontend/devops/qa). The system cannot resolve stack-specific skills (e.g., a Java Spring engineer vs. a Node NestJS engineer for backend tasks).
- **No formal state tracking**: State is inferred by reading artifact files and checking XML tag values. There is no dedicated state file, no timestamps, no approval history.
- **XML-in-Markdown artifacts**: Structured data is stored as loose XML tags inside Markdown files, validated by grep-based hooks. No schema validation exists.
- **No boundary enforcement**: The system cannot detect or prevent cross-module dependency violations.
- **No skill composition**: Adding stack-specific expertise requires hardcoding skill references in agent definitions. There is no layered skill loading.
- **Approval on every step**: The orchestrator stops for human approval after every agent dispatch, which is unnecessarily frequent for minor steps.

## 2. Vision

Evolve nit into a deterministic, archetype-driven orchestration system where:

- Workflow sequences are defined as data (archetype JSON files), not hardcoded prose
- Skills compose in layers: base step skill + language skill + custom skills (frameworks, tools, patterns)
- Language skills are auto-detected per module; custom skills are added interactively by the user
- All structured artifacts are JSON with formal JSON Schema validation
- State is explicitly tracked per task and per step with timestamps and approval history
- Module boundaries are defined and enforced during validation
- Approvals are configurable per archetype step (major-step only by default)
- Validation hooks are the hard guardrails — they enforce invariants that the LLM-based supervisor cannot bypass. JSON state and archetypes are soft guidance that constrain the supervisor's decision space, but hooks are the enforcement mechanism.

## 3. Target Users

- Software engineers using Claude Code for project delivery
- Tech leads managing multi-module projects with mixed technology stacks
- Teams using the nit workflow to go from PRD to shipped code

## 4. Scope

### 4.1 In Scope

#### 4.1.1 Deterministic Supervisor
- Replace the prose-based `e2e-orchestration` skill with a deterministic state machine
- Supervisor reads `state.json` + archetype definitions to compute the next step
- Supervisor resolves which skills to compose based on module language and custom skills
- Supervisor generates `input.json` per step (what the specialist receives)
- Supervisor validates `output.json` after step completion against JSON Schema
- Supervisor writes `approval.json` and stops for configurable major-step approvals
- Supervisor advances or reopens steps based on approval/rejection decisions
- Supervisor handles repair loops when validation fails (repairRequired flag in state.json)
- **Dry run mode**: `nit:continue --dry-run` shows what skill composition would be resolved, what step would execute, and what input.json would contain — without dispatching the agent. Useful for debugging archetype/routing configuration.

#### 4.1.2 Archetype System
- Define step sequences as JSON archetype files, not hardcoded prose
- Core archetypes: `base` (abstract), `backend-feature`, `frontend-feature`, `infra-change`, `cross-module-change`, `bugfix`, `architecture-decision`
- Each archetype defines: ordered step sequence, role per step, approval requirements per step, rejection routing per step, input/output artifact types per step
- Default 5-step sequence: analyze → design → implement → review → qa
- **Archetype inheritance**: Archetypes support an `extends` field to inherit from a parent archetype. Child archetypes can override steps (add, remove, modify), swap the engineer role, and change approval requirements. This eliminates duplication — most archetypes are 5-10 lines that say "like base, but..."

##### Archetype inheritance model

```json
// archetypes/base.json — abstract parent, never used directly
{
  "id": "base",
  "abstract": true,
  "steps": [
    { "id": "analyze", "role": "analyst", "approval": false },
    { "id": "design", "role": "architect", "approval": true },
    { "id": "implement", "role": "$engineer", "approval": false },
    { "id": "review", "role": "reviewer", "approval": true },
    { "id": "qa", "role": "qa", "approval": false }
  ],
  "rejectionRouting": {
    "analyze": "analyze",
    "design": "design",
    "implement": "implement",
    "review": "implement",
    "qa": "implement"
  }
}

// archetypes/backend-feature.json — just swaps engineer role
{
  "id": "backend-feature",
  "extends": "base",
  "engineerRole": "backend-engineer"
}

// archetypes/frontend-feature.json
{
  "id": "frontend-feature",
  "extends": "base",
  "engineerRole": "frontend-engineer"
}

// archetypes/infra-change.json
{
  "id": "infra-change",
  "extends": "base",
  "engineerRole": "infra-engineer"
}

// archetypes/bugfix.json — removes analyze, auto-approves design
{
  "id": "bugfix",
  "extends": "base",
  "engineerRole": "$detect",
  "overrides": {
    "removeSteps": ["analyze"],
    "steps": {
      "design": { "approval": false }
    }
  }
}

// archetypes/architecture-decision.json — analyze + design + review only
{
  "id": "architecture-decision",
  "extends": "base",
  "overrides": {
    "removeSteps": ["implement", "qa"],
    "steps": {
      "design": { "role": "architect" },
      "review": { "role": "reviewer" }
    }
  }
}

// archetypes/cross-module-change.json — adds boundary-check step
{
  "id": "cross-module-change",
  "extends": "base",
  "engineerRole": "$detect",
  "overrides": {
    "addSteps": [
      { "id": "boundary-check", "after": "implement", "role": "reviewer", "approval": true }
    ]
  }
}
```

**Inheritance resolution**:
1. Supervisor loads the archetype for the task type
2. If `extends` is present, loads the parent first
3. Merges: parent steps + child overrides (add/remove/modify steps)
4. `$engineer` placeholder in role gets replaced with `engineerRole` value
5. `$detect` means the engineer role is determined at runtime from the module's type tag
6. Result is a flat step list — no runtime inheritance, just build-time merge

#### 4.1.3 Layered Skill Composition
- Skills compose in layers at runtime. The agent loads multiple skills simultaneously, each adding a layer of expertise:

  **Layer 1 — Base step skill** (always loaded):
  Core nit skills defining the *process* for each step type.
  Examples: `nit:implement`, `nit:review`, `nit:qa`, `nit:design`, `nit:analyze`

  **Layer 2 — Language skill** (auto-detected per module):
  Language-specific idioms, standard library patterns, naming conventions, testing basics.
  Examples: `java`, `typescript`, `go`, `rust`, `python`
  Auto-detected by the agent during brownfield analysis or task creation — no hardcoded marker file mapping.

  **Layer 3 — Custom skills** (user-added, zero or more per module):
  Framework-specific, tool-specific, or pattern-specific expertise added by the user via `nit:add-skill`.
  Examples: `spring-boot`, `quarkus`, `nestjs`, `react-nextjs`, `ddd`, `hexagonal-architecture`, `junit5-assertj`, `tailwind-shadcn`

- Resolution chain for a Java Spring DDD module at the implement step:
  Agent loads: `nit:implement` + `java` + `spring-boot` + `ddd`

- Resolution chain for a plain Go module with no custom skills:
  Agent loads: `nit:implement` + `go`

- Language detection is smart — the agent reads source files in the module directory and determines the language. No hardcoded lookup tables or marker file mappings. Detection writes `languageId` to `modules.json`.

- Custom skills are added interactively via `nit:add-skill` and stored as a list in `modules.json` per module. The user can also add custom skills that apply globally (not per-module).

- **Step-level skill overrides**: Custom skills can be scoped to specific steps via `stepOverrides` in `modules.json`. This allows loading different custom skills at different pipeline stages (e.g., `security-checklist` only during review):

```json
{
  "name": "billing-service",
  "path": "services/billing-service",
  "languageId": "java",
  "customSkills": ["spring-boot", "ddd"],
  "stepOverrides": {
    "review": { "addSkills": ["security-checklist"] },
    "qa": { "addSkills": ["performance-testing"] }
  },
  "tags": ["backend", "billing"],
  "allowedDependencies": ["billing-contracts", "shared-kernel"]
}
```

#### 4.1.4 Language Auto-Detection
- **When**: During `nit:init` brownfield scan (for existing modules) or when a new module is first registered in `modules.json`
- **What the agent looks at**: File extensions in the module directory (weighted by count), then build config files (package.json, pom.xml, go.mod, Cargo.toml, pyproject.toml) for confirmation — not as hardcoded markers, but as context the agent reads to make a judgment
- **Mixed languages**: Primary language only. The agent picks the dominant one based on file count + build system. If truly ambiguous, the agent asks the user to confirm
- **Override**: User can always manually set `languageId` in modules.json or via `nit:add-skill`
- **Output**: Writes `languageId` to `modules.json` and auto-generates `.claude/skills/<language>/SKILL.md` if it doesn't exist
- **What it does NOT detect**: Frameworks, tools, or patterns. Those are added manually via `nit:add-skill`. Language detection is intentionally narrow — `pom.xml` tells you "java", not "spring-boot" or "quarkus"

#### 4.1.5 Interactive Skill Creation (`nit:add-skill`)
- Interactive skill that generates custom expertise skills directly in `.claude/skills/`
- Asks targeted questions to generate appropriate content:
  - What is this skill about? (framework, tool, pattern, convention)
  - What conventions should be followed?
  - What testing approach?
  - What project-specific patterns?
- Creates one SKILL.md file in `.claude/skills/<skill-name>/SKILL.md`
- Updates `registry/skills.json` with the new skill entry
- Optionally associates the skill with specific modules in `modules.json`

#### 4.1.6 JSON Artifact Format with Schema Validation
- All structured artifacts are JSON files (task.json, state.json, routing.json, phase.json, approval.json, validation.json, step input/output, etc.)
- Human-authored prose documents stay Markdown: ADRs (MADR format), PLRs, PRD source
- JSON Schema files for all ~20 artifact types in `.nit/schemas/`
- Schema validation runs after every step output via validation hooks
- Invalid output triggers repair flow (reopen step with error context)
- New `nit:validate` command for on-demand validation
- **Validation hooks are the hard guardrails** — they use `jq` to validate JSON against schemas and enforce structural invariants. The supervisor cannot bypass hooks. This is the actual enforcement layer; the supervisor's archetype-reading is soft guidance.

#### 4.1.7 Per-Step State Tracking
- `state.json` per task: currentStepId, stepOrder, status, reopenCount, repairRequired, timestamps
- Per-step directory with: `input.json`, `output.json`, `validation.json`, `approval.json`
- Approval tracking: status (pending/approved/rejected), approvedBy, timestamp, comment
- Validation results: schemaValid, policyValid, errors array, action (repair/proceed)

#### 4.1.8 Module Registry and Boundary Enforcement
- `boundaries/modules.json`: module name, path, languageId (auto-detected), customSkills (user-added list), stepOverrides (per-step skill additions), tags, allowedDependencies
- `boundaries/dependency-rules.json`: allowed and forbidden cross-module dependencies
- Validation step checks implementation against dependency rules
- Boundary violations produce structured errors in `validation.json`

#### 4.1.9 Specialist Roles
- 7 roles: analyst, architect, backend-engineer, frontend-engineer, infra-engineer, reviewer, qa
- Changes from v1: requirement-gatherer splits into analyst; devops-engineer renames to infra-engineer; architect continues to handle ADRs
- Each role has an agent definition with allowed tools and skill references
- Role assignment per step comes from the archetype definition

#### 4.1.10 ADR Trigger Heuristics
- `config/adr-triggers.json` defines structured conditions for auto-detecting when ADRs should be created
- Triggers: multi-module change, new shared component, public API change, new infrastructure capability, boundary change
- Specialists append `adrCandidates` to step output when triggers fire
- ADRs remain Markdown (MADR format) with a JSON index (`decisions/adr-index.json`)

#### 4.1.11 Config and Registry System
- `config/workspace.json`: project metadata, mode (greenfield/brownfield)
- `config/supervisor.json`: supervisor behavior settings
- `config/validation.json`: validation policy
- `config/role-routing.json`: default role-to-skill mapping rules
- `config/adr-triggers.json`: ADR auto-detection conditions
- `registry/task-types.json`: registered task types with archetype mapping
- `registry/roles.json`: all specialist roles
- `registry/skills.json`: skill registry mapping language/custom skills to file paths
- `registry/artifact-types.json`: fixed set of ~20 artifact types

#### 4.1.12 Commands
- Lifecycle: `nit:init`, `nit:continue`, `nit:continue --dry-run`, `nit:approve`, `nit:reject`, `nit:status`
- Pipeline: `nit:analyze`, `nit:design`, `nit:implement`, `nit:review`, `nit:qa`
- Skills: `nit:add-skill` (interactive custom skill creation), `nit:skills` (list all skills by layer and module)
- Decisions: `nit:adr-list-candidates`, `nit:adr-write`, `nit:adr-approve`
- Validation: `nit:validate`
- Routing: `nit:resolve-routing`, `nit:explain-routing`
- Phase/Task: `nit:phases`, `nit:tasks`, `nit:phase-summary`

#### 4.1.13 Run Logging
- `.nit/logs/runs/RUN-NNN.json` tracking each supervisor invocation
- Log: timestamp, task, step, skills loaded, duration, outcome
- `nit:status` shows recent run history

#### 4.1.14 PRD Ingestion
- `nit:clarify` outputs `prd/summary.json` and `prd/glossary.json`
- Original PRD copied to `prd/source.md`
- Attachments (diagrams, context images) stored in `prd/attachments/`

#### 4.1.15 Distribution Model (Hybrid — Option C)
- **Core nit** is distributed as a Node/Bun package: `bunx @nit/cli install` or `npx @nit/cli install`
- The CLI package contains three categories of files, each placed differently:

  **Skills + Agents → `~/.claude/nit/`** (visible to user, required by Claude Code):
  Claude Code needs skill and agent `.md` files in `~/.claude/` to load them. These are placed in `~/.claude/skills/nit/` and `~/.claude/agents/nit/`, namespaced to avoid conflicts.

  **Schemas + Archetypes + Hooks → internal to CLI package** (invisible to user):
  Validation schemas (`.schema.json`), archetype definitions (`.json`), and hook scripts (`.sh`) are plumbing the user never interacts with directly. They stay inside the package (`node_modules/@nit/cli/schemas/`, `node_modules/@nit/cli/archetypes/`, `node_modules/@nit/cli/hooks/`). Hooks call the CLI which resolves its own internal paths (e.g., `npx nit validate --schema step-output`).

  **Project state → `.nit/`** (created by `nit:init`):
  Config, registry, boundaries, phases, tasks, decisions, logs, PLRs, PRD artifacts. `.nit/` contains ONLY the user's project business state — zero schemas, zero archetypes, zero skills, zero agents, zero hooks.

- `bunx @nit/cli update` / `npx @nit/cli update` updates the global package (skills, agents, schemas, archetypes, hooks all update together)
- **Custom skills** (language + framework/tool/pattern) live in `.claude/skills/` per project, created by `nit:add-skill` or auto-generated during language detection
- No nit infrastructure files in `.nit/` — ever

### 4.2 Out of Scope

- Initiative layer (INIT-NNN grouping above phases) — deferred to v2
- TypeScript/Bun CLI application beyond install/update commands
- TUI/GUI
- MCP server integration for nit itself
- Provider adapters (Codex, Cursor, etc.)
- Multi-project orchestration
- Remote/distributed agent execution
- Real-time collaboration features
- Hardcoded language/framework detection from marker files
- v1 artifact migration tooling

## 5. Layered Skill Composition Model

### How skills compose

When the supervisor dispatches an agent, it tells the agent which skills to load. Skills layer additively — each adds expertise without replacing the previous layer.

```
┌─────────────────────────────────────────────────┐
│ Layer 3: Custom Skills (zero or more)           │
│   spring-boot, ddd, junit5-assertj, ...        │
│   User-added via nit:add-skill                  │
│   May vary per step (stepOverrides)             │
├─────────────────────────────────────────────────┤
│ Layer 2: Language Skill (one per module)         │
│   java, typescript, go, rust, python, ...       │
│   Auto-detected, stored in modules.json         │
├─────────────────────────────────────────────────┤
│ Layer 1: Base Step Skill (one per step)          │
│   nit:implement, nit:review, nit:qa, ...        │
│   Defined by archetype                          │
└─────────────────────────────────────────────────┘
```

### Skill file locations

| Layer | Location | Created by | Scope |
|-------|----------|------------|-------|
| Base step | `~/.claude/skills/nit/` | `bunx @nit/cli install` | Global |
| Language | `.claude/skills/<language>/SKILL.md` | Auto-generated during detection | Project |
| Custom | `.claude/skills/<name>/SKILL.md` | `nit:add-skill` interactive | Project |

### Module entry in modules.json

```json
{
  "name": "billing-service",
  "path": "services/billing-service",
  "languageId": "java",
  "customSkills": ["spring-boot", "ddd", "junit5-assertj"],
  "stepOverrides": {
    "review": { "addSkills": ["security-checklist"] }
  },
  "tags": ["backend", "billing"],
  "allowedDependencies": ["billing-contracts", "shared-kernel"]
}
```

### Resolution example

Task targets `billing-service`, current step is `implement`:

1. Read `modules.json` → `languageId: java`, `customSkills: [spring-boot, ddd, junit5-assertj]`
2. Base skill from archetype step: `nit:implement`
3. Language skill: `.claude/skills/java/SKILL.md` (exists? load it)
4. Custom skills: `.claude/skills/spring-boot/SKILL.md`, `.claude/skills/ddd/SKILL.md`, `.claude/skills/junit5-assertj/SKILL.md` (each exists? load it)
5. Check `stepOverrides.implement` — none defined, skip
6. Agent receives: "Load nit:implement, java, spring-boot, ddd, junit5-assertj"

Same task, `review` step:

1. Same module lookup
2. Base skill: `nit:review`
3. Language skill: `.claude/skills/java/SKILL.md`
4. Custom skills: spring-boot, ddd, junit5-assertj
5. Check `stepOverrides.review` → `addSkills: ["security-checklist"]`
6. Agent receives: "Load nit:review, java, spring-boot, ddd, junit5-assertj, security-checklist"

If a skill file doesn't exist, it's skipped — the agent works with whatever layers are available.

### Global custom skills

Custom skills can also be module-independent (applied to all tasks):

```json
// registry/skills.json
{
  "globalCustomSkills": ["code-conventions", "security-checklist"],
  "moduleSkills": { ... }
}
```

## 6. Fixed Artifact Model

The following ~20 types are fixed by core. No new artifact schema types can be added.

### Planning
- `workspace` — project config and mode
- `phase` — delivery phase with milestone
- `task` — work unit with requirements and acceptance criteria
- `task-state` — current step, status, timestamps, reopen count

### Context and Boundaries
- `prd-summary` — structured PRD analysis output
- `glossary` — domain term definitions
- `modules` — module registry with language IDs, custom skills, step overrides, dependencies
- `dependency-rules` — cross-module dependency constraints

### Step Control
- `step-input` — what the specialist receives
- `step-output` — what the specialist produces (with artifacts array)
- `validation-result` — schema and policy validation outcome
- `approval` — approval/rejection decision with metadata
- `routing` — resolved skill composition per task

### Design / Implementation
- `analysis-result` — analyst output (embedded in step-output)
- `design-result` — architect output (embedded in step-output)
- `implementation-result` — engineer output (embedded in step-output)
- `review-result` — reviewer output (embedded in step-output)
- `qa-result` — QA output (embedded in step-output)

### Decisions
- `adr-candidate` — proposed architectural decision (embedded in step-output)

## 7. Directory Layout

```
# ─── CLI PACKAGE (node_modules/@nit/cli/) ─── invisible to user ───
@nit/cli/
  schemas/                              # JSON Schema files — validation plumbing
    workspace.schema.json
    phase.schema.json
    task.schema.json
    task-state.schema.json
    step-input.schema.json
    step-output.schema.json
    approval.schema.json
    validation.schema.json
    routing.schema.json
    modules.schema.json
    dependency-rules.schema.json
    adr-candidate.schema.json
    archetype.schema.json
    ...
  archetypes/                           # Archetype definitions — workflow plumbing
    base.json                           # abstract parent
    backend-feature.json
    frontend-feature.json
    infra-change.json
    cross-module-change.json
    bugfix.json
    architecture-decision.json
  hooks/                                # Validation hook scripts
    validate-*.sh                       # call `npx nit validate` internally

# ─── GLOBAL INSTALL (~/.claude/) ─── visible to user, needed by Claude Code ───
~/.claude/
  skills/
    nit/                                # namespaced to avoid conflicts
      nit:orchestrate/SKILL.md
      nit:clarify/SKILL.md
      nit:phases/SKILL.md
      nit:tasks/SKILL.md
      nit:design/SKILL.md
      nit:implement/SKILL.md
      nit:review/SKILL.md
      nit:qa/SKILL.md
      nit:phase-summary/SKILL.md
      nit:init/SKILL.md
      nit:status/SKILL.md
      nit:skills/SKILL.md
      nit:add-skill/SKILL.md
      nit:validate/SKILL.md
      nit:continue/SKILL.md
      nit:approve/SKILL.md
      nit:reject/SKILL.md
      nit:resolve-routing/SKILL.md
      nit:explain-routing/SKILL.md
  agents/
    nit/
      analyst.md
      architect.md
      backend-engineer.md
      frontend-engineer.md
      infra-engineer.md
      reviewer.md
      qa.md

# ─── PROJECT-LOCAL (.claude/) ─── custom skills per project ───
project-repo/
  .claude/
    skills/
      java/SKILL.md                     # language skill (auto-detected)
      spring-boot/SKILL.md             # custom skill (nit:add-skill)
      ddd/SKILL.md                     # custom skill (nit:add-skill)
      junit5-assertj/SKILL.md          # custom skill (nit:add-skill)
      typescript/SKILL.md              # language skill (auto-detected)
      react-nextjs/SKILL.md            # custom skill (nit:add-skill)
      security-checklist/SKILL.md      # custom skill (step-scoped via stepOverrides)

# ─── PROJECT STATE (.nit/) ─── ONLY business state, NOTHING else ───
  .nit/
    config/
      workspace.json                    # project metadata, mode, nitVersion
      supervisor.json                   # maxReopenCount, auto-advance settings
      validation.json                   # validation policy
      role-routing.json                 # default role-to-skill mapping
      adr-triggers.json                 # ADR auto-detection conditions

    registry/
      task-types.json                   # registered task types with archetype mapping
      roles.json                        # all specialist roles
      skills.json                       # skill registry (pointers to ~/.claude/ and .claude/)
      artifact-types.json               # fixed artifact type list

    prd/
      source.md
      attachments/
      summary.json
      glossary.json

    boundaries/
      modules.json                      # languageId, customSkills, stepOverrides, allowedDependencies
      dependency-rules.json

    phases/
      PHASE-001/
        phase.json
        tasks/
          TASK-001/
            task.json
            routing.json                # resolved skill composition
            state.json
            steps/
              STEP-001-analyze/
                input.json
                output.json
                validation.json
                approval.json
              STEP-002-design/
                ...
              STEP-003-implement/
                ...
              STEP-004-review/
                ...
              STEP-005-qa/
                ...

    decisions/
      adr-index.json
      ADR-0001-title.md

    logs/
      runs/
        RUN-001.json

    plr/
      0001-phase-title.md

    project/
      initial-state.md
```

## 8. Supervisor Algorithm

```
nit:continue [--dry-run]
  Load workspace config
  Find active phase and active task
  Read task.json, state.json, routing.json
  If no routing.json → resolve skill composition:
    Read modules.json for task's target module
    Determine base skill from archetype step
    Find language skill from languageId
    Collect custom skills from module's customSkills + stepOverrides for current step
    Collect global custom skills from registry/skills.json
    Write routing.json
  Load archetype for task type from CLI package (resolve inheritance if extends is present)
  Determine current or next step:
    if step pending and approval not decided → stop
    if approved → move to next step
    if rejected → reopen current step or repair per archetype config
  Build step input.json

  If --dry-run:
    Print: resolved archetype (after inheritance), skill composition, step input
    Stop (no agent dispatch)

  Invoke agent with composed skill list from routing.json
  Agent loads all skills and writes output.json
  Run schema validation (via CLI: `npx nit validate` — schemas inside CLI package, hard guardrail)
  Run policy/boundary validation (dependency-rules.json)
  If invalid:
    write validation.json with errors
    mark repairRequired=true in state.json
    reopen step
    stop
  Run ADR trigger heuristics
  If triggered → append adr candidates to step output
  Write approval.json with status=pending
  Update state.json to awaiting_approval
  Stop

nit:approve TASK-NNN STEP-NNN
  Write approval = approved
  Update state
  If next step exists → set it current
  Stop or continue if auto-advance

nit:reject TASK-NNN STEP-NNN --comment "..."
  Write approval = rejected
  If reopenOnReject=true → reopen same step
  Else → create repair note and route to previous major step
  Stop
```

## 9. Skill Resolution Algorithm

```
For each task module target:
  1. Read modules.json → find target module
  2. Read languageId, customSkills[], and stepOverrides
  3. Read archetype (resolve inheritance) → base skill for current step type
  4. Compose skill list:
     a. Base: archetype step skill (e.g., nit:implement) from ~/.claude/skills/nit/
     b. Language: .claude/skills/<languageId>/SKILL.md (if exists)
     c. Custom: .claude/skills/<name>/SKILL.md for each customSkills entry (if exists)
     d. Step-scoped: .claude/skills/<name>/SKILL.md for each stepOverrides[currentStep].addSkills entry (if exists)
     e. Global: .claude/skills/<name>/SKILL.md for each globalCustomSkills entry (if exists)
  5. Persist composed list to routing.json
  6. Missing skills are skipped (no error), agent works with available layers
```

## 10. Language Auto-Detection

### When detection runs
- During `nit:init` brownfield scan — for all discovered modules in existing projects
- When a new module is first registered in `modules.json` (e.g., during task creation for a new module)

### What the agent examines
- File extensions in the module directory, weighted by count (e.g., 95% `.java` files → java)
- Build config files (package.json, pom.xml, go.mod, Cargo.toml, pyproject.toml) for confirmation — read as context, not as hardcoded marker-to-language mapping

### Mixed language handling
- Primary language only — the agent picks the dominant language based on file count + build system
- If truly ambiguous (e.g., 50/50 split), the agent asks the user to confirm
- User can always override `languageId` manually in `modules.json`

### What detection does NOT cover
- Frameworks (Spring Boot, Quarkus, NestJS, etc.)
- Tools (Maven, Gradle, Webpack, etc.)
- Patterns (DDD, hexagonal, etc.)
- These are added manually via `nit:add-skill` — detection is intentionally narrow

### Detection output
- Writes `languageId` to the module entry in `boundaries/modules.json`
- Auto-generates `.claude/skills/<language>/SKILL.md` if it doesn't already exist (basic language idioms, naming conventions, testing patterns)

## 11. Rejection and Repair Defaults

- reject analyze → reopen analyze
- reject design → reopen design
- reject implement → reopen implement
- reject review → reopen implement (unless comment says reopen review)
- reject qa → reopen implement (unless issue is test-only, then reopen qa)
- invalid output → reopen same step with repair context in input.json

## 12. Delivery Phases

### v1.1 — Core Infrastructure
- Config and registry files
- JSON schemas for all artifact types
- Archetype definitions (base + 6 concrete, with inheritance)
- Rewrite nit:init for new directory structure
- PRD ingestion pipeline (summary.json, glossary.json)
- Rewrite nit:phases and nit:tasks for JSON output
- Build deterministic supervisor (nit:continue + nit:continue --dry-run)
- Create approve/reject commands
- Skill composition engine (layered resolution with step overrides)
- Rewrite nit:design for JSON output
- Rewrite nit:implement for JSON state tracking
- Validation via CLI (`npx nit validate`) using check-jsonschema or ajv-cli — schemas + hooks inside CLI package
- Rewrite nit:status for JSON state
- Auto language detection during module scanning

### v1.2 — Review, QA, Boundaries
- Rewrite nit:review for JSON output
- Add dedicated QA step and skill
- Boundary enforcement (modules, dependency-rules)
- ADR trigger automation
- explain-routing and resolve-routing commands
- nit:skills command (list all skills by layer and module)
- Rewrite nit:phase-summary for JSON

### v1.3 — Skill Creation, Roles, CLI Package
- nit:add-skill interactive skill creation
- Role changes (analyst, infra-engineer)
- CLI package (`bunx @nit/cli install` / `npx @nit/cli install`)
- CLI owns schemas, archetypes, hooks internally (Option C distribution)
- Skills + agents installed to `~/.claude/nit/`
- nitVersion compatibility checking
- Run logging
- Repair/reopen flow refinement
- End-to-end testing and cleanup

## 13. Success Criteria

- Full pipeline (init → analyze → phases → tasks → design → implement → review → qa → phase-summary) runs end-to-end on a sample multi-module project
- Archetype-driven sequencing works for at least 3 task types, with inheritance from base
- Layered skill composition loads base + language + custom skills correctly, including step overrides
- Language is auto-detected per module without hardcoded marker files
- All JSON artifacts pass schema validation via CLI-invoked validator (schemas inside CLI package)
- Boundary violations are detected and reported in validation.json
- Approval history is persisted in approval.json per step
- `nit:explain-routing` shows the full skill composition chain for any task
- `nit:add-skill` creates a custom skill interactively and registers it
- `nit:skills` lists all skills grouped by layer and module
- `nit:continue --dry-run` shows resolved archetype, skill composition, and step input without dispatching

## 14. Non-Functional Requirements

- All state is repo-native (files under `.nit/`, no external database)
- Claude Code CLI only (Claude.ai deferred)
- Invoked on demand (no background processes, no watchers)
- Human prose documents (ADRs, PLRs, PRD) remain Markdown for readability
- Existing v1 artifacts preserved in git history as brownfield context
- Skills + agents installed globally to `~/.claude/nit/`, shared across projects, namespaced to avoid conflicts
- Schemas, archetypes, hooks live inside CLI package — invisible to user
- Custom skills live in `.claude/skills/` per project
- `.nit/` contains ONLY project business state — zero nit infrastructure files
- Validation hooks (inside CLI package) are the hard enforcement layer — the supervisor cannot bypass them
