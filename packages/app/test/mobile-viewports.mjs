import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = 4184;
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
    [
      'accessories',
      '/?mode=text&text=DB%20Curl%202026-01-30%2010lbs%20x12%0ACable%20Row%202026-02-01%2040lbs%20x10',
    ],
    ['calculator', '/?mode=text&tab=calculator&text=comp%20squat%201rm%20300lbs'],
    ['validator', '/?page=validator'],
    ['team', '/?page=team'],
  ];

  const widths = [320, 375, 390, 430, 641, 768, 820, 1024];
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 667 },
      reducedMotion: 'reduce',
      hasTouch: true,
      isMobile: width <= 430,
    });
    for (const [name, path] of pages) {
      const page = await context.newPage();
      if (name === 'accessories') {
        await page.addInitScript(() => {
          localStorage.setItem('dyel:activeTab', JSON.stringify('accessory'));
          localStorage.setItem('dyel:lastLiftTab', JSON.stringify('accessory'));
        });
      }
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
      if (name === 'accessories') {
        await page.getByRole('heading', { name: 'Accessory inventory' }).waitFor();
        await page.getByRole('columnheader', { name: 'Exercise' }).waitFor();
      }
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
      if (width >= 641) {
        const undersized = await page.evaluate(() =>
          [...document.querySelectorAll("button, [role='button'], a[href], input, select, textarea")]
            .filter((element) => {
              const style = getComputedStyle(element);
              return (
                element.getClientRects().length > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden'
              );
            })
            .map((element) => {
              const bounds = element.getBoundingClientRect();
              return {
                target:
                  element.getAttribute('aria-label') ||
                  element.getAttribute('placeholder') ||
                  element.textContent?.trim() ||
                  element.tagName.toLowerCase(),
                width: Math.round(bounds.width),
                height: Math.round(bounds.height),
              };
            })
            .filter(({ width: targetWidth, height }) => targetWidth < 44 || height < 44)
        );
        if (undersized.length) {
          failures.push(`${name} at ${width}px: undersized targets ${JSON.stringify(undersized)}`);
        }
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
      if (name === 'visualizer' && width === 390) {
        const closeSettings = page.getByRole('button', { name: 'Close data settings' });
        if (await closeSettings.isVisible()) await closeSettings.click();
        const section = page.getByRole('button', { name: /overview/i }).first();
        await section.click();
        await section.click();
        const chart = page.locator('.recharts-responsive-container').first();
        await chart.waitFor({ state: 'visible' });
        const bounds = await chart.boundingBox();
        if (!bounds || bounds.width <= 0) {
          failures.push('visualizer chart has zero width after collapse and re-expand');
        }
      }
      await page.close();
    }
    await context.close();
  }

  for (const width of [641, 768, 900, 1024]) {
    const context = await browser.newContext({
      viewport: { width, height: 667 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}${pages[0][1]}`, { waitUntil: 'domcontentloaded' });
    const toolbar = page.locator('[role="toolbar"][aria-labelledby="training-period-label"]');
    const viewNav = page.locator('nav[aria-label="Visualization views"]');
    const stickyControls = toolbar.locator('..');
    const toolbarCount = await toolbar.count();
    const mobileNavDisplay = await page
      .locator('nav[aria-label="Primary navigation"]')
      .evaluate((element) => getComputedStyle(element).display);
    if (toolbarCount !== 1) {
      failures.push(`visualizer at ${width}px: sticky controls toolbar is missing`);
    } else {
      const before = await stickyControls.evaluate((element) => ({
        position: getComputedStyle(element).position,
        top: element.getBoundingClientRect().top,
        height: element.getBoundingClientRect().height,
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(50);
      const afterTop = await stickyControls.evaluate(
        (element) => element.getBoundingClientRect().top
      );
      if (before.position !== 'sticky' || Math.abs(afterTop) > 1) {
        failures.push(
          `visualizer at ${width}px: toolbar did not remain sticky (${JSON.stringify({ before, afterTop })})`
        );
      }
      if (before.document > before.viewport) {
        failures.push(`visualizer at ${width}px: sticky toolbar causes horizontal overflow`);
      }
    }
    if ((await viewNav.count()) !== 1) {
      failures.push(`visualizer at ${width}px: visualization navigation landmark is missing`);
    }
    if (mobileNavDisplay !== 'none') {
      failures.push(`visualizer at ${width}px: mobile bottom navigation remains visible`);
    }
    await page.close();
    await context.close();
  }
  await browser.close();

  if (failures.length) {
    throw new Error(`Horizontal overflow detected:\n${failures.join('\n')}`);
  }
  console.log('Responsive viewport checks passed from 320px through 1024px.');
} finally {
  stop();
}
