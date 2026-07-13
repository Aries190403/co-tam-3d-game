import { chromium } from 'playwright-core';
import { readFile, writeFile, rm } from 'node:fs/promises';

const readyFile = '/tmp/co-tam-demo-ready';
await rm(readyFile, { force: true });
let html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
html = html.replace("new URLSearchParams(location.search).get('demo') === '1'", 'true');
html = html.replace('new URLSearchParams(location.search).get(`demo`)===`1`', 'true');

const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.CHROMIUM_PATH || chromium.executablePath(),
  args: [
    '--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist',
    '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader-webgl',
    '--window-position=0,0', '--window-size=1280,720', '--kiosk', '--disable-infobars',
    '--disable-frame-rate-limit', '--disable-renderer-backgrounding'
  ]
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const pages = context.pages();
const page = pages[0] || await context.newPage();
await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
await page.waitForFunction(() => window.gameReady === true, null, { timeout: 30000 });
await page.waitForTimeout(1200);
await writeFile(readyFile, 'ready');
await page.waitForTimeout(30000);
await browser.close();
