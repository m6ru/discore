/**
 * Renders the app icon ("db", short for discbook, on forest; the phone writes
 * discbook under it) to the PNGs browsers and phones ask for, and the share image chat apps show
 * for a link (app/opengraph-image.png). Run after changing the design:
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

/** "db" on every icon (owner, 2026-11-24): bold at home-screen size, still two letters in a tab. */
function iconHtml({ size, radius, markScale }: IconFile): string {
  const u = (size / 120) * markScale; // the canvas design is drawn at 120 px
  const fontSize = 72 * u;
  return `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=block">
<style>
html,body{margin:0;background:transparent}
.icon{width:${size}px;height:${size}px;border-radius:${radius * size}px;background:${FOREST};
  display:flex;align-items:center;justify-content:center;overflow:hidden}
.mark{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:${fontSize}px;letter-spacing:-.03em;
  line-height:1;color:#fafaf6;transform:translateY(-3%)}
</style></head><body>
<div class="icon"><span class="mark">db</span></div></body></html>`;
}

/** 1200 × 630: the wordmark and the splash's score cells, with the tagline. */
function shareImageHtml(): string {
  return `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=JetBrains+Mono:wght@600&family=Manrope:wght@500&display=block">
<style>
html,body{margin:0}
.card{width:1200px;height:630px;background:${FOREST};color:#fafaf6;box-sizing:border-box;padding:0 104px;
  display:flex;flex-direction:column;justify-content:center}
.word{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:132px;letter-spacing:-.03em;line-height:1}
.cells{display:flex;gap:14px;margin-top:40px}
.cell{width:56px;height:84px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  font-family:'JetBrains Mono',monospace;font-weight:600;font-size:38px;color:#141814}
.line{font-family:Manrope,sans-serif;font-weight:500;font-size:44px;line-height:1.3;margin-top:48px;color:rgba(250,250,246,.82)}
</style></head><body>
<div class="card"><div class="word">discbook</div>
<div class="cells"><span class="cell" style="background:#fafaf6">3</span><span class="cell" style="background:#c9e36a">2</span><span class="cell" style="background:#ffe566">1</span></div>
<div class="line">Disc golf scorecard for you<br>and your friends.</div></div></body></html>`;
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
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(shareImageHtml(), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".card").screenshot({ path: "app/opengraph-image.png" });
  console.log("wrote app/opengraph-image.png (1200 × 630)");
  await browser.close();
}

void main();
