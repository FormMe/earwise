// Renders public/icon.svg into PNG icons (run: node scripts/icons.mjs)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [size, name, pad] of [[192, 'icon-192.png', 0], [512, 'icon-512.png', 0], [180, 'apple-touch-icon.png', 0]]) {
  await page.setViewportSize({ width: size, height: size });
  // full-bleed square (no rounded corners) so platform masks look right
  const bleed = svg.replace('rx="30"', 'rx="0"');
  await page.setContent(`<html><body style="margin:0;background:#0f0a1f">${bleed.replace('<svg ', `<svg width="${size - pad * 2}" height="${size - pad * 2}" `)}</body></html>`);
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname, omitBackground: false });
}
await browser.close();
