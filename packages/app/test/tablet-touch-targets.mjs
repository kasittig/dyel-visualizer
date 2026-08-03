import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = 4175;
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

  for (const width of [641, 768, 1024]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
      hasTouch: true,
    });
    for (const [name, path] of pages) {
      const page = await context.newPage();
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
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
          .filter(({ width, height }) => width < 44 || height < 44)
      );
      if (undersized.length) {
        failures.push(`${name} at ${width}px: ${JSON.stringify(undersized)}`);
      }
      await page.close();
    }
    await context.close();
  }
  await browser.close();

  if (failures.length) {
    throw new Error(`Undersized tablet touch targets detected:\n${failures.join('\n')}`);
  }
  console.log('Tablet touch-target checks passed at 641, 768, and 1024px.');
} finally {
  stop();
}
