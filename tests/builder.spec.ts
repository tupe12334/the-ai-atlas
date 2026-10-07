import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { checkCatalog, type Parts } from "../src/builds";

const part = (page: Page, name: string) => page.getByRole("radio", { name, exact: true });
const card = (page: Page, name: string) => page.locator("label.part").filter({ has: part(page, name) });
const check = (page: Page) => page.locator("#check");

test("each pick narrows what fits next, and says why the rest does not fit", async ({ page }) => {
  await page.goto("./build/");
  await expect(card(page, "Moadim")).toBeVisible();

  await part(page, "Cloud").check();
  // Moadim only runs on your own machine, so it leaves the list.
  await expect(card(page, "Moadim")).toBeHidden();
  await page.getByRole("button", { name: /Show 1 part that does not fit/ }).click();
  await expect(card(page, "Moadim")).toContainText("Does not fit Cloud. Moadim runs routines on your own machine.");

  await part(page, "Claude Code").check();
  await expect(card(page, "Codex")).toBeVisible(); // Same layer: switching agents is always allowed.
  await expect(card(page, "OpenAI")).toBeHidden();
  await expect(card(page, "Claude routines")).toContainText("In 1 proven stack with your picks");
});

test("warns when two picked parts do not work together, then clears", async ({ page }) => {
  await page.goto("./build/?runtime=on-prem&agent=claude-code&scheduler=moadim&models=claude");
  await expect(check(page)).toContainText("All parts work together");
  await expect(check(page)).toContainText("Proven: Claude Code + Moadim on your own machine runs this build.");

  // Cloud does not fit Moadim, so it is folded away until asked for.
  await expect(card(page, "Cloud")).toBeHidden();
  await page.getByRole("group", { name: "Runtime" }).getByRole("button", { name: "Show 1 part that does not fit, and why" }).click();
  // Changing an earlier pick keeps the later one, and flags the clash.
  await part(page, "Cloud").check();
  await expect(check(page)).toContainText("Some parts do not work together");
  await expect(check(page)).toContainText("Moadim with Cloud: Moadim runs routines on your own machine.");
  await expect(card(page, "Moadim")).toHaveClass(/clash/);

  await part(page, "Claude routines").check();
  await expect(check(page)).toContainText("All parts work together");
});

test("asks for the required layers before the build is complete", async ({ page }) => {
  await page.goto("./build/");
  await expect(check(page)).toContainText("Pick a runtime and an agent to finish the build.");
  await part(page, "Hermes").check();
  await expect(check(page)).toContainText("Pick a runtime to finish the build.");
});

test("a build has its own link that reopens the same build", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./build/");
  await part(page, "On-prem").check();
  await part(page, "Hermes").check();
  await part(page, "Hermes cron").check();
  await page.getByLabel("Build name").fill("Home lab");
  await page.getByRole("button", { name: "Copy link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).search).toBe("?runtime=on-prem&agent=hermes&scheduler=hermes-cron&name=Home+lab");

  const other = await context.newPage();
  await other.goto(link);
  await expect(part(other, "Hermes cron")).toBeChecked();
  await expect(other.getByLabel("Build name")).toHaveValue("Home lab");
  await expect(other.locator("#route")).toContainText("Hermes cron");
  await expect(other.getByRole("link", { name: "Discuss on GitHub" })).toHaveAttribute(
    "href",
    /issues\/new\?title=Build%3A\+Home\+lab/,
  );
});

test("starts from a proven stack, saves a custom build and compares the two", async ({ page }) => {
  await page.goto("./");
  await page
    .locator("#results > li", { hasText: "Hermes + Moadim on your own machine" })
    .getByRole("link", { name: "Customize this build" })
    .click();
  await expect(part(page, "Moadim")).toBeChecked();
  await expect(check(page)).toContainText("All parts work together");

  await part(page, "Hermes cron").check();
  await page.getByLabel("Build name").fill("Hermes, own cron");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("#saved")).toContainText("Hermes, own cron");

  await page.getByLabel("Compare with").selectOption({ label: "Hermes + Moadim on your own machine" });
  const rows = page.locator("#diff tbody tr");
  await expect(rows.filter({ hasText: "Scheduler" })).toHaveClass("differs");
  await expect(rows.filter({ hasText: "Agent" })).not.toHaveClass("differs");

  // Saved builds survive a reload and can be compared too.
  await page.goto("./build/");
  await page.getByLabel("Compare with").selectOption({ label: "Hermes, own cron" });
  await expect(page.locator("#diff")).toContainText("Hermes cron");
});

test("ignores unknown or misplaced parts in a link", async ({ page }) => {
  await page.goto("./build/?runtime=hermes&agent=nope&models=claude");
  await expect(part(page, "Claude")).toBeChecked();
  await expect(page.locator("#build input[name=runtime]:checked")).toHaveCount(0);
});

test("fits a phone screen without horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./build/?runtime=cloud&agent=claude-code&scheduler=moadim");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`builder has no WCAG AA violations in ${colorScheme} mode, with a clash`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("./build/?runtime=cloud&agent=claude-code&scheduler=moadim&models=claude");
    await page.getByRole("button", { name: /Show .* do not fit/ }).first().click();
    await page.getByLabel("Compare with").selectOption({ index: 1 });
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
}

test("the catalog check rejects a proven stack that breaks a rule", () => {
  const parts: Parts = {
    "on-prem": { id: "on-prem", layer: "runtime", name: "On-prem", needs: [] },
    cloud: { id: "cloud", layer: "runtime", name: "Cloud", needs: [] },
    hermes: { id: "hermes", layer: "agent", name: "Hermes", needs: [] },
    moadim: { id: "moadim", layer: "scheduler", name: "Moadim", needs: [{ parts: ["on-prem"], why: "Local only." }] },
  };
  const stack = { runtime: ["on-prem", "cloud"], agent: ["hermes"], workflow: [], scheduler: ["moadim"], models: [] };
  expect(checkCatalog(parts, { s: stack })).toEqual(["s: moadim with cloud: Local only."]);
  expect(checkCatalog(parts, { s: { ...stack, agent: ["moadim"] } })).toEqual([
    's: "moadim" is not a agent part in parts.yaml',
  ]);
  expect(checkCatalog({ ...parts, hermes: { ...parts.hermes, needs: [{ parts: ["x"], why: "" }] } }, {})).toEqual([
    "hermes: needs an unknown part in [x]",
  ]);
});

test("on a phone, a bar keeps the build in view while picking", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./build/");
  const peek = page.locator("#peek");
  await expect(peek).toContainText("No parts picked yet");
  await part(page, "Cloud").check();
  await part(page, "Claude Code").check();
  await expect(peek).toBeInViewport();
  await expect(peek).toContainText("All parts work together");
  await expect(peek).toContainText("Cloud · Claude Code");
});
