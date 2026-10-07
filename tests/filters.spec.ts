import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const visible = (page: import("@playwright/test").Page) =>
  page.locator("#results > li:visible h2");

test("filters AND across facets, OR within a facet, and round-trip the URL", async ({ page }) => {
  await page.goto("./?runtime=on-prem&scheduler=moadim");
  await expect(visible(page)).toHaveText([
    "Claude Code + Moadim on your own machine",
    "Hermes + Moadim on your own machine",
  ]);

  // Each step only uses options that still lead to stacks.
  await page.getByRole("checkbox", { name: "On-prem", exact: true }).uncheck();
  await page.getByLabel("Claude routines").check();
  await page.getByRole("checkbox", { name: "Cloud", exact: true }).check();
  await expect(visible(page)).toHaveText(["Claude Code routines in the cloud"]);
  await expect(page.locator("#count")).toHaveText(/^1 of \d+ stacks$/);
  expect(new URL(page.url()).searchParams.getAll("scheduler").sort()).toEqual([
    "claude-routines",
    "moadim",
  ]);
});

test("fits a phone screen without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("shows an empty state and clears filters", async ({ page }) => {
  await page.goto("./?runtime=on-prem&agent=jules");
  await expect(visible(page)).toHaveCount(0);
  await expect(page.locator("#empty")).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("#empty")).toBeHidden();
  await expect(page.locator("#count")).toHaveText(/^(\d+) of \1 stacks$/);
  expect(new URL(page.url()).search).toBe("");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`has no WCAG AA violations in ${colorScheme} mode, with filters selected`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("./?runtime=on-prem&runtime=cloud&agent=hermes&scheduler=moadim&models=claude");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
}

test("hides Clear filters until a filter is set", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeHidden();
  await page.getByLabel("Hermes", { exact: true }).check();
  await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
});

test("hides options that would lead to no stacks", async ({ page }) => {
  const option = (name: string) => page.locator("label.option", { hasText: name });
  await page.goto("./");
  await expect(option("Claude routines")).toBeVisible();

  const onPrem = page.getByRole("checkbox", { name: "On-prem", exact: true });
  await onPrem.check();
  // Claude routines and Jules only run in the cloud.
  await expect(option("Claude routines")).toBeHidden();
  await expect(page.locator("label.option", { hasText: /^Jules$/ })).toBeHidden();
  await expect(option("Moadim")).toBeVisible();
  // Options in the same facet stay, since checking them widens the results (OR).
  await expect(page.locator("label.option", { hasText: /^Cloud$/ })).toBeVisible();

  await onPrem.uncheck();
  await expect(option("Claude routines")).toBeVisible();
});

test("keeps a checked option visible even when nothing else matches", async ({ page }) => {
  await page.goto("./?runtime=on-prem&scheduler=jules-scheduled-tasks");
  await expect(page.locator("#empty")).toBeVisible();
  await expect(page.getByLabel("Jules scheduled tasks")).toBeChecked();
  await expect(page.locator("label.option", { hasText: "Jules scheduled tasks" })).toBeVisible();
});

test("filters by workflow tool", async ({ page }) => {
  await page.goto("./");
  await page.getByLabel("Temporal", { exact: true }).check();
  await expect(visible(page)).toHaveText(["Agent steps in Temporal", "Duolingo agentic workflows"]);

  await page.getByLabel("Temporal", { exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "On-prem", exact: true }).check();
  // Zapier only runs in the cloud, so it can't lead to an on-prem stack.
  await expect(page.locator("label.option", { hasText: /^Zapier$/ })).toBeHidden();
  await expect(page.locator("label.option", { hasText: /^n8n$/ })).toBeVisible();
});

test("shows who runs each stack, and filters by proof and by search", async ({ page }) => {
  await page.goto("./");
  const stripe = page.locator("#results > li", { hasText: "Stripe Minions" });
  await expect(stripe.locator(".byline")).toHaveText("Runs at Stripe");
  await expect(page.locator("#results > li", { hasText: "Jules with scheduled tasks" }).locator(".byline")).toHaveText(
    "Template by Google",
  );

  await page.getByLabel("Runs in production").check();
  await expect(visible(page).filter({ hasText: "Jules with scheduled tasks" })).toHaveCount(0);
  await expect(visible(page).filter({ hasText: "Stripe Minions" })).toHaveCount(1);

  await page.getByLabel("Search companies and stacks").fill("shopify");
  await expect(visible(page)).toHaveText(["Shopify River", "Shopify Roast"]);
  expect(new URL(page.url()).searchParams.get("q")).toBe("shopify");

  // A shared link restores the search.
  await page.goto("./?q=devin");
  await expect(page.getByLabel("Search companies and stacks")).toHaveValue("devin");
  await expect(visible(page).first()).toBeVisible();
  for (const name of await visible(page).allTextContents()) expect(name.toLowerCase()).toContain("devin");
});
