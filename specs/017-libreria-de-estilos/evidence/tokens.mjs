// Cambiar a mano cada token de la lista de los criterios de finalización de la spec 017, en los dos temas y sin recargar, y
// comprobar que cambia lo que corresponde (RF-2; T23). Uso:
//   PW=<playwright-core/index.mjs> node tokens.mjs [url]
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const BASE = process.argv[2] ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

const COLOR = 'rgb(1, 2, 3)';
const SHADOW = '0 0 0 3px rgb(1, 2, 3)';

/** Cada prueba: vista, preparación opcional, qué se lee (selector, propiedad, pseudoelemento) y qué token se cambia. */
const TESTS = [
  { token: '--volt', name: 'botón primario', path: '/login', read: () => css('button[type=submit]', 'backgroundColor') },
  { token: '--volt', name: 'tinte del chip «Todos los juegos» pulsado', auth: true, path: '/agenda', read: () => css('.agenda__filters button[aria-pressed=true]', 'backgroundColor') },
  { token: '--volt', name: 'pista de los deslizadores (barra)', auth: true, path: '/coincidencias', read: () => css('.tmu-slider__bar', 'backgroundColor') },
  { token: '--volt', name: 'interruptor activado', auth: true, path: '/coincidencias', prepare: async (p) => { await p.locator('.tmu-switch__body').click(); }, read: () => css('.tmu-switch__track', 'backgroundColor') },
  { token: '--volt-edge', name: 'borde del chip «Todos los juegos» pulsado', auth: true, path: '/agenda', read: () => css('.agenda__filters button[aria-pressed=true]', 'borderTopColor') },
  { token: '--ink', name: 'texto de los botones', path: '/login', read: () => css('button.tmu-btn[data-variant=default]', 'color') },
  { token: '--ink', name: 'texto de los campos', path: '/login', read: () => css('input[type=email]', 'color') },
  { token: '--surface-sunk', name: 'fondo de los campos', path: '/login', read: () => css('input[type=email]', 'backgroundColor') },
  { token: '--line', name: 'borde de los campos', path: '/login', read: () => css('input[type=email]', 'borderTopColor') },
  { token: '--line-strong', name: 'borde de los botones', path: '/login', read: () => css('button.tmu-btn[data-variant=default]', 'borderTopColor') },
  { token: '--placeholder', name: 'marcador de posición', path: '/login', read: () => css('input[type=email]', 'color', '::placeholder') },
  { token: '--danger', name: 'error de un campo', path: '/registro', prepare: async (p) => { await p.click('button[type=submit]'); }, read: () => css('.tmu-field__error', 'color') },
  { token: '--danger', name: 'botón de peligro', auth: true, path: '/configuracion', read: () => css('.account__actions button.tmu-btn[data-variant=danger]', 'color') },
  { token: '--danger-edge', name: 'borde del aviso de error', path: '/login', prepare: async (p) => { await p.fill('input[type=email]', 'demo@teammatchup.gg'); await p.fill('input[type=password]', 'mala'); await p.click('button[type=submit]'); await p.waitForTimeout(700); }, read: () => css('.tmu-notice[data-variant=error]', 'borderTopColor') },
  { token: '--warn-edge', name: 'borde del sello de advertencia', auth: true, path: '/perfil', read: () => css('.tmu-stamp[data-variant=warn]', 'borderTopColor') },
  { token: '--ok-edge', name: 'borde del sello correcto', auth: true, path: '/configuracion', prepare: async (p) => { await p.getByRole('button', { name: 'Guardar ficha' }).click(); await p.waitForTimeout(900); }, read: () => css('.tmu-stamp[data-variant=ok]', 'borderTopColor') },
  { token: '--btn-pen-shadow', name: 'sombra del botón primario', path: '/login', read: () => css('button[type=submit]', 'boxShadow'), value: SHADOW },
  { token: '--btn-orb-bg', name: 'círculo del botón grande', path: '/', read: () => css('.tmu-btn__orb', 'backgroundColor') },
  { token: '--game-ink-r6', name: 'punto de la pestaña de R6 (sin elegir)', auth: true, path: '/perfil', read: () => css('.tmu-tabs__tab:nth-child(2) .tmu-tabs__dot', 'backgroundColor') },
  { token: '--game-ink-lol', name: 'píldora de la pestaña de LoL (elegida)', auth: true, path: '/perfil', read: () => css('.tmu-tabs__pill', 'backgroundColor') },
  { token: '--game-ink-r6', name: 'borde del chip de R6 pulsado', auth: true, path: '/agenda', prepare: async (p) => { await p.getByRole('button', { name: 'Rainbow Six Siege' }).click(); await p.waitForTimeout(500); }, read: () => css('.agenda__filters button[aria-pressed=true]', 'borderTopColor') },
  { token: '--tab-ink', name: 'texto de la pestaña elegida', auth: true, path: '/perfil', read: () => css('.tmu-tabs__tab[aria-selected=true]', 'color') },
  { token: '--tab-pill-shadow', name: 'sombra de la píldora', auth: true, path: '/perfil', read: () => css('.tmu-tabs__pill', 'boxShadow'), value: SHADOW },
  { token: '--focus-ring', name: 'contorno del indicador de foco (tema claro)', theme: 'light', auth: true, path: '/perfil', prepare: async (p) => { await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(500); }, read: () => css(':focus-visible', 'outlineColor') },
  { token: '--focus-edge', name: 'borde del campo con foco', auth: true, path: '/coincidencias', prepare: async (p) => { await p.locator('input[type=search]').focus(); await p.waitForTimeout(500); }, read: () => css('input[type=search]', 'borderTopColor') },
];

// Función que se ejecuta en la página (se serializa).
const css = (selector, prop, pseudo) => ({ selector, prop, pseudo });

let failures = 0;
for (const theme of ['dark', 'light']) {
  for (const t of TESTS) {
    if (t.theme && t.theme !== theme) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: theme });
    await ctx.addInitScript((th) => { try { localStorage.setItem('tmu.theme', th); } catch {} }, theme);
    const page = await ctx.newPage();
    try {
      if (t.auth) {
        await page.goto(BASE + '/login');
        await page.fill('input[type=email]', 'demo@teammatchup.gg');
        await page.fill('input[type=password]', 'demo1234');
        await page.click('button[type=submit]');
        await page.waitForURL((u) => !u.pathname.startsWith('/login'));
      }
      await page.goto(BASE + t.path);
      await page.waitForTimeout(1300);
      if (t.prepare) await t.prepare(page);
      const probe = t.read();
      const read = () => page.evaluate(({ selector, prop, pseudo }) => {
        const el = selector === ':focus-visible' ? document.querySelector(':focus-visible') : document.querySelector(selector);
        if (!el) return 'SIN ELEMENTO';
        return getComputedStyle(el, pseudo || null)[prop];
      }, probe);
      const before = await read();
      const url = page.url();
      await page.evaluate(({ token, value }) => document.documentElement.style.setProperty(token, value), { token: t.token, value: t.value ?? COLOR });
      await page.waitForTimeout(550);
      const after = await read();
      const reloaded = page.url() !== url;
      const changed = after.includes('1, 2, 3') || after.includes('0.00392157');
      const ok = before !== 'SIN ELEMENTO' && after !== before && changed && !reloaded;
      if (!ok) failures++;
      console.log(`${ok ? 'OK   ' : 'FALLA'} ${theme.padEnd(5)} ${t.token.padEnd(18)} ${t.name} — ${String(before).slice(0, 50)} → ${String(after).slice(0, 60)}`);
    } catch (error) {
      failures++;
      console.log(`FALLA ${theme.padEnd(5)} ${t.token.padEnd(18)} ${t.name} — ${String(error).split('\n')[0].slice(0, 120)}`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(failures ? `\n${failures} prueba(s) fallida(s)` : '\nCada token cambia lo que corresponde, en los dos temas');
process.exitCode = failures ? 1 : 0;
