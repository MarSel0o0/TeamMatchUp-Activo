// Comprobaciones del tema inicial y del cambio de tema (spec 017, RF-5, RF-6, RF-7, RNF-8; T9 y T23). Uso:
//   PW=<playwright-core/index.mjs> node themecheck.mjs [url]          (por defecto http://localhost:5173)
// Con la construcción de producción: `vite preview` y su dirección. Imprime una línea por comprobación.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const BASE = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${detail ? ' — ' + detail : ''}`);
};

/** Solo el script en línea: se bloquea todo el código de la aplicación para ver qué fija antes de React. */
async function bootOnly({ stored, system, blocked = false }) {
  const ctx = await browser.newContext({ colorScheme: system });
  const page = await ctx.newPage();
  await page.route(/\.(m?js|tsx?|css)(\?.*)?$|\/@vite|\/@react-refresh|\/@id|\/node_modules/, (route) => route.abort());
  await page.addInitScript(
    ({ stored, blocked }) => {
      if (blocked) {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('bloqueado', 'SecurityError');
          },
        });
      } else if (stored !== null) {
        localStorage.setItem('tmu.theme', stored);
      }
    },
    { stored, blocked },
  );
  await page.goto(BASE + '/login');
  const marks = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    scheme: document.documentElement.getAttribute('data-mantine-color-scheme'),
  }));
  await ctx.close();
  return marks;
}

const bootCases = [
  { name: 'guardado «light» con sistema oscuro', stored: 'light', system: 'dark', expect: 'light' },
  { name: 'guardado «dark» con sistema claro', stored: 'dark', system: 'light', expect: 'dark' },
  { name: 'sin guardado con sistema claro', stored: null, system: 'light', expect: 'light' },
  { name: 'sin guardado con sistema oscuro', stored: null, system: 'dark', expect: 'dark' },
  { name: 'valor extraño con sistema claro', stored: 'banana', system: 'light', expect: 'light' },
  { name: 'valor extraño con sistema oscuro', stored: 'banana', system: 'dark', expect: 'dark' },
  { name: 'almacenamiento bloqueado con sistema claro', stored: null, blocked: true, system: 'light', expect: 'light' },
  { name: 'almacenamiento bloqueado con sistema oscuro', stored: null, blocked: true, system: 'dark', expect: 'dark' },
];
for (const c of bootCases) {
  const marks = await bootOnly(c);
  check(`antes de React: ${c.name}`, marks.theme === c.expect && marks.scheme === c.expect, `data-theme=${marks.theme}, data-mantine-color-scheme=${marks.scheme}`);
}

/** Aplicación completa: primera pintura, almacenamiento, pestañas y cambio de tema. */
async function fullApp({ stored, system }) {
  const ctx = await browser.newContext({ colorScheme: system });
  await ctx.addInitScript(
    ({ stored }) => {
      if (stored !== null && !localStorage.getItem('tmu.__init')) {
        localStorage.setItem('tmu.theme', stored);
        localStorage.setItem('tmu.__init', '1');
      }
    },
    { stored },
  );
  const page = await ctx.newPage();
  await page.goto(BASE + '/login');
  await page.waitForSelector('input[type=email]');
  return { ctx, page };
}

{
  // Primera pintura: el fondo calculado ya es el del tema, desde el primer fotograma de la aplicación.
  const { ctx, page } = await fullApp({ stored: 'light', system: 'dark' });
  const info = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    scheme: document.documentElement.getAttribute('data-mantine-color-scheme'),
    bg: getComputedStyle(document.body).backgroundColor,
    keys: Object.keys(localStorage).sort(),
  }));
  check('aplicación: guardado «light» con sistema oscuro pinta claro', info.theme === 'light' && info.scheme === 'light' && info.bg === 'rgb(236, 238, 241)', JSON.stringify(info));
  check('almacenamiento: ninguna entrada de la librería', !info.keys.some((k) => /mantine/i.test(k)), info.keys.join(', '));

  // Cambiar el tema del sistema no cambia la página.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(400);
  const afterSystem = await page.evaluate(() => document.documentElement.dataset.theme);
  check('cambiar el tema del sistema no cambia la página', afterSystem === 'light', `data-theme=${afterSystem}`);

  // Cambiar el valor guardado desde otra pestaña (evento storage) no cambia la página.
  const other = await ctx.newPage();
  await other.goto(BASE + '/login');
  await other.evaluate(() => localStorage.setItem('tmu.theme', 'dark'));
  await page.waitForTimeout(500);
  const afterStorage = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    scheme: document.documentElement.getAttribute('data-mantine-color-scheme'),
  }));
  check('cambiar el tema en otra pestaña no cambia esta', afterStorage.theme === 'light' && afterStorage.scheme === 'light', JSON.stringify(afterStorage));
  await other.close();
  await ctx.close();
}

{
  // Cambio de tema con el botón: marcas, almacenamiento, barra del navegador y origen del círculo.
  const { ctx, page } = await fullApp({ stored: 'dark', system: 'dark' });
  await page.getByRole('button', { name: 'Cambiar a tema claro' }).click();
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    scheme: document.documentElement.getAttribute('data-mantine-color-scheme'),
    stored: localStorage.getItem('tmu.theme'),
    meta: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    originX: document.documentElement.style.getPropertyValue('--theme-x'),
    keys: Object.keys(localStorage).filter((k) => /theme|mantine/i.test(k)).sort(),
  }));
  check('botón de tema: cambia las dos marcas y lo guarda', info.theme === 'light' && info.scheme === 'light' && info.stored === 'light', JSON.stringify(info));
  check('botón de tema: barra del navegador', info.meta === '#eceef1', info.meta);
  check('botón de tema: transición en círculo (origen fijado)', info.originX.endsWith('px'), info.originX);
  check('botón de tema: la única entrada de tema es tmu.theme', info.keys.join(',') === 'tmu.theme', info.keys.join(', '));
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} comprobación(es) fallida(s)` : '\nTodas las comprobaciones pasan');
process.exitCode = failures ? 1 : 0;
