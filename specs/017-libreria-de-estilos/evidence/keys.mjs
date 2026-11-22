// Línea base de teclado, accesibilidad, contrastes y carga de la spec 017 (T2 y T23). Uso:
//   PW=<ruta a playwright-core/index.mjs> node keys.mjs <carpeta de salida> [urlRapida]
// Escribe `keys.json` (orden de tabulación, teclas de los deslizadores, color de los indicadores,
// contrastes) y `a11y/<vista>.yml` (árbol de accesibilidad). Necesita la interfaz en modo simulado.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const OUT = path.resolve(process.argv[2] ?? 'out');
const FAST = process.argv[3] ?? 'http://localhost:5173';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(path.join(OUT, 'a11y'), { recursive: true });

const settle = (page, ms = 700) => page.waitForTimeout(ms);

async function login(page) {
  await page.goto(FAST + '/login');
  await page.fill('input[type=email]', 'demo@teammatchup.gg');
  await page.fill('input[type=password]', 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 8000 });
}

const VIEWS = [
  { name: 'landing', auth: false, path: '/' },
  { name: 'login', auth: false, path: '/login' },
  { name: 'registro', auth: false, path: '/registro' },
  { name: 'inicio', auth: true, path: '/inicio' },
  { name: 'perfil', auth: true, path: '/perfil' },
  { name: 'configuracion', auth: true, path: '/configuracion' },
  { name: 'coincidencias', auth: true, path: '/coincidencias' },
  { name: 'agenda', auth: true, path: '/agenda' },
  { name: 'detalle', auth: true, path: '/agenda/session-1' },
  { name: 'ficha', auth: true, path: async (p) => (await firstHref(p, '/coincidencias', 'a[href^="/jugadores/"]')) ?? '/coincidencias' },
  { name: 'riot', auth: true, path: '/verificar/riot' },
  { name: 'steam', auth: false, path: '/verificar/steam' },
  { name: 'no-encontrada', auth: false, path: '/no-existe' },
];

async function firstHref(page, from, selector) {
  await page.goto(FAST + from);
  await settle(page, 900);
  return page.locator(selector).first().getAttribute('href');
}

const DESCRIBE = `() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
  const name = norm(el.getAttribute('aria-label') || (el.labels && el.labels[0] ? el.labels[0].textContent : '') || el.textContent || el.getAttribute('placeholder') || '');
  return (el.getAttribute('role') || el.tagName.toLowerCase() + (el.type ? '[' + el.type + ']' : '')) + ': ' + name;
}`;

const CONTRAST = `() => {
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const over = (top, bottom) => { const a = top.a + bottom.a * (1 - top.a); return { r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a, g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a, b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a, a }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = (el) => { const chain = []; for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) chain.push(c); if (c && c.a === 1) break; } let acc = chain.pop() || { r: 255, g: 255, b: 255, a: 1 }; while (chain.length) acc = over(chain.pop(), acc); return acc; };
  const out = [];
  const sel = 'button, a, input:not([type=hidden]), select, textarea, .notice, .stamp, .chip, [role=tab], label.check';
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden') continue;
    const bg = bgOf(el); const fg = parse(cs.color); if (!fg) continue;
    const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').replace(/\\s+/g, ' ').trim().slice(0, 30);
    const own = over(fg, bg);
    const item = { el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''), name: text, text: Math.round(ratio(own, bg) * 100) / 100 };
    const bc = parse(cs.borderTopColor);
    if (bc && bc.a > 0 && parseFloat(cs.borderTopWidth) > 0) item.border = Math.round(ratio(over(bc, bg), bg) * 100) / 100;
    out.push(item);
  }
  return out;
}`;

const browser = await chromium.launch({ executablePath: CHROME });
const result = { browser: `Chrome ${browser.version()}`, date: new Date().toISOString(), tabOrder: {}, sliders: {}, spinner: {}, contrast: {} };

// 1) Orden de tabulación y árbol de accesibilidad (tema oscuro; 1280 y 375).
for (const vp of [1280, 375]) {
  for (const view of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width: vp, height: 800 }, colorScheme: 'dark', locale: 'es-ES' });
    await ctx.addInitScript(() => { try { localStorage.setItem('tmu.theme', 'dark'); } catch {} });
    const page = await ctx.newPage();
    try {
      if (view.auth) await login(page);
      const target = typeof view.path === 'function' ? await view.path(page) : view.path;
      await page.goto(FAST + target);
      await page.waitForLoadState('networkidle').catch(() => {});
      await settle(page, 900);
      const seq = [];
      for (let i = 0; i < 90; i++) {
        await page.keyboard.press('Tab');
        const d = await page.evaluate(`(${DESCRIBE})()`);
        if (d === null) break;
        if (seq.length && seq[0] === d && i > 2) break;
        seq.push(d);
      }
      result.tabOrder[`${view.name}__${vp}`] = seq;
      if (vp === 1280) {
        const snap = await page.locator('body').ariaSnapshot();
        fs.writeFileSync(path.join(OUT, 'a11y', `${view.name}.yml`), snap);
      }
      if (vp === 1280) {
        for (const theme of ['dark', 'light']) {
          await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
          await settle(page, 150);
          result.contrast[`${view.name}__${theme}`] = await page.evaluate(`(${CONTRAST})()`);
        }
      }
      console.log('ok  ', view.name, vp, result.tabOrder[`${view.name}__${vp}`].length, 'paradas');
    } catch (err) {
      result.tabOrder[`${view.name}__${vp}`] = `FALLA: ${String(err).slice(0, 160)}`;
      console.log('FALLA', view.name, vp, String(err).split('\n')[0].slice(0, 120));
    }
    await ctx.close();
  }
}

// 2) Teclas de los deslizadores y del interruptor en coincidencias.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'es-ES' });
  const page = await ctx.newPage();
  await login(page);
  await page.goto(FAST + '/coincidencias');
  await page.waitForLoadState('networkidle').catch(() => {});
  await settle(page, 900);
  const sliders = [
    { name: /Diferencia máxima de rango/, start: 25 },
    { name: /Horas en común/, start: 4 },
  ];
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
  for (const s of sliders) {
    const slider = page.getByRole('slider', { name: s.name });
    const rows = {};
    // El valor de partida se fija con el teclado (Inicio y flechas): vale para el control nativo de la línea base y para la miniatura de la librería.
    const read = () => slider.evaluate((el) => el.getAttribute('aria-valuenow') ?? el.value);
    const setTo = async (v, step, min) => { await slider.focus(); await page.keyboard.press('Home'); for (let i = 0; i < (v - min) / step; i++) await page.keyboard.press('ArrowRight'); };
    const attrs = await slider.evaluate((el) => ({ min: el.getAttribute('aria-valuemin') ?? el.min, max: el.getAttribute('aria-valuemax') ?? el.max, step: el.step || '' }));
    const step = Number(s.name.toString().includes('rango') ? 5 : 1);
    for (const key of keys) {
      await setTo(s.start, step, Number(attrs.min));
      await page.keyboard.press(key);
      rows[key] = await read();
    }
    result.sliders[String(s.name)] = { start: s.start, ...attrs, keys: rows };
  }
  const check = page.getByLabel('Solo cuentas verificadas');
  await check.focus();
  const before = await check.isChecked();
  await page.keyboard.press('Space');
  result.sliders['Solo cuentas verificadas'] = { before, afterSpace: await check.isChecked(), role: await check.getAttribute('role') };
  await ctx.close();
}

// 3) Color calculado de los indicadores «Leyendo…»/«Cargando…» y «Actualizando» (ambos usan `--pen`).
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: theme });
  await ctx.addInitScript((t) => { try { localStorage.setItem('tmu.theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.goto(FAST + '/login');
  await settle(page, 500);
  result.spinner[theme] = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.className = 'btn__spin';
    probe.style.color = 'var(--pen)';
    document.body.append(probe);
    const cs = getComputedStyle(probe);
    const out = { color: cs.color, borderTopColor: cs.borderTopColor, borderRightColor: cs.borderRightColor, width: cs.width, height: cs.height, borderWidth: cs.borderTopWidth, animation: cs.animationName + ' ' + cs.animationDuration };
    probe.remove();
    return out;
  });
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'keys.json'), JSON.stringify(result, null, 1));
console.log('guardado', path.join(OUT, 'keys.json'));
