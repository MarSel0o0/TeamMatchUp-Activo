// Color calculado de los indicadores de carga en su contenedor real (RF-17, T2 y T23).
//   PW=<playwright-core/index.mjs> node spinners.mjs [urlRapida]
// Los indicadores piden `color: var(--pen)`, un token que no existe: el valor no es válido al calcular y
// el color se hereda del contenedor. Se prueba un `span` con ese mismo estilo dentro de cada contenedor.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const FAST = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const out = {};
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: theme });
  await ctx.addInitScript((t) => { try { localStorage.setItem('tmu.theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.goto(FAST + '/login');
  await page.fill('input[type=email]', 'demo@teammatchup.gg');
  await page.fill('input[type=password]', 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  const probe = (selectorJs) => page.evaluate((sel) => {
    const host = new Function(`return ${sel}`)();
    if (!host) return 'sin contenedor';
    const s = document.createElement('span');
    s.className = 'btn__spin';
    s.style.color = 'var(--pen)';
    host.append(s);
    const cs = getComputedStyle(s);
    const r = { color: cs.color, borderRightColor: cs.borderRightColor, hostClass: host.className, hostColor: getComputedStyle(host).color };
    s.remove();
    return r;
  }, selectorJs);
  await page.goto(FAST + '/coincidencias');
  await page.waitForTimeout(1200);
  out[theme] = { actualizandoCoincidencias: await probe("document.querySelector('.page-head')") };
  await page.goto(FAST + '/agenda');
  await page.waitForTimeout(1200);
  out[theme].actualizandoAgenda = await probe("[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Todos los juegos')).parentElement");
  await page.goto(FAST + '/login');
  await page.waitForTimeout(500);
  out[theme].leyendo = await probe("(() => { const d = document.createElement('div'); d.className = 'blank'; document.body.append(d); return d; })()");
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
