// Compatibility rules for builds. Pure, so the pages run it at build time and in the browser.
import type { Layer } from "./content.config";

export type Part = { id: string; layer: Layer; name: string; needs: { parts: string[]; why: string }[] };
export type Parts = Record<string, Part>;
/** One part id per layer. Layers without a pick are left out. */
export type Build = Partial<Record<Layer, string>>;
/** A proven stack: the part ids it runs with, per layer. */
export type Stack = Record<Layer, string[]>;
export type Conflict = { part: string; other: string; why: string };
/** A part whose needed layer has no pick yet. `parts` lists what would fill it. */
export type Gap = { part: string; parts: string[]; why: string };

/** Every `needs` rule that the picked parts break. */
export function conflicts(build: Build, parts: Parts): Conflict[] {
  const found: Conflict[] = [];
  for (const id of Object.values(build)) {
    for (const need of parts[id].needs) {
      const other = build[parts[need.parts[0]].layer];
      if (other && !need.parts.includes(other)) found.push({ part: id, other, why: need.why });
    }
  }
  return found;
}

/** Every `needs` rule whose layer has no pick. A need is never met by leaving its layer out. */
export function gaps(build: Build, parts: Parts): Gap[] {
  return Object.values(build).flatMap((id) =>
    parts[id].needs
      .filter((need) => !build[parts[need.parts[0]].layer])
      .map((need) => ({ part: id, parts: need.parts, why: need.why })),
  );
}

/** True when the stack runs every picked part. */
export const stackHas = (stack: Stack, build: Build) =>
  Object.entries(build).every(([layer, id]) => stack[layer as Layer].includes(id));

/** Reads a build from URL params, dropping ids that are unknown or in the wrong layer. */
export function readBuild(params: URLSearchParams, parts: Parts): Build {
  const build: Build = {};
  for (const [layer, id] of params) {
    if (parts[id]?.layer === layer) build[layer as Layer] = id;
  }
  return build;
}

/** Every build a stack lists: one pick per layer, across all the alternatives it names. */
function variants(stack: Stack): Build[] {
  return Object.entries(stack).reduce<Build[]>(
    (builds, [layer, ids]) => (ids.length ? builds.flatMap((b) => ids.map((id) => ({ ...b, [layer]: id }))) : builds),
    [{}],
  );
}

/** The variants of a stack that break no rule and leave no need open. */
const workingVariants = (stack: Stack, parts: Parts) =>
  variants(stack).filter((b) => !conflicts(b, parts).length && !gaps(b, parts).length);

/** The first working variant of a stack, as a build to start from. */
export const stackBuild = (stack: Stack, parts: Parts): Build => workingVariants(stack, parts)[0] ?? {};

/** Errors in the catalog: unknown ids, rules that point across layers wrongly, and proven stacks that break a rule. */
export function checkCatalog(parts: Parts, stacks: Record<string, Stack>): string[] {
  const errors: string[] = [];
  for (const part of Object.values(parts)) {
    for (const need of part.needs) {
      const layers = new Set(need.parts.map((id) => parts[id]?.layer));
      if (need.parts.some((id) => !parts[id])) errors.push(`${part.id}: needs an unknown part in [${need.parts}]`);
      else if (layers.size > 1 || layers.has(part.layer))
        errors.push(`${part.id}: each need must list parts of one other layer, got [${need.parts}]`);
    }
  }
  if (errors.length) return errors;
  for (const [name, stack] of Object.entries(stacks)) {
    const unknown = Object.entries(stack).flatMap(([layer, ids]) =>
      ids.filter((id) => parts[id]?.layer !== layer).map((id) => `${name}: "${id}" is not a ${layer} part in parts.yaml`),
    );
    errors.push(...unknown);
    if (unknown.length) continue;
    // A stack lists alternatives per layer, and not every mix of them has to work
    // (Codex with OpenAI and Claude Code with Claude). Each listed part must work in some clean variant.
    const all = variants(stack);
    const clean = workingVariants(stack, parts);
    if (!clean.length) {
      const [c] = conflicts(all[0], parts);
      const [g] = gaps(all[0], parts);
      errors.push(
        c ? `${name}: ${c.part} with ${c.other}: ${c.why}` : `${name}: ${g.part} needs one of [${g.parts}]: ${g.why}`,
      );
      continue;
    }
    for (const [layer, ids] of Object.entries(stack)) {
      for (const id of ids) {
        if (!clean.some((b) => b[layer as Layer] === id))
          errors.push(`${name}: ${id} does not work with the other parts of the stack in any combination`);
      }
    }
  }
  return errors;
}
