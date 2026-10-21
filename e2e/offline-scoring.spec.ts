import { expect, test, type Page } from "@playwright/test";
import { countServerScores, createUser, ensureTestCourse, scoreHoleAtPar, signIn, startTestLayout } from "./helpers";

test.beforeAll(ensureTestCourse);

async function startSoloRound(page: Page): Promise<{ roundId: string; name: string }> {
  const scorer = await createUser("Olga");
  await signIn(page, scorer);
  await startTestLayout(page);
  await page.waitForURL(/\/rounds\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Start round" }).click();
  const roundId = page.url().split("/").pop()!;
  return { roundId, name: scorer.firstName };
}

test("scoring never waits for the network; completing waits for signal", async ({ page, context }) => {
  const { roundId, name } = await startSoloRound(page);
  await scoreHoleAtPar(page, [name], 1, 2);

  await context.setOffline(true);
  await scoreHoleAtPar(page, [name], 2, 2);

  // Saved on the phone, not on the server yet.
  const badge = page.getByRole("button", { name: /Waiting for signal · 1 hole/ });
  await expect(badge).toBeVisible();
  await expect.poll(() => countServerScores(roundId)).toBe(1);

  await page.getByRole("button", { name: "Confirm and end round" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Complete round" }).click();
  await expect(page.getByText(/No signal\. Your scores are saved on this phone/)).toBeVisible();
  await expect(page.getByText("Completed")).not.toBeVisible();

  // Back online: the queue sends by itself.
  await context.setOffline(false);
  await expect(badge).not.toBeVisible();
  await expect.poll(() => countServerScores(roundId)).toBe(2);

  await page.getByRole("button", { name: "Confirm and end round" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Complete round" }).click();
  await expect(page.getByText("Completed")).toBeVisible();
});

test("unsynced scores survive a page reload", async ({ page }) => {
  const { roundId, name } = await startSoloRound(page);

  // The page itself loads, but score saves can't get through (a dead spot).
  await page.route("**/rest/v1/hole_scores*", (route) =>
    route.request().method() === "POST" ? route.abort("internetdisconnected") : route.continue()
  );
  await scoreHoleAtPar(page, [name], 1, 2);
  await expect(page.getByRole("button", { name: /Waiting for signal · 1 hole/ })).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Hole 1 \/ 2/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Waiting for signal · 1 hole/ })).toBeVisible();
  expect(await countServerScores(roundId)).toBe(0);

  await page.unroute("**/rest/v1/hole_scores*");
  await page.getByRole("button", { name: /Waiting for signal/ }).click();
  await expect(page.getByRole("button", { name: /Waiting for signal/ })).not.toBeVisible();
  await expect.poll(() => countServerScores(roundId)).toBe(1);
});
