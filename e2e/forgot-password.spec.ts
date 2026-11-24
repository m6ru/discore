import { expect, test } from "@playwright/test";
import { createUser, recoveryTokenHash } from "./helpers";

test("a player who forgot the password can set a new one from the email link", async ({ page }) => {
  const user = await createUser("Forgy");

  await page.goto("/auth");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  // The reset email links to /auth/confirm with a token hash (works in any browser).
  await page.goto(`/auth/confirm?token_hash=${await recoveryTokenHash(user.email)}&type=recovery`);
  await expect(page.getByRole("heading", { name: "Set a new password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("brand-new-pass-1");
  await page.getByLabel("Confirm new password").fill("brand-new-pass-1");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Password updated.")).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/auth");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("brand-new-pass-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(`Tere, ${user.firstName}`)).toBeVisible();
});
