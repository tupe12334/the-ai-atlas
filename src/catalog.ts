// The catalog as the pages see it. Loading it checks every proven stack against the rules,
// so a stack that breaks a rule fails the build.
import { getCollection } from "astro:content";
import { facets, type Layer } from "./content.config";
import { checkCatalog, type Part, type Stack } from "./builds";

export const layers = Object.keys(facets) as Layer[];

export const parts: Record<string, Part & { summary: string; url?: string }> = Object.fromEntries(
  (await getCollection("parts")).map(({ id, data }) => [id, { id, ...data }]),
);

export const solutions = (await getCollection("solutions"))
  .sort((a, b) => a.data.name.localeCompare(b.data.name))
  .map(({ id, data }) => ({ id, ...data, stack: Object.fromEntries(layers.map((l) => [l, data[l]])) as Stack }));

const errors = checkCatalog(parts, Object.fromEntries(solutions.map((s) => [s.id, s.stack])));
if (errors.length) throw new Error(`The catalog breaks its own rules:\n${errors.join("\n")}`);

export const base = import.meta.env.BASE_URL.replace(/\/$/, "");
