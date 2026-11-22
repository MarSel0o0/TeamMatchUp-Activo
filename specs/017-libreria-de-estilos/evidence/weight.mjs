// Peso que descarga una página de la construcción de producción (RNF-7). Uso:
//   PW=<playwright-core/index.mjs> node weight.mjs <url> [ruta ...]   (por defecto: /login)
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const base = process.argv[2] ?? 'http://localhost:5175';
const routes = process.argv.slice(3).length ? process.argv.slice(3) : ['/login'];
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const files = [];
  page.on('response', async (res) => {
    const url = new URL(res.url());
    if (!/\.(js|css|woff2?)$/.test(url.pathname)) return;
    const body = await res.body().catch(() => null);
    files.push({ file: url.pathname.split('/').pop(), type: url.pathname.split('.').pop(), bytes: body ? body.length : 0 });
  });
  await page.goto(base + route);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const sum = (t) => files.filter((f) => f.type === t).reduce((a, f) => a + f.bytes, 0);
  console.log(route, 'JS', (sum('js') / 1024).toFixed(2), 'kB;', 'CSS', (sum('css') / 1024).toFixed(2), 'kB;', 'fuentes', (files.filter((f) => /woff/.test(f.type)).reduce((a, f) => a + f.bytes, 0) / 1024).toFixed(2), 'kB;', files.length, 'archivos');
  console.log('  ', files.map((f) => `${f.file} ${(f.bytes / 1024).toFixed(1)}`).join(' | '));
  await ctx.close();
}
await browser.close();
