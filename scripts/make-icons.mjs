// Renders public/icon.svg to the PNG icons iOS and Android need.
//   node scripts/make-icons.mjs
// Uses the locally installed Google Chrome (via playwright-core).
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";

const svg = readFileSync(new URL("../public/icon.svg", import.meta.url), "utf8");
// iOS and Android "maskable" icons must be full-bleed squares: the OS rounds the corners.
const square = svg.replace(/\srx="\d+"/, "");

const outputs = [
  { file: "src/app/apple-icon.png", size: 180, svg: square }, // iOS home screen
  { file: "public/icon-192.png", size: 192, svg },
  { file: "public/icon-512.png", size: 512, svg },
  { file: "public/icon-maskable-512.png", size: 512, svg: square },
];

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
for (const { file, size, svg: markup } of outputs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${markup.replace(
      "<svg ",
      `<svg width="${size}" height="${size}" `,
    )}</body></html>`,
  );
  await page.screenshot({ path: new URL(`../${file}`, import.meta.url).pathname, omitBackground: true });
  await page.close();
  console.log(`wrote ${file} (${size}×${size})`);
}
await browser.close();
