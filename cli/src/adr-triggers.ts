import { createAjv } from "./ajv";
import { resolveSchema } from "./schema-resolver";
import { changedPaths, plannedPaths, moduleForPath } from "./boundary-check";
import { resolveDependency, type DependencyRules } from "./dependency-rules";
import type { ModuleEntry } from "./routing-resolver";

/** The computable conditions the evaluator can decide. */
export const TRIGGER_KINDS = [
  "multi-module-change",
  "new-shared-component",
  "cross-module-dependency",
  "boundary-change",
  "public-api-change",
  "new-infra-capability",
] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];

/** One configured trigger (config/adr-triggers.json). */
export interface AdrTrigger {
  id: string;
  /** The condition in English, for whoever reads the candidate. */
  condition: string;
  /** The condition in a form the evaluator can decide. */
  when: { kind: string };
  template?: string;
  enabled?: boolean;
}

/** A trigger that matched, with what made it match. */
export interface TriggerMatch {
  id: string;
  kind: TriggerKind;
  /** The configured English condition, carried so a candidate can quote it. */
  condition: string;
  /** The ADR template the trigger asks for, for whoever writes the record. */
  template?: string;
  /** The concrete paths or modules that satisfied the condition. */
  evidence: string[];
}

/** What the evaluator needs besides the step output. */
export interface TriggerContext {
  targetModule: string;
  modules: ModuleEntry[];
  rules?: DependencyRules;
}

/**
 * Validate the trigger set and reject any condition the evaluator cannot decide.
 *
 * `condition` is prose for the reader; `when.kind` is what the evaluator acts
 * on. A kind outside the known set fails here rather than at evaluation time,
 * because a trigger that can never match is indistinguishable at runtime from
 * one that simply did not — and a rule nobody notices is off is worse than one
 * that refuses to load.
 */
export function loadTriggers(raw: unknown): { triggers: AdrTrigger[] } {
  // Checked before the schema, deliberately. The schema's enum would reject an
  // unknown kind too, but Ajv reports "must be equal to one of the allowed
  // values" without saying which value was wrong or what is allowed — and the
  // whole point of failing here is to tell the author what to write instead.
  const declared = (raw as { triggers?: AdrTrigger[] })?.triggers;
  if (Array.isArray(declared)) {
    const unknown = declared
      .filter((t) => typeof t?.when?.kind === "string" && !TRIGGER_KINDS.includes(t.when.kind as TriggerKind))
      .map((t) => `  "${t.id}": when.kind "${t.when.kind}" is not a condition the evaluator decides`);
    if (unknown.length > 0) {
      throw new Error(
        `adr-triggers declares conditions that can never be evaluated:\n${unknown.join("\n")}\n` +
          `Known kinds: ${TRIGGER_KINDS.join(", ")}.`
      );
    }
  }

  const ajv = createAjv();
  const validate = ajv.compile(require(resolveSchema("adr-triggers")!));
  if (!validate(raw)) {
    const details = (validate.errors ?? [])
      .map((e) => `  ${e.instancePath || "/"}: ${e.message}`)
      .join("\n");
    throw new Error(`adr-triggers validation failed:\n${details}`);
  }
  return raw as { triggers: AdrTrigger[] };
}

const MANIFESTS = ["package.json", "bun.lock", "Cargo.toml", "go.mod", "pom.xml", "requirements.txt"];
const BOUNDARY_FILES = ["boundaries/modules.json", "boundaries/dependency-rules.json"];

/** Decide one condition against a step output. Returns the evidence, or none. */
function evidenceFor(kind: TriggerKind, paths: string[], ctx: TriggerContext, created: string[]): string[] {
  switch (kind) {
    case "multi-module-change": {
      const modules = [...new Set(paths.map((p) => moduleForPath(p, ctx.modules)).filter(Boolean))];
      return modules.length > 1 ? (modules as string[]) : [];
    }
    case "cross-module-dependency":
      return paths.filter((p) => {
        const owner = moduleForPath(p, ctx.modules);
        if (!owner || owner === ctx.targetModule) return false;
        return !resolveDependency(ctx.targetModule, owner, ctx.modules, ctx.rules).allowed;
      });
    case "boundary-change":
      return paths.filter((p) => BOUNDARY_FILES.some((b) => p.endsWith(b)));
    case "public-api-change":
      return paths.filter((p) => p.endsWith(".schema.json"));
    case "new-infra-capability":
      return paths.filter((p) => MANIFESTS.some((m) => p.endsWith(m)));
    case "new-shared-component":
      // A file added to a module something else is allowed to depend on: new
      // shared surface, which is where a decision outlives the task that made it.
      return created.filter((p) => {
        const owner = moduleForPath(p, ctx.modules);
        if (!owner) return false;
        return ctx.modules.some(
          (m) => m.name !== owner && resolveDependency(m.name, owner, ctx.modules, ctx.rules).allowed
        );
      });
  }
}

/**
 * Evaluate every enabled trigger against a step output.
 *
 * A step that matches nothing reports nothing: the point is to notice decisions
 * that would otherwise go unrecorded, not to ask for an ADR after every change.
 */
export function evaluateTriggers(
  output: unknown,
  triggers: AdrTrigger[],
  ctx: TriggerContext
): TriggerMatch[] {
  // An implement step reports what it changed; a design step declares what it
  // plans to change. Both are worth evaluating — a decision noticed at design is
  // cheaper to record than one noticed after the code exists.
  const planned = plannedPaths(output);
  const changed = changedPaths(output);
  const paths = changed.length > 0 ? changed : planned.map((f) => f.path);
  if (paths.length === 0) return [];

  const result = (output as { result?: { filesChanged?: { path?: string; action?: string }[] } }).result;
  const created =
    changed.length > 0
      ? (result?.filesChanged ?? [])
          .filter((f) => f.action === "created")
          .map((f) => f.path)
          .filter((p): p is string => Boolean(p))
      : planned.filter((f) => f.action === "created").map((f) => f.path);

  const matches: TriggerMatch[] = [];
  for (const trigger of triggers) {
    if (trigger.enabled === false) continue;
    const evidence = evidenceFor(trigger.when.kind as TriggerKind, paths, ctx, created);
    if (evidence.length === 0) continue;
    matches.push({
      id: trigger.id,
      kind: trigger.when.kind as TriggerKind,
      condition: trigger.condition,
      template: trigger.template,
      evidence,
    });
  }
  return matches;
}
