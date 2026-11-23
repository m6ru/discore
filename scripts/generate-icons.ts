/**
 * Renders the app icon (capital D over a par / birdie / ace row, on forest)
 * to the PNGs browsers and phones ask for. Run after changing the design:
 *
 *   npx tsx scripts/generate-icons.ts
 *
 * Needs the Playwright Chromium (`npx playwright install chromium`) and a
 * network connection for the Space Grotesk font.
 */
import { chromium } from "@playwright/test";

const FOREST = "#1d3a2c";

type IconFile = {
  path: string;
  size: number;
  /** Corner radius as a share of the size; phones round the corners themselves. */
  radius: number;
  /** How big the mark is; maskable icons keep it inside Android's safe circle. */
  markScale: number;
};

const FILES: IconFile[] = [
  { path: "app/icon.png", size: 64, radius: 0.22, markScale: 1 },
  { path: "app/apple-icon.png", size: 180, radius: 0, markScale: 1 },
  { path: "public/icons/icon-192.png", size: 192, radius: 0, markScale: 1 },
  { path: "public/icons/icon-512.png", size: 512, radius: 0, markScale: 1 },
  { path: "public/icons/maskable-512.png", size: 512, radius: 0, markScale: 0.78 },
];

function iconHtml({ size, radius, markScale }: IconFile): string {
  const u = (size / 120) * markScale; // the canvas design is drawn at 120 px
  return `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=block">
<style>
html,body{margin:0;background:transparent}
.icon{width:${size}px;height:${size}px;border-radius:${radius * size}px;background:${FOREST};
  display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
.D{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:${64 * u}px;letter-spacing:-.04em;
  line-height:1;color:#fafaf6}
.cells{display:flex;gap:${5 * u}px;margin-top:${9 * u}px}
.cell{width:${20 * u}px;height:${10 * u}px;border-radius:${2 * u}px}
</style></head><body>
<div class="icon"><span class="D">D</span><div class="cells">
<span class="cell" style="background:#fafaf6"></span>
<span class="cell" style="background:#c9e36a"></span>
<span class="cell" style="background:#ffe566"></span>
</div></div></body></html>`;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const file of FILES) {
    await page.setViewportSize({ width: file.size, height: file.size });
    await page.setContent(iconHtml(file), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".icon").screenshot({ path: file.path, omitBackground: true });
    console.log(`wrote ${file.path} (${file.size}px)`);
  }
  await browser.close();
}

void main();
