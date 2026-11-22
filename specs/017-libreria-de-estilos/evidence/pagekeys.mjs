// Re Pág y Av Pág de los deslizadores desde varios valores de partida (T2, regla de `pageStepValue`).
//   PW=<playwright-core/index.mjs> node pagekeys.mjs [urlRapida]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const FAST = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
await page.goto(FAST + '/login');
await page.fill('input[type=email]', 'demo@teammatchup.gg');
await page.fill('input[type=password]', 'demo1234');
await page.click('button[type=submit]');
await page.waitForURL((u) => !u.pathname.startsWith('/login'));
await page.goto(FAST + '/coincidencias');
await page.waitForTimeout(1200);
const plan = [
  { name: /Diferencia máxima de rango/, starts: [0, 5, 20, 25, 45, 50] },
  { name: /Horas en común/, starts: [0, 1, 4, 6, 11, 12] },
];
const out = {};
for (const { name, starts } of plan) {
  const slider = page.getByRole('slider', { name });
  const rows = [];
  for (const start of starts) {
    const res = { start };
    for (const key of ['PageUp', 'PageDown']) {
      await slider.fill(String(start));
      await slider.focus();
      await page.keyboard.press(key);
      res[key] = Number(await slider.evaluate((el) => el.value));
    }
    rows.push(res);
  }
  out[String(name)] = rows;
}
await browser.close();
console.log(JSON.stringify(out));
