import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

// Service-role client for the LOCAL stack (playwright.config.ts refuses anything else).
const admin = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export const COURSE = { slug: "e2e-test-park", name: "E2E Test Park", layout: "Two Holes" };
export const PASSWORD = "e2e-password-123";

/** A tiny 2-hole course so tests don't depend on the real catalog. Idempotent. */
export async function ensureTestCourse(): Promise<void> {
  const { data: course, error: courseError } = await admin
    .from("courses")
    .upsert({ slug: COURSE.slug, name: COURSE.name, location: "Testville" }, { onConflict: "slug" })
    .select("id")
    .single();
  if (courseError) throw courseError;

  const { data: layout, error: layoutError } = await admin
    .from("layouts")
    .upsert(
      { course_id: course.id, slug: "two-holes", name: COURSE.layout, total_par: 6, total_distance_m: 150, is_active: true },
      { onConflict: "course_id,slug" },
    )
    .select("id")
    .single();
  if (layoutError) throw layoutError;

  const { error: holesError } = await admin.from("holes").upsert(
    [
      { layout_id: layout.id, hole_number: 1, par: 3, distance_m: 70 },
      { layout_id: layout.id, hole_number: 2, par: 3, distance_m: 80 },
    ],
    { onConflict: "layout_id,hole_number" },
  );
  if (holesError) throw holesError;
}

export type TestUser = { email: string; firstName: string; lastName: string; displayName: string };

/** A fresh confirmed user with a unique name, so parallel tests never collide. */
export async function createUser(firstName: string): Promise<TestUser> {
  const lastName = `E2e${randomUUID().slice(0, 6)}`;
  const email = `${firstName.toLowerCase()}-${randomUUID()}@e2e.local`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error) throw error;
  return { email, firstName, lastName, displayName: `${firstName} ${lastName}` };
}

export async function signIn(page: Page, user: TestUser): Promise<void> {
  await page.goto("/auth");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

/** Opens the test course and taps its layout (starts a trial or a draft round). */
export async function startTestLayout(page: Page): Promise<void> {
  await page.goto(`/courses/${COURSE.slug}`);
  await page.getByRole("button", { name: new RegExp(COURSE.layout) }).click();
}

/**
 * Scores every hole: each player gets par (+ taps "Increase strokes" once on
 * the suggested par), then saves. Works for both trial and signed-in scoring.
 */
export async function scoreAllHolesAtPar(page: Page, players: string[], holeCount: number): Promise<void> {
  for (let hole = 1; hole <= holeCount; hole++) {
    await expect(page.getByText(new RegExp(`Hole ${hole} / ${holeCount}`))).toBeVisible();
    for (const player of players) {
      await page.getByRole("button", { name: new RegExp(`^\\d+\\. ${player}`) }).click();
      await page.getByRole("button", { name: "Increase strokes" }).click();
    }
    const save = hole < holeCount ? "Save and go to next hole" : "Save scores";
    await page.getByRole("button", { name: save }).click();
  }
}
