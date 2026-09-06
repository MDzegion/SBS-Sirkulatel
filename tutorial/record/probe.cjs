const { chromium } = require('playwright-core');
const path = require('node:path');

(async () => {
  const exe = path.join(
    process.env.LOCALAPPDATA,
    'ms-playwright',
    'chromium-1243',
    'chrome-win64',
    'chrome.exe',
  );
  const browser = await chromium.launch({ executablePath: exe });
  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
    recordVideo: { dir: './record/probe', size: { width: 1080, height: 1920 } },
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5199', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.close();
  await ctx.close();
  await browser.close();
  console.log('probe done');
})();
