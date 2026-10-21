import { randomUUID } from "node:crypto";
import zlib from "node:zlib";
import { devices, expect, test } from "@playwright/test";
import { COURSE, createUser, ensureTestCourse, latestSuggestion, makeAdmin, signIn, startTestLayout } from "./helpers";

test.beforeAll(ensureTestCourse);

/** A valid solid-colour PNG, so the browser can decode and re-encode it like a phone photo. */
function makePng(size: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0x2a)]);
  const pixels = zlib.deflateSync(Buffer.concat(Array.from({ length: size }, () => row)));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", pixels),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const PHOTO = makePng(64);

test("a player suggests a fix, the admin applies it, the player is thanked", async ({ browser, page, baseURL }) => {
  const note = `Hole 2 is par 4 now (${randomUUID().slice(0, 8)})`;
  const player = await createUser("Sara");
  await signIn(page, player);

  await page.goto(`/courses/${COURSE.slug}`);
  await page.getByRole("link", { name: "Suggest a fix" }).click();
  await page.getByRole("button", { name: "Hole par or length" }).click();
  await page.getByLabel("Details").fill(note);
  await page.getByLabel("Add photos").setInputFiles({ name: "tee.png", mimeType: "image/png", buffer: PHOTO });
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await page.getByRole("button", { name: "Send suggestion" }).click();
  await expect(page.getByText("Thanks — we'll review it.")).toBeVisible();

  // Normal users can't open the review page.
  // (Streaming has already sent 200, so check what's on screen, not the status.)
  await page.goto("/admin/suggestions");
  await expect(page.getByText(/could not be found/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Course suggestions" })).not.toBeVisible();

  // The owner reviews it on another phone.
  const owner = await createUser("Dana");
  await makeAdmin(owner);
  const ownerContext = await browser.newContext({ ...devices["iPhone 13"], baseURL });
  const ownerPage = await ownerContext.newPage();
  await signIn(ownerPage, owner);
  await ownerPage.goto("/auth");
  await ownerPage.getByRole("link", { name: /Course suggestions/ }).click();

  const card = ownerPage.getByRole("listitem").filter({ hasText: note });
  await expect(card).toBeVisible();
  await expect(card.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await card.getByLabel("Note to the sender").fill("Fixed — thanks!");
  await card.getByRole("button", { name: "Applied", exact: true }).click();
  await expect(card).not.toBeVisible();
  await ownerContext.close();

  // The player sees the thank-you on Home until dismissed.
  await page.goto("/");
  const thanks = page.getByText(`Your suggestion for ${COURSE.name} · ${COURSE.layout} is in the app — thanks for helping!`);
  await expect(thanks).toBeVisible();
  await expect(page.getByText("Fixed — thanks!")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(thanks).not.toBeVisible();
  await expect.poll(async () => {
    await page.reload();
    return thanks.isVisible();
  }).toBe(false);
});

test("a player suggests a new course from an empty search", async ({ page }) => {
  const player = await createUser("Nils");
  await signIn(page, player);
  const name = `Forest Park ${randomUUID().slice(0, 6)}`;

  await page.goto("/courses");
  await page.getByRole("searchbox").fill(name);
  await page.getByRole("link", { name: `Suggest “${name}”` }).click();
  await expect(page.getByLabel("Course name")).toHaveValue(name);
  await page.getByLabel("Location").fill("Testville");
  await page.getByLabel("What you know").fill("9 baskets, all par 3");
  await page.getByRole("button", { name: "Send suggestion" }).click();
  await expect(page.getByText("Thanks — we'll review it.")).toBeVisible();
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto(`/courses/suggest?course=${COURSE.slug}`);
  await page.waitForURL(/\/auth/);
  await expect(page.getByText("Please sign in to suggest a change")).toBeVisible();
});

test("a scorer reports wrong hole info without leaving the round", async ({ page }) => {
  const scorer = await createUser("Hugo");
  await signIn(page, scorer);
  await startTestLayout(page);
  await page.waitForURL(/\/rounds\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Start round" }).click();
  await expect(page.getByText(/Hole 1 \/ 2/)).toBeVisible();

  await page.getByRole("button", { name: "Wrong info?" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Hole 1 — wrong info?")).toBeVisible();
  await sheet.getByRole("button", { name: "Raise par" }).click();
  await sheet.getByLabel("Length (m)").fill("75");
  await sheet.getByLabel("Notes / OB rules").fill("OB: the path on the left");
  await sheet.getByRole("button", { name: "Send", exact: true }).click();

  await expect(page.getByText("Thanks — we'll review it.")).toBeVisible();
  await expect(sheet).not.toBeVisible();
  await expect(page.getByText(/Hole 1 \/ 2/)).toBeVisible();

  const suggestion = await latestSuggestion(scorer);
  expect(suggestion.kind).toBe("hole_info");
  expect(suggestion.hole_id).not.toBeNull();
  expect(suggestion.course_id).not.toBeNull();
  expect(suggestion.note).toBe('Hole 1: Par 3 → 4 · Length 70 → 75 m\nNotes: "(none)" → "OB: the path on the left"');
});
