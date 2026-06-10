import { chromium } from 'playwright';
import fs from 'fs';

const url = 'http://localhost:3100';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(String(err)));

await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);

fs.mkdirSync('/tmp/app-screens', { recursive: true });
await page.screenshot({ path: '/tmp/app-screens/home.png', fullPage: true });

console.log('TITLE:', await page.title());
console.log('URL:', page.url());
console.log('BODY_SNIPPET:', (await page.locator('body').innerText()).slice(0, 500));
console.log('CONSOLE_ERRORS:', JSON.stringify(errors));

await browser.close();
