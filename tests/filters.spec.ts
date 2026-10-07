import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const visible = (page: import("@playwright/test").Page) =>
  page.locator("#results > li:visible h2");

test("filters AND across facets, OR within a facet, and round-trip the URL", async ({ page }) => {
  await page.goto("./?runtime=on-prem&scheduler=Moadim");
  await expect(visible(page)).toHaveText([
    "Claude Code + Moadim on your own machine",
    "Hermes + Moadim on your own machine",
  ]);

  await page.getByLabel("on-prem").uncheck();
  await page.getByLabel("cloud").check();
  await page.getByLabel("Claude routines").check();
  await expect(visible(page)).toHaveText(["Claude Code routines in the cloud"]);
  await expect(page.locator("#count")).toHaveText(/^1 of \d+ stacks$/);
  expect(new URL(page.url()).searchParams.getAll("scheduler").sort()).toEqual([
    "Claude routines",
    "Moadim",
  ]);
});

test("fits a phone screen without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("shows an empty state and clears filters", async ({ page }) => {
  await page.goto("./?runtime=on-prem&agent=Codex");
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
    await page.goto("./?runtime=on-prem&runtime=cloud&agent=Hermes&scheduler=Moadim&models=Claude");
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
