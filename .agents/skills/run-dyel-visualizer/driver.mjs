#!/usr/bin/env node
/**
 * Driver for dyel-visualizer dev server.
 * Usage: node driver.mjs [--url http://localhost:5173] [--sheet-url <url>] [--page index|conjugate] [--out /tmp/shots]
 *
 * Takes a screenshot of the app and saves it to --out (default /tmp/dyel-shots).
 * Exits 0 on success, non-zero on error.
 */

import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

const args = process.argv.slice(2);
const get = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : def;
};

const baseUrl = get('--url', 'http://localhost:5173');
const sheetUrl = get('--sheet-url', null);
const page = get('--page', null);
const outDir = get('--out', '/tmp/dyel-shots');

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const pg = await ctx.newPage();

let url = baseUrl;
if (page) url += `?page=${page}`;
if (sheetUrl) url += (url.includes('?') ? '&' : '?') + `url=${encodeURIComponent(sheetUrl)}`;

console.log(`Navigating to ${url}`);
await pg.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

// Wait for app to render something meaningful
await pg.waitForSelector('h1, [role="main"], .App, #root > *', { timeout: 10000 });

const ts = Date.now();
const label = page ?? 'main';
const shotPath = resolve(outDir, `${label}-${ts}.png`);
await pg.screenshot({ path: shotPath, fullPage: true });
console.log(`Screenshot: ${shotPath}`);

// Report any console errors
pg.on('console', msg => {
  if (msg.type() === 'error') console.error('Console error:', msg.text());
});

await browser.close();
