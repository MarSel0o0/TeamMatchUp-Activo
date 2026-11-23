// Indicador de foco de cada parada del recorrido con Tab, por vista, tema y ancho (spec 017, RF-4, RF-20; T22 y T23). Uso:
//   PW=<playwright-core/index.mjs> node focuscheck.mjs [url]
// Esperado: oscuro = volt de siempre (rgb(205, 242, 75)); claro = #4a6800 (rgb(74, 104, 0)); 2 px sólido; separación de 3 px (4 px en
// las celdas del inicio; –2 px en el panel de las pestañas; los campos no llevan contorno: borde y halo). Imprime las excepciones.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const FAST = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const VIEWS = ['/', '/login', '/registro', '/inicio', '/perfil', '/configuracion', '/coincidencias', '/agenda', '/agenda/session-1', '/verificar/riot', '/no-existe', 'ficha'];
const EXPECT = { dark: 'rgb(205, 242, 75)', light: 'rgb(74, 104, 0)' };
let problems = 0;
let total = 0;
for (const theme of ['dark', 'light']) {
  for (const width of [1280, 375]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
    await ctx.addInitScript((t) => localStorage.setItem('tmu.theme', t), theme);
    const page = await ctx.newPage();
    await page.goto(FAST + '/login');
    await page.fill('input[type=email]', 'demo@teammatchup.gg');
    await page.fill('input[type=password]', 'demo1234');
    await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    const seen = new Map();
    for (let view of VIEWS) {
      if (view === 'ficha') {
        await page.goto(FAST + '/coincidencias');
        await page.waitForTimeout(1200);
        view = (await page.locator('a[href^="/jugadores/"]').first().getAttribute('href')) ?? '/coincidencias';
      }
      await page.goto(FAST + view);
      await page.waitForTimeout(1200);
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab');
        const info = await page.evaluate(() => {
          const e = document.activeElement;
          if (!e || e === document.body) return null;
          const cs = getComputedStyle(e);
          const name = (e.getAttribute('aria-label') || e.textContent || e.placeholder || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 28);
          return { name, cls: (typeof e.className === 'string' ? e.className : '').split(' ')[0], tag: e.tagName.toLowerCase(), role: e.getAttribute('role') || '', width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, offset: cs.outlineOffset, shadow: cs.boxShadow !== 'none' ? 'sombra' : '' };
        });
        if (!info) break;
        total++;
        const isField = /^(input|select|textarea)$/.test(info.tag) && info.style === 'none';
        const bad = !isField && (info.color !== EXPECT[theme] || info.width !== '2px' || info.style !== 'solid');
        if (bad) { problems++; const key = `${theme} ${width} ${view} ${info.tag}.${info.cls} «${info.name}»: ${info.width} ${info.style} ${info.color} +${info.offset}`; if (!seen.has(key)) { seen.set(key, 1); console.log('EXCEPCIÓN', key); } }
      }
    }
    await ctx.close();
  }
}
console.log(`\n${total} paradas con Tab revisadas; ${problems} con un indicador distinto del esperado`);
await browser.close();
process.exitCode = problems ? 1 : 0;
