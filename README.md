# The AI Atlas

Design your own AI solution piece by piece, with confidence that the pieces work together.

- **Proven stacks**: a catalog of AI development stacks that people already run. Filter by runtime, agent, workflow tool, scheduler and models.
- **Build your own** (`/build/`): pick one part per layer. Each pick narrows what fits next, and the build sheet warns when two parts do not work together, and says why. A build has its own link, so you can share it, save it in your browser, compare it with other builds and discuss it on GitHub. Any proven stack is a starting point.

## Add a part or a compatibility rule

Edit [`src/content/parts.yaml`](src/content/parts.yaml). A part's `needs` say which parts of another layer it works with, and why.

## Add a stack

Add one YAML file to [`src/content/solutions/`](src/content/solutions/). It lists part ids from `parts.yaml`. The fields are in the schema in [`src/content.config.ts`](src/content.config.ts). The build fails if an entry does not match the schema, uses an unknown part, or breaks a compatibility rule ([`src/builds.ts`](src/builds.ts)).

## Develop

```sh
pnpm install
pnpm dev    # local site
pnpm test   # build, type-check and browser tests
```

## Deploy

Every push to `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml): it tests the site, then deploys it to GitHub Pages at https://tupe12334.github.io/the-ai-atlas/.
