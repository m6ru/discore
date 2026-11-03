import { devices, expect, test } from "@playwright/test";
import { COURSE, createUser, ensureTestCourse, scoreHoleAtPar, signIn } from "./helpers";
import { countRequests, formatCounts, type RequestCount } from "./request-count";

// Guards how many Supabase requests each common action makes from the phone
// (counted per page, so safe in parallel). Budgets allow one late Realtime
// echo. Server counts come from the shared gateway log, so they're only
// printed when the test runs alone:
//   MEASURE_REQUESTS=1 npx playwright test request-counts --workers=1
test.beforeAll(ensureTestCourse);

// Phone-side requests per action (2026-11-03, after PR 1 of the state-handling plan).
const BROWSER_BUDGET: Record<string, number> = {
  "open Home (empty)": 2,
  "tap layout → draft": 7,
  "open draft round": 5,
  "add guest": 3,
  "remove guest": 2,
  "search + pick + invite": 4,
  "cancel invite (remove invitee)": 3,
  "invitee accepts (scorer's screen)": 4,
  "remove accepted player": 4,
  "start round": 4,
  "open active round": 6,
  "score hole 1 (Next hole)": 1,
  "score hole 2 (Save scores)": 1,
  "confirm round": 7,
  "open finished round": 6,
  "open Home (1 round)": 2,
  "open History": 0,
  "open course page": 0,
  "open course stats": 0,
  "open Profile": 0,
  "open Courses list": 0,
};

test("request counts per action", async ({ page, browser }) => {
  test.setTimeout(180_000);
  const scorer = await createUser("Mira");
  const friend = await createUser("Toomas");
  const counts: RequestCount[] = [];
  const measure = async (action: string, run: () => Promise<void>) => {
    counts.push(await countRequests(page, action, run));
  };
  const removeButton = (label: string) =>
    page.locator("div").filter({ has: page.locator(`span:text-is("${label}")`) }).getByRole("button", { name: "Remove" }).last();

  await signIn(page, scorer);

  await measure("open Home (empty)", async () => {
    await page.goto("/");
    await expect(page.getByText(/Tere/)).toBeVisible();
  });
  await page.goto(`/courses/${COURSE.slug}`);
  await measure("tap layout → draft", async () => {
    await page.getByRole("button", { name: new RegExp(COURSE.layout) }).click();
    await page.waitForURL(/\/rounds\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("button", { name: "Start round" })).toBeVisible();
  });
  const roundUrl = page.url();

  await measure("open draft round", async () => {
    await page.goto(roundUrl);
    await expect(page.getByRole("button", { name: "Start round" })).toBeVisible();
  });
  await measure("add guest", async () => {
    await page.getByRole("button", { name: "Add another player" }).click();
    await page.getByRole("textbox", { name: "Player name" }).fill("Gary");
    await page.getByRole("button", { name: "Add player" }).click();
    await expect(removeButton("Gary")).toBeVisible();
  });
  await measure("remove guest", async () => {
    await removeButton("Gary").click();
    await expect(page.getByText("Gary", { exact: true })).toHaveCount(0);
  });
  await measure("search + pick + invite", async () => {
    await page.getByRole("button", { name: "Add another player" }).click();
    await page.getByRole("textbox", { name: "Player name" }).fill(friend.displayName);
    await page.getByRole("button", { name: friend.displayName }).click();
    await page.getByRole("button", { name: "Add player" }).click();
    await expect(page.getByText(new RegExp(`Waiting for ${friend.displayName}`))).toBeVisible();
  });
  await measure("cancel invite (remove invitee)", async () => {
    await removeButton(friend.displayName).click();
    await expect(page.getByText(friend.displayName, { exact: true })).toHaveCount(0);
  });

  // A second friend accepts on their own phone (the scorer's screen updates
  // via Realtime); then the scorer removes them (participant delete + invite
  // cancel). A cancelled invite can't be re-sent (unique round + user), hence
  // a second friend.
  const joiner = await createUser("Jaan");
  await page.getByRole("button", { name: "Add another player" }).click();
  await page.getByRole("textbox", { name: "Player name" }).fill(joiner.displayName);
  await page.getByRole("button", { name: joiner.displayName }).click();
  await page.getByRole("button", { name: "Add player" }).click();
  await expect(page.getByText(new RegExp(`Waiting for ${joiner.displayName}`))).toBeVisible();
  const joinerContext = await browser.newContext({ ...devices["iPhone 13"], baseURL: test.info().project.use.baseURL });
  const joinerPage = await joinerContext.newPage();
  await signIn(joinerPage, joiner);
  await measure("invitee accepts (scorer's screen)", async () => {
    await joinerPage.getByRole("button", { name: "Accept" }).click();
    await joinerPage.waitForURL(roundUrl);
    await expect(page.getByText(/Waiting for/)).toHaveCount(0);
  });
  await joinerContext.close();
  await measure("remove accepted player", async () => {
    await removeButton(joiner.displayName).click();
    await expect(page.getByText(joiner.displayName, { exact: true })).toHaveCount(0);
  });

  await page.getByRole("button", { name: "Add another player" }).click();
  await page.getByRole("textbox", { name: "Player name" }).fill("Gary");
  await page.getByRole("button", { name: "Add player" }).click();
  await expect(removeButton("Gary")).toBeVisible();

  await measure("start round", async () => {
    await page.getByRole("button", { name: "Start round" }).click();
    await expect(page.getByRole("heading", { name: "Hole 1 of 2" })).toBeVisible();
  });
  await measure("open active round", async () => {
    await page.goto(roundUrl);
    await expect(page.getByRole("heading", { name: "Hole 1 of 2" })).toBeVisible();
  });
  await measure("score hole 1 (Next hole)", async () => {
    await scoreHoleAtPar(page, [scorer.firstName, "Gary"], 1, 2);
    await expect(page.getByRole("heading", { name: "Hole 2 of 2" })).toBeVisible();
  });
  await measure("score hole 2 (Save scores)", async () => {
    await scoreHoleAtPar(page, [scorer.firstName, "Gary"], 2, 2);
    await expect(page.getByRole("heading", { name: "All holes played" })).toBeVisible();
  });
  await measure("confirm round", async () => {
    await page.getByRole("button", { name: "Confirm round" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("Completed")).toBeVisible();
  });
  await measure("open finished round", async () => {
    await page.goto(roundUrl);
    await expect(page.getByText("Completed")).toBeVisible();
  });

  for (const [action, path] of [
    ["open Home (1 round)", "/"],
    ["open History", "/rounds"],
    ["open course page", `/courses/${COURSE.slug}`],
    ["open course stats", `/courses/${COURSE.slug}/stats`],
    ["open Profile", "/auth"],
    ["open Courses list", "/courses"],
  ] as const) {
    await measure(action, async () => {
      await page.goto(path);
      await page.waitForLoadState("load");
    });
  }

  const report = formatCounts(counts);
  if (process.env.MEASURE_REQUESTS) {
    console.log(`\nSupabase requests per action\n${report}\n`);
  }
  await test.info().attach("request-counts.txt", { body: report, contentType: "text/plain" });
  for (const { action, browser } of counts) {
    expect.soft(browser.length, `${action}: ${browser.join(", ")}`).toBeLessThanOrEqual(BROWSER_BUDGET[action]);
  }
});
