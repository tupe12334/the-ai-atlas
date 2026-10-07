import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { z } from "astro/zod";

// Layers of a build, in the order the builder asks for them.
// Facet keys drive the filter UI in src/pages/index.astro.
export const facets = {
  runtime: "Runtime",
  agent: "Agent",
  workflow: "Workflow",
  scheduler: "Scheduler",
  models: "Models",
} as const;
export type Layer = keyof typeof facets;
const layer = z.enum(Object.keys(facets) as [Layer, ...Layer[]]);

const partId = z.string().regex(/^[a-z0-9-]+$/);

const parts = defineCollection({
  loader: file("./src/content/parts.yaml"),
  schema: z.strictObject({
    layer,
    name: z.string(),
    summary: z.string(),
    url: z.url({ protocol: /^https$/ }).optional(),
    needs: z.array(z.strictObject({ parts: z.array(partId).min(1), why: z.string() })).default([]),
  }),
});

// Ids are checked against parts.yaml by checkCatalog in src/builds.ts.
const solutions = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/solutions" }),
  // Strict so a misspelled key fails the build instead of dropping a facet.
  schema: z.strictObject({
    name: z.string(),
    summary: z.string(),
    url: z.url({ protocol: /^https$/ }),
    runtime: z.array(partId).min(1),
    agent: z.array(partId).min(1),
    workflow: z.array(partId).default([]),
    scheduler: z.array(partId).default([]),
    models: z.array(partId).default([]),
  }),
});

export const collections = { parts, solutions };
