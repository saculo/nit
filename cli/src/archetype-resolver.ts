import { join, dirname } from "path";
import Ajv2020 from "ajv/dist/2020";
import { resolveSchema } from "./schema-resolver";

const ARCHETYPES_DIR = join(dirname(dirname(import.meta.path)), "archetypes");

/** A single step in an archetype's step sequence. */
export interface ArchetypeStep {
  id: string;
  role: string;
  approval?: boolean;
}

/** An addStep override includes the insertion point. */
interface AddStep extends ArchetypeStep {
  after: string;
}

/** Step property modifications keyed by step id. */
interface StepModifications {
  [stepId: string]: { role?: string; approval?: boolean };
}

/** The overrides section of a child archetype. */
interface ArchetypeOverrides {
  removeSteps?: string[];
  addSteps?: AddStep[];
  steps?: StepModifications;
}

/** Raw archetype JSON structure as loaded from disk. */
export interface ArchetypeJson {
  id: string;
  abstract?: boolean;
  extends?: string;
  engineerRole?: string;
  steps?: ArchetypeStep[];
  rejectionRouting?: Record<string, string>;
  overrides?: ArchetypeOverrides;
}

/** The resolved output of an archetype after inheritance resolution. */
export interface ResolvedArchetype {
  id: string;
  engineerRole?: string;
  rejectionRouting: Record<string, string>;
  steps: ArchetypeStep[];
}

/**
 * Load an archetype JSON file from the archetypes directory.
 * Returns the parsed JSON or throws if not found.
 */
export async function loadArchetype(name: string): Promise<ArchetypeJson> {
  const filePath = join(ARCHETYPES_DIR, `${name}.json`);
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`Archetype not found: "${name}"`);
  }
  return file.json();
}

/**
 * Validate an archetype JSON object against archetype.schema.json.
 * Throws with validation details if invalid.
 */
export function validateArchetype(archetype: unknown): asserts archetype is ArchetypeJson {
  const schemaPath = resolveSchema("archetype");
  if (!schemaPath) {
    throw new Error("Archetype schema not found in schema registry");
  }

  // Synchronous file read for the schema (it's a small static file)
  const schemaContent = require(schemaPath);
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(schemaContent);

  if (!validate(archetype)) {
    const errors = (validate.errors ?? [])
      .map((e) => `  ${e.instancePath || "/"}: ${e.message}`)
      .join("\n");
    throw new Error(`Archetype validation failed:\n${errors}`);
  }
}

/**
 * Replace $engineer placeholders in step roles with the given engineerRole.
 * $detect is preserved as-is.
 */
export function replacePlaceholders(
  steps: ArchetypeStep[],
  engineerRole: string | undefined
): ArchetypeStep[] {
  return steps.map((step) => {
    if (step.role === "$engineer" && engineerRole && engineerRole !== "$detect") {
      return { ...step, role: engineerRole };
    }
    if (step.role === "$engineer" && engineerRole === "$detect") {
      return { ...step, role: "$detect" };
    }
    return step;
  });
}

/**
 * Apply overrides to a parent step list.
 * Order: removeSteps first, then step property modifications, then addSteps.
 */
export function applyOverrides(
  parentSteps: ArchetypeStep[],
  overrides: ArchetypeOverrides | undefined
): ArchetypeStep[] {
  if (!overrides) return parentSteps.map((s) => ({ ...s }));

  // 1. removeSteps
  let steps = parentSteps.filter(
    (s) => !(overrides.removeSteps ?? []).includes(s.id)
  );

  // 2. step property modifications
  if (overrides.steps) {
    steps = steps.map((s) => {
      const mods = overrides.steps![s.id];
      if (!mods) return { ...s };
      return { ...s, ...mods };
    });
  } else {
    steps = steps.map((s) => ({ ...s }));
  }

  // 3. addSteps
  if (overrides.addSteps) {
    for (const addStep of overrides.addSteps) {
      const { after, ...stepData } = addStep;
      const insertIndex = steps.findIndex((s) => s.id === after);
      if (insertIndex === -1) {
        throw new Error(
          `Cannot add step "${addStep.id}": anchor step "${after}" not found`
        );
      }
      steps.splice(insertIndex + 1, 0, stepData);
    }
  }

  return steps;
}

/**
 * Resolve an archetype by name: load it, resolve inheritance, apply overrides,
 * replace placeholders, and return the flat resolved result.
 *
 * Constraints enforced:
 * - Abstract archetypes cannot be used directly
 * - Only single-level inheritance is allowed
 */
export async function resolveArchetype(name: string): Promise<ResolvedArchetype> {
  const archetype = await loadArchetype(name);
  validateArchetype(archetype);

  // Reject abstract archetypes
  if (archetype.abstract) {
    throw new Error(
      `Archetype "${name}" is abstract and cannot be used directly`
    );
  }

  // No inheritance — return as-is with placeholder replacement
  if (!archetype.extends) {
    const steps = replacePlaceholders(
      archetype.steps ?? [],
      archetype.engineerRole
    );
    return {
      id: archetype.id,
      engineerRole: archetype.engineerRole,
      rejectionRouting: archetype.rejectionRouting ?? {},
      steps,
    };
  }

  // Load parent
  const parent = await loadArchetype(archetype.extends);
  validateArchetype(parent);

  // Enforce single-level inheritance: parent must not extend anything
  if (parent.extends) {
    throw new Error(
      `Single-level inheritance only: "${name}" extends "${archetype.extends}", ` +
        `which itself extends "${parent.extends}". Multi-level inheritance is not allowed.`
    );
  }

  // Apply overrides to parent steps
  const mergedSteps = applyOverrides(parent.steps ?? [], archetype.overrides);

  // Replace placeholders
  const resolvedSteps = replacePlaceholders(mergedSteps, archetype.engineerRole);

  // Build rejection routing: start with parent, remove entries for removed steps
  const rejectionRouting = { ...(parent.rejectionRouting ?? {}) };
  if (archetype.overrides?.removeSteps) {
    for (const removedId of archetype.overrides.removeSteps) {
      delete rejectionRouting[removedId];
    }
  }

  return {
    id: archetype.id,
    engineerRole: archetype.engineerRole,
    rejectionRouting,
    steps: resolvedSteps,
  };
}
