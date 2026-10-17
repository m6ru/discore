import { expect, test } from "@playwright/test";
import { COURSE, createUser, ensureTestCourse, scoreAllHolesAtPar, signIn, startTestLayout } from "./helpers";

test.beforeAll(ensureTestCourse);

test("anonymous trial round is saved to history after signing in", async ({ page }) => {
  await startTestLayout(page);
  await page.waitForURL("/rounds/trial");

  await page.getByRole("textbox", { name: "Your name" }).fill("Kris");
  await page.getByRole("textbox", { name: "Guest name" }).fill("Gary");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Start round" }).click();

  await scoreAllHolesAtPar(page, ["Kris", "Gary"], 2);
  await page.getByRole("button", { name: "Complete round" }).click();
  await expect(page.getByRole("link", { name: "Create account to save this round" })).toBeVisible();

  // Signing in claims the trial (claim_trial RPC) and clears it from the browser.
  const user = await createUser("Kris");
  await signIn(page, user);
  await expect(page.getByText("Your trial round was saved to history.")).toBeVisible();

  await page.goto("/rounds");
  await page.getByRole("link", { name: new RegExp(COURSE.name) }).first().click();
  await expect(page.getByRole("cell", { name: "Gary" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("discore:local-trial"))).toBeNull();
});
