import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";

// Counts Supabase requests made during one user action, from both sides:
// - browser: the phone's own calls (seen by Playwright),
// - server: calls the Next server makes while rendering (seen in the local
//   API gateway's access log, the `supabase_kong_<project_id>` container).
// Server counts include every request in the window, so only trust them when
// nothing else runs: `MEASURE_REQUESTS=1 npx playwright test request-counts --workers=1`.

const SUPABASE_URL = process.env.E2E_SUPABASE_URL!;
const KONG_CONTAINER = "supabase_kong_discore";
const MARKER_AGENT = "discore-request-count";

export type RequestCount = {
  action: string;
  browser: string[];
  server: string[] | null;
  /** Next.js page payload fetches (navigation / router.refresh), not Supabase. */
  rsc: number;
};

/** "GET round_participants" from a PostgREST / Auth / RPC URL. */
function describe(method: string, url: string): string {
  const { pathname } = new URL(url, SUPABASE_URL);
  const name = pathname.replace(/^\/(rest|auth|storage)\/v1\//, "").replace(/^rpc\//, "rpc ");
  return `${method} ${name}`;
}

async function marker(): Promise<string> {
  const id = randomUUID();
  await fetch(`${SUPABASE_URL}/rest/v1/?request-count-marker=${id}`, {
    headers: { "User-Agent": MARKER_AGENT },
  }).catch(() => undefined);
  return id;
}

/** Gateway log lines between two markers, minus the browser's and realtime's. */
function serverRequestsBetween(startId: string, endId: string): string[] | null {
  let log: string;
  try {
    // Docker writes the gateway log to stderr and stdout; capture both.
    log = execFileSync("docker", ["logs", "--tail", "4000", KONG_CONTAINER], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const out = error as { stdout?: string; stderr?: string };
    if (!out.stdout && !out.stderr) return null;
    log = `${out.stdout ?? ""}${out.stderr ?? ""}`;
  }
  const lines = log.split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes(startId));
  const end = lines.findIndex((line) => line.includes(endId));
  if (start < 0 || end < 0) return null;
  return lines
    .slice(start + 1, end)
    .map((line) => line.match(/"(GET|POST|PATCH|PUT|DELETE|HEAD) (\S+) HTTP[^"]*" \d+ \d+ "[^"]*" "([^"]*)"/))
    .flatMap((match) =>
      match && !/Mozilla/.test(match[3]) && !match[2].startsWith("/realtime/") && match[3] !== MARKER_AGENT
        ? [describe(match[1], match[2])]
        : []
    );
}

/**
 * Runs `action`, then waits until neither Supabase nor Next has had a request
 * for `quietMs` (Realtime echoes and refreshes arrive after the click).
 */
export async function countRequests(
  page: Page,
  action: string,
  run: () => Promise<void>,
  { quietMs = 1500 }: { quietMs?: number } = {}
): Promise<RequestCount> {
  const browser: string[] = [];
  let rsc = 0;
  let lastRequestAt = Date.now();
  const onRequest = (request: import("@playwright/test").Request) => {
    const url = request.url();
    if (url.startsWith(SUPABASE_URL) && !url.includes("/realtime/")) {
      browser.push(describe(request.method(), url));
      lastRequestAt = Date.now();
    } else if (request.headers()["rsc"] === "1" || url.includes("_rsc=")) {
      rsc++;
      lastRequestAt = Date.now();
    }
  };

  const startId = await marker();
  page.on("request", onRequest);
  await run();
  lastRequestAt = Date.now();
  while (Date.now() - lastRequestAt < quietMs) {
    await page.waitForTimeout(250);
  }
  page.off("request", onRequest);
  const endId = await marker();

  return { action, browser, server: serverRequestsBetween(startId, endId), rsc };
}

/** One line per action: "action | browser n | server n | rsc n", then the calls. */
export function formatCounts(counts: RequestCount[]): string {
  const width = Math.max(...counts.map((c) => c.action.length));
  return counts
    .map((c) => {
      const server = c.server ? String(c.server.length) : "?";
      const head = `${c.action.padEnd(width)} | browser ${String(c.browser.length).padStart(2)} | server ${server.padStart(2)} | rsc ${c.rsc}`;
      const detail = [
        c.browser.length ? `    browser: ${c.browser.join(", ")}` : null,
        c.server?.length ? `    server:  ${c.server.join(", ")}` : null,
      ].filter(Boolean);
      return [head, ...detail].join("\n");
    })
    .join("\n");
}
