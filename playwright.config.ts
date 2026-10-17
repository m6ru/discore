import { execSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// E2E runs against the LOCAL Supabase stack only (`npx supabase start`).
// Keys come from the CLI so nothing is hard-coded and production is never touched.
function localSupabaseEnv(): Record<string, string> {
  const out = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const env: Record<string, string> = {};
  for (const line of out.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (match) env[match[1]] = match[2];
  }
  if (!env.API_URL?.startsWith("http://127.0.0.1")) {
    throw new Error(`Refusing to run E2E: Supabase API_URL is not local (${env.API_URL ?? "missing"})`);
  }
  return env;
}

const supabase = localSupabaseEnv();
process.env.E2E_SUPABASE_URL = supabase.API_URL;
process.env.E2E_SUPABASE_SERVICE_ROLE_KEY = supabase.SERVICE_ROLE_KEY;

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    ...devices["iPhone 13"],
    // Chromium with iPhone viewport/touch; WebKit isn't needed to catch app bugs.
    defaultBrowserType: "chromium",
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // A production build, like Vercel serves. Never reuse a running server:
    // it might be `npm run dev` pointed at the production database.
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.PUBLISHABLE_KEY,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
