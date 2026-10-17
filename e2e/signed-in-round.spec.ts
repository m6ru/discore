import { expect, test } from "@playwright/test";
import { COURSE, createUser, ensureTestCourse, scoreAllHolesAtPar, signIn, startTestLayout } from "./helpers";

test.beforeAll(ensureTestCourse);

test("signed-in scorer plays a round with a guest and completes it", async ({ page }) => {
  const scorer = await createUser("Alice");
  await signIn(page, scorer);

  await startTestLayout(page);
  await page.waitForURL(/\/rounds\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: "Start round" })).toBeVisible();

  await page.getByRole("button", { name: "+ Add another player" }).click();
  await page.getByRole("textbox", { name: "Player name" }).fill("Gary");
  await page.getByRole("button", { name: "Add player" }).click();
  await expect(page.getByText("Gary")).toBeVisible();

  await page.getByRole("button", { name: "Start round" }).click();
  await scoreAllHolesAtPar(page, [scorer.firstName, "Gary"], 2);
  await page.getByRole("button", { name: "Confirm and end round" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Complete round" }).click();
  await expect(page.getByText("Completed")).toBeVisible();

  // History only lists finished rounds.
  await page.goto("/rounds");
  await expect(page.getByRole("link", { name: new RegExp(COURSE.name) }).first()).toBeVisible();
});
