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
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--window-position=0,0',
    '--window-size=960,540',
    '--kiosk',
    '--disable-infobars',
    '--disable-frame-rate-limit',
    '--disable-renderer-backgrounding'
  ]
});

const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
const pages = context.pages();
const page = pages[0] || await context.newPage();

page.on('console', message => console.log(`[browser:${message.type()}] ${message.text()}`));
page.on('pageerror', error => console.error(`[browser:error] ${error.message}`));

await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.gameReady === true, null, { timeout: 60000 });
await page.waitForTimeout(1200);
await writeFile(readyFile, 'ready');

// The shell recorder terminates this process after FFmpeg has a valid video.
await page.waitForTimeout(300000);
await browser.close();
