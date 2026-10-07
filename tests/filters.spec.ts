import { expect, test } from "@playwright/test";

const visible = (page: import("@playwright/test").Page) =>
  page.locator("#results li:visible h2");

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
