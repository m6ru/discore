import { expect, test } from "@playwright/test";
import { signUpTokenHash } from "./helpers";

// The confirmation email links to /auth/confirm with a token hash, so the link
// works in any browser (no PKCE verifier from the sign-up browser needed).
test("the email confirmation link signs a new player in, once", async ({ page }) => {
  const tokenHash = await signUpTokenHash("Confy");
  const link = `/auth/confirm?token_hash=${tokenHash}&type=email`;

  await page.goto(link);
  await page.waitForURL("/");
  await expect(page.getByText("Tere, Confy")).toBeVisible();

  // A used link explains itself instead of showing an auth error.
  await page.context().clearCookies();
  await page.goto(link);
  await page.waitForURL(/\/auth\?message=/);
  await expect(page.getByText("This link has expired or was already used.")).toBeVisible();
});
