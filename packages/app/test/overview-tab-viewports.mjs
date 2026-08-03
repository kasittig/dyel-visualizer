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
  const path =
    '/?mode=text&text=comp%20squat%201rm%20300lbs%0Acomp%20bench%201rm%20200lbs%0Acomp%20deadlift%201rm%20400lbs';

  for (const width of [641, 768, 1024, 1280, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });

    const overviewTab = page.getByRole('tab', { name: 'Overview', exact: true });
    if ((await overviewTab.count()) !== 1 || !(await overviewTab.isVisible())) {
      failures.push(`${width}px: desktop/tablet Overview tab is not visible with a clear name`);
    }

    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    if (overflow.document > overflow.viewport || overflow.body > overflow.viewport) {
      failures.push(`${width}px: horizontal overflow ${JSON.stringify(overflow)}`);
    }

    await page.close();
  }

  await browser.close();
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('Overview tab checks passed at 641, 768, 1024, 1280, and 1440px.');
} finally {
  stop();
}
