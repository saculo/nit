import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import {
  resolveArchetype,
  engineerRoleForTaskType,
  ENGINEER_ROLE_FOR_TASK_TYPE,
} from "../src/archetype-resolver";

const ROOT = dirname(dirname(dirname(import.meta.path)));
const SKILL = join(ROOT, ".claude", "skills", "e2e-orchestration", "SKILL.md");
const AGENTS_DIR = join(ROOT, ".claude", "agents");

/** Agent names declared by a definition on disk. */
function declaredAgents(): Set<string> {
  return new Set(
    readdirSync(AGENTS_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => readFileSync(join(AGENTS_DIR, f), "utf8").match(/^name:\s*"?([^"\n]+)"?/m)?.[1]?.trim())
      .filter((n): n is string => Boolean(n))
  );
}

// TASK-025 — nit:orchestrate is prose, but its central claim is checkable: it
// delegates task execution to the supervisor and dispatches nothing itself.
// The v1 skill violated exactly this, routing on <type> from DESIGN.md and
// naming a devops-engineer agent that does not exist.
describe("nit:orchestrate conformance", () => {
  const skill = readFileSync(SKILL, "utf8");

  // AC-5 — no routing on artifacts v2 retired
  test.each(["DESIGN.md", "STEPS.md", "IMPLEMENTATION.md", "REVIEW.md", "CLARIFICATIONS.md", "SUMMARY.md"])(
    "does not route on the retired artifact %s",
    (artifact) => {
      // The one permitted mention is the historical note explaining what v1 did.
      const withoutHistory = skill.replace(/In v1 this skill read[^.]*\./g, "");
      expect(withoutHistory).not.toContain(artifact);
    }
  );

  // AC-5 — every agent it names must exist
  test("names no agent without a definition on disk", () => {
    const declared = declaredAgents();
    const mentioned = [...skill.matchAll(/\b([a-z]+-engineer|devops-engineer)\b/g)].map((m) => m[1]!);
    const dangling = [...new Set(mentioned)].filter((a) => !declared.has(a));
    expect(dangling).toEqual([]);
  });

  // AC-1 — task execution is delegated; the orchestrator invokes only these
  test("invokes no step skill directly", () => {
    const stepSkills = ["nit:analyze", "nit:design", "nit:implement", "nit:review", "nit:qa"];
    const invoked = stepSkills.filter((s) => skill.includes(`/${s}`));
    expect(invoked).toEqual([]);
  });

  // AC-1 — and it drives tasks through the supervisor's commands
  test.each(["/nit:continue", "/nit:approve", "/nit:reject"])("drives tasks through %s", (cmd) => {
    expect(skill).toContain(cmd);
  });

  // AC-1 — it must disclaim writing state, since that is the supervisor's alone
  test("disclaims writing state", () => {
    expect(skill).toContain("state.json");
    expect(skill.toLowerCase()).toContain("never write");
  });

  // AC-2 — every terminal supervisor state is routed
  test.each(["in-progress", "awaiting_approval", "blocked", "escalated", "done"])(
    "routes the %s task state",
    (state) => {
      expect(skill).toContain(`\`${state}\``);
    }
  );

  // AC-3 — the blocked reasons it routes on are the ones the schema defines
  test("routes every blocked reason the contract defines", () => {
    const schema = require(join(ROOT, "cli", "schemas", "step-output.schema.json"));
    const reasons: string[] = schema.$defs["blocked-result"].properties.reason.enum;
    const unrouted = reasons.filter((r) => !skill.includes(`\`${r}\``));
    expect(unrouted).toEqual([]);
  });

  // AC-4 — phase close reads the v2 artifact, not the retired one
  test("closes a phase on summary.json and milestone.reached", () => {
    expect(skill).toContain("summary.json");
    expect(skill).toContain("milestone.reached");
  });

  // TASK-028 closed the $detect gap, so the skill must no longer claim those
  // archetypes cannot run. A stale limitation is worse than none: it tells the
  // user to avoid something that works.
  test("does not claim $detect archetypes are unrunnable", () => {
    expect(skill).not.toContain("cannot run");
  });

  test("$detect is resolved at dispatch, so both archetypes are runnable", async () => {
    for (const name of ["bugfix", "cross-module-change"]) {
      const { steps } = await resolveArchetype(name);
      const detect = steps.filter((s) => s.role === "$detect");
      expect(detect.length).toBeGreaterThan(0); // the archetype still defers
      for (const step of detect) {
        // and every task type it can be deferred to resolves to a real agent
        for (const type of Object.keys(ENGINEER_ROLE_FOR_TASK_TYPE)) {
          expect(engineerRoleForTaskType(type, step.id)).toBeTruthy();
        }
      }
    }
  });
});

// TASK-025 review — the orchestrator's central constraint is "never write", so
// its granted capabilities must not include writing. A rule the frontmatter
// contradicts is not a constraint.
describe("nit:orchestrate capability conformance", () => {
  const skill = readFileSync(SKILL, "utf8");
  const allowed = skill.match(/^allowed-tools:\s*(.+)$/m)?.[1]?.split(",").map((t) => t.trim()) ?? [];

  test.each(["Write", "Edit", "Bash", "NotebookEdit"])("does not hold the %s tool", (tool) => {
    expect(allowed).not.toContain(tool);
  });

  test("holds what it needs to read state and invoke skills", () => {
    expect(allowed).toEqual(expect.arrayContaining(["Read", "Skill"]));
  });
});

// AC-3 — the split route lands on a skill that understands the blocked contract
describe("nit:tasks splitting mode receives the blocked contract", () => {
  const createTasks = readFileSync(join(ROOT, ".claude", "skills", "create-tasks", "SKILL.md"), "utf8");

  test.each(["needs-splitting", "detail.taskTypes", "resultType"])(
    "splitting mode reads %s",
    (token) => {
      expect(createTasks).toContain(token);
    }
  );

  test("does not describe the rationale as prose from the architect", () => {
    expect(createTasks).not.toContain("the architect's splitting rationale");
  });
});
