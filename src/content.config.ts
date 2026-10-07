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

const solutions = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/solutions" }),
  schema: z.object({
    name: z.string(),
    summary: z.string(),
    url: z.url(),
    runtime: z.array(z.enum(["on-prem", "cloud"])).min(1),
    agent: z.array(z.string()).min(1),
    scheduler: z.array(z.string()).default([]),
    models: z.array(z.string()).default([]),
  }),
});

export const collections = { solutions };
