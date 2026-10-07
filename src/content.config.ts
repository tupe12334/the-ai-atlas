import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Facet keys drive the filter UI in src/pages/index.astro.
export const facets = {
  runtime: "Runtime",
  agent: "Agent",
  scheduler: "Scheduler",
  models: "Models",
} as const;

const facetValue = z.string().trim().min(1);

const solutions = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/solutions" }),
  // Strict so a misspelled key fails the build instead of dropping a facet.
  schema: z.strictObject({
    name: z.string(),
    summary: z.string(),
    url: z.url({ protocol: /^https$/ }),
    runtime: z.array(z.enum(["on-prem", "cloud"])).min(1),
    agent: z.array(facetValue).min(1),
    scheduler: z.array(facetValue).default([]),
    models: z.array(facetValue).default([]),
  }),
});

export const collections = { solutions };
