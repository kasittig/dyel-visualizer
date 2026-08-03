import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = 4174;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    new URL('../../../node_modules/vite/bin/vite.js', import.meta.url).pathname,
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  { cwd: new URL('..', import.meta.url), stdio: 'inherit' }
);

const stop = () => server.kill('SIGTERM');
process.on('exit', stop);
process.on('SIGINT', () => {
  stop();
  process.exit(130);
});

try {
  let ready = false;
  for (let attempts = 0; attempts < 60; attempts += 1) {
    try {
      ready = (await fetch(baseUrl)).ok;
      if (ready) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Vite did not start within 30 seconds');

  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const pages = [
    [
      'visualizer',
      '/?mode=text&text=comp%20squat%201rm%20300lbs%0Acomp%20bench%201rm%20200lbs%0Acomp%20deadlift%201rm%20400lbs',
    ],
    ['calculator', '/?mode=text&tab=calculator&text=comp%20squat%201rm%20300lbs'],
    ['validator', '/?page=validator'],
    ['team', '/?page=team'],
  ];

  for (const width of [320, 375, 390, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: 667 },
      reducedMotion: 'reduce',
      hasTouch: true,
      isMobile: true,
    });
    for (const [name, path] of pages) {
      const page = await context.newPage();
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        const intentionallyScrollable = (element) => {
          for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            const overflowX = getComputedStyle(parent).overflowX;
            if (
              (overflowX === 'auto' || overflowX === 'scroll') &&
              parent.scrollWidth > parent.clientWidth
            ) {
              const bounds = parent.getBoundingClientRect();
              return bounds.left >= -1 && bounds.right <= viewport + 1;
            }
          }
          return false;
        };
        return {
          viewport,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          widest: [...document.querySelectorAll('body *')]
            .filter((element) => !intentionallyScrollable(element))
            .map((element) => ({
              tag: element.tagName.toLowerCase(),
              className: typeof element.className === 'string' ? element.className : '',
              left: Math.round(element.getBoundingClientRect().left),
              right: Math.round(element.getBoundingClientRect().right),
              scrollWidth: element.scrollWidth,
            }))
            .filter(({ left, right }) => left < -1 || right > viewport + 1)
            .slice(0, 5),
        };
      });
      if (
        overflow.document > overflow.viewport ||
        overflow.body > overflow.viewport ||
        overflow.widest.length
      ) {
        failures.push(`${name} at ${width}px: ${JSON.stringify(overflow)}`);
      }
      const fixedNav = await page.locator('nav[aria-label="Primary navigation"]').count();
      if (fixedNav === 1) {
        const spacing = await page.evaluate(() => {
          const main = document.querySelector('main');
          const nav = document.querySelector('nav[aria-label="Primary navigation"]');
          return {
            bottomPadding: Number.parseFloat(getComputedStyle(main).paddingBottom),
            navHeight: nav.getBoundingClientRect().height,
          };
        });
        if (spacing.bottomPadding < spacing.navHeight) {
          failures.push(`${name} at ${width}px: fixed navigation overlaps page content`);
        }
      }
      await page.close();
    }
    await context.close();
  }
  await browser.close();

  if (failures.length) {
    throw new Error(`Horizontal overflow detected:\n${failures.join('\n')}`);
  }
  console.log('Mobile viewport checks passed at 320, 375, 390, and 430px.');
} finally {
  stop();
}
