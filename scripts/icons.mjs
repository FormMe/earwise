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
// maskable: glyph scaled into the 80% safe zone on a full-bleed gradient
{
  const size = 512;
  await page.setViewportSize({ width: size, height: size });
  const bg = svg.replace('rx="30"', 'rx="0"').replace(/(<rect[^>]*\/>)[\s\S]*$/, '$1</svg>');
  const glyph = svg.replace(/<rect[^>]*\/>/, '');
  await page.setContent(`<html><body style="margin:0;position:relative;width:${size}px;height:${size}px">
    <div style="position:absolute;inset:0">${bg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>
    <div style="position:absolute;left:${size * 0.15}px;top:${size * 0.15}px">${glyph.replace('<svg ', `<svg width="${size * 0.7}" height="${size * 0.7}" `)}</div>
  </body></html>`);
  await page.screenshot({ path: new URL('../public/icon-maskable-512.png', import.meta.url).pathname });
}
await browser.close();
