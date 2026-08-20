import { createAjv } from "./ajv";
import { resolveSchema } from "./schema-resolver";
import type { ModuleEntry } from "./routing-resolver";

/**
 * One explicit constraint between two modules. `allowed: false` forbids a
 * dependency the module allowlist would otherwise permit; `allowed: true`
 * permits one it omits.
 */
export interface DependencyRule {
  from: string;
  to: string;
  allowed: boolean;
  /** Why the rule exists. Surfaced in the verdict so a violation says what to do. */
  reason?: string;
}

/** The parsed contents of boundaries/dependency-rules.json. */
export interface DependencyRules {
  rules: DependencyRule[];
}

/** Where a verdict came from — the three sources rank in this order. */
export type DependencySource = "rule" | "module-allowlist" | "default";

/** Whether one module may depend on another, and on whose authority. */
export interface DependencyVerdict {
  from: string;
  to: string;
  allowed: boolean;
  source: DependencySource;
  reason?: string;
}

/**
 * Validate a rule set against its schema and against the module registry.
 *
 * The schema cannot do the second check: JSON Schema constrains a document's
 * shape, not its agreement with another file. A rule naming a module that does
 * not exist is well-formed and meaningless — it can never match, so it silently
 * enforces nothing, which is the worst way for a boundary rule to fail.
 */
export function loadDependencyRules(raw: unknown, modules: ModuleEntry[]): DependencyRules {
  const ajv = createAjv();
  const validate = ajv.compile(require(resolveSchema("dependency-rules")!));
  if (!validate(raw)) {
    const details = (validate.errors ?? [])
      .map((e) => `  ${e.instancePath || "/"}: ${e.message}`)
      .join("\n");
    throw new Error(`dependency-rules validation failed:\n${details}`);
  }

  const known = new Set(modules.map((m) => m.name));
  const unknown: string[] = [];
  for (const [i, rule] of (raw as DependencyRules).rules.entries()) {
    if (!known.has(rule.from)) unknown.push(`  rules[${i}].from: "${rule.from}" is not a module`);
    if (!known.has(rule.to)) unknown.push(`  rules[${i}].to: "${rule.to}" is not a module`);
  }
  if (unknown.length > 0) {
    throw new Error(
      `dependency-rules names modules the registry does not declare:\n${unknown.join("\n")}\n` +
        `Known modules: ${[...known].join(", ")}.`
    );
  }
  return raw as DependencyRules;
}

/**
 * Decide whether `from` may depend on `to`.
 *
 * Two sources can answer, so their precedence has to be fixed rather than left
 * to whichever is consulted first:
 *
 * 1. **An explicit rule wins.** `dependency-rules.json` exists to state
 *    exceptions, and an exception that loses to the general case is not one.
 * 2. **Otherwise the module's own `allowedDependencies` decides**, when the
 *    module declares a list. That list is the module's own statement about what
 *    it may reach.
 * 3. **Otherwise allow.** A module with no allowlist and no rule has expressed
 *    no constraint, and inventing one would fail projects that never opted in.
 *
 * A module always may depend on itself; that is not a boundary crossing.
 */
export function resolveDependency(
  from: string,
  to: string,
  modules: ModuleEntry[],
  rules: DependencyRules = { rules: [] }
): DependencyVerdict {
  if (from === to) {
    return { from, to, allowed: true, source: "default", reason: "A module may depend on itself." };
  }

  const rule = rules.rules.find((r) => r.from === from && r.to === to);
  if (rule) {
    return { from, to, allowed: rule.allowed, source: "rule", reason: rule.reason };
  }

  const module = modules.find((m) => m.name === from);
  const allowlist = module?.allowedDependencies;
  if (allowlist !== undefined) {
    const allowed = allowlist.includes(to);
    return {
      from,
      to,
      allowed,
      source: "module-allowlist",
      reason: allowed
        ? `"${from}" declares "${to}" among its allowedDependencies.`
        : `"${from}" declares allowedDependencies and "${to}" is not among them` +
          (allowlist.length > 0 ? ` (${allowlist.join(", ")}).` : " (it declares none)."),
    };
  }

  return {
    from,
    to,
    allowed: true,
    source: "default",
    reason: `"${from}" declares no allowedDependencies and no rule governs this pair.`,
  };
}
