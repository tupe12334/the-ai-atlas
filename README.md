# The AI Atlas

A catalog of AI development stacks. Filter by runtime (on-prem or cloud), agent, scheduler and models. For example: on-prem + Hermes + Moadim, or cloud + Claude Code + Claude routines.

## Add a stack

Add one YAML file to [`src/content/solutions/`](src/content/solutions/). The fields and allowed values are in the schema in [`src/content.config.ts`](src/content.config.ts). The build fails if an entry does not match the schema. New facet values show up in the filters automatically.

## Develop

```sh
pnpm install
pnpm dev    # local site
pnpm test   # build, type-check and browser tests
```

## Deploy

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) tests every PR and deploys `main` to the Cloudflare Pages project `theaiatlas`. The deploy is skipped until the `production` environment has the `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit) and `CLOUDFLARE_ACCOUNT_ID` secrets, and the Pages project exists (`wrangler pages project create theaiatlas --production-branch main`).
