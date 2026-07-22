---
name: "nit:compose-routing"
description: "Skill composition engine for the nit workflow. Resolves the layered skill list (base step skill + language + custom + step-override + global) for a task at a given step and writes a validated routing.json. Internal capability invoked by the supervisor before dispatching a specialist — not a user-facing command. Use when the supervisor needs to determine which skills an agent should load for a task and step."
allowed-tools: Read, Bash
---

> **Invocation**: internal — called by the supervisor (`nit:continue`) before dispatch, not a user slash command. The user-facing `nit:resolve-routing` / `nit:explain-routing` commands are PHASE-3.

# nit Skill Composition Engine

Resolves the layered skill list for a task at its current step and persists it to
`.nit/phases/PHASE-N/tasks/TASK-NNN/routing.json`. The deterministic resolution lives in the CLI
(`cli/src/routing-resolver.ts`); this skill documents how to invoke it and what it produces.

## Layering model (PRD Section 9)

The resolved skill list is ordered:

1. **Base step skill** — `nit:<stepId>` derived from the resolved archetype step (e.g. the
   `implement` step ⇒ `nit:implement`). Always present.
2. **Language skill** — the target module's `languageId` (e.g. `java`, `typescript`).
3. **Custom skills** — the module's `customSkills`, then the current step's
   `stepOverrides[<step>].addSkills`. For a cross-module task, each secondary module's language is
   prepended here and all modules' custom skills are unioned.
4. **Global skills** — `globalCustomSkills[].id` from `registry/skills.json`.

Any language/custom/global skill whose `.claude/skills/<name>/SKILL.md` is absent is dropped
without error, so the agent still receives every available layer.

## Inputs

- `.nit/boundaries/modules.json` — module registry (`name`, `languageId`, `customSkills`,
  `stepOverrides`). **Mandatory**: if absent, STOP and tell the user to run `/nit:init`.
- `.nit/registry/skills.json` — skills registry (`globalCustomSkills`). Optional: absence means no
  global skills.
- The resolved archetype (via `nit archetype <name>`) supplies the current step id.

## Procedure

1. Determine the current step id from the task's resolved archetype and the target module name(s)
   from the task's `targetModule`.
2. Resolve and write `routing.json`:

   ```bash
   bun run ./cli/src/cli.ts route \
     --task TASK-NNN \
     --step <stepId> \
     --targets <moduleName>[,<moduleName2>...] \
     --out .nit/phases/PHASE-N/tasks/TASK-NNN/routing.json
   ```

   The command reads `modules.json` and `skills.json` from their default locations
   (`--modules` / `--registry` / `--skills-dir` override them), resolves the layered list, and
   writes `routing.json`. A missing module registry or unknown target module exits non-zero with a
   clear message.

3. Confirm the written file is schema-valid (the route command validates in-process; this is the
   belt-and-braces guardrail per ADR-0003):

   ```bash
   bun run ./cli/src/cli.ts validate --schema routing \
     .nit/phases/PHASE-N/tasks/TASK-NNN/routing.json
   ```

   A non-zero exit means the routing is invalid — do not dispatch; fix the inputs and re-resolve.

## Output

`routing.json` conforming to `routing.schema.json`:

```json
{
  "taskId": "TASK-014",
  "targetModule": "api",
  "baseSkill": "nit:implement",
  "languageSkill": "java",
  "customSkills": ["spring-boot", "ddd"],
  "globalSkills": ["code-conventions"],
  "resolvedAt": "2026-07-22T00:00:00.000Z"
}
```

`routing.json` reflects the task's **current** step and is regenerated when the step advances.

## Rules

- Resolve the skill list only — do NOT dispatch agents, advance state, or write approval files
  (that is the supervisor's job, TASK-015).
- Never leave an invalid `routing.json` behind — the command validates before writing; treat a
  validation failure as a hard stop.
- A missing skill file is normal, not an error — the layer is simply dropped.
