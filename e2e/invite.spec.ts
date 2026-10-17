import { devices, expect, test } from "@playwright/test";
import { createUser, ensureTestCourse, signIn, startTestLayout } from "./helpers";

test.beforeAll(ensureTestCourse);

// Two people, two browsers: the scorer invites a registered friend, who accepts
// from their Home screen (accept_invite RPC) and lands in the round.
test("scorer invites a registered friend who accepts", async ({ browser }) => {
  const scorer = await createUser("Alice");
  const friend = await createUser("Carol");

  const options = { ...devices["iPhone 13"], baseURL: test.info().project.use.baseURL };
  const scorerContext = await browser.newContext(options);
  const friendContext = await browser.newContext(options);
  const scorerPage = await scorerContext.newPage();
  const friendPage = await friendContext.newPage();

  await signIn(scorerPage, scorer);
  await startTestLayout(scorerPage);
  await scorerPage.waitForURL(/\/rounds\/[0-9a-f-]{36}$/);
  const roundUrl = scorerPage.url();

  await scorerPage.getByRole("button", { name: "+ Add another player" }).click();
  await scorerPage.getByRole("textbox", { name: "Player name" }).fill(friend.displayName);
  await scorerPage.getByRole("button", { name: friend.displayName }).click();
  await scorerPage.getByRole("button", { name: "Add player" }).click();
  await expect(scorerPage.getByText(new RegExp(`Waiting for ${friend.displayName}`))).toBeVisible();

  await signIn(friendPage, friend);
  await expect(friendPage.getByRole("heading", { name: "Pending invites" })).toBeVisible();
  await friendPage.getByRole("button", { name: "Accept" }).click();
  await friendPage.waitForURL(roundUrl);

  // The scorer sees the friend join without the "waiting" notice.
  await scorerPage.reload();
  await expect(scorerPage.getByText(friend.displayName)).toBeVisible();
  await expect(scorerPage.getByText(/Waiting for/)).toHaveCount(0);

  await scorerContext.close();
  await friendContext.close();
});
