// Captura y medidas de la spec 017 (T1, T2 y T23). Uso:
//   PW=<ruta a playwright-core/index.mjs> node capture.mjs <carpeta de salida> [urlRapida] [urlLenta]
// Necesita la interfaz en modo simulado (VITE_USE_MOCK_API=true) en `urlRapida` (por defecto
// http://localhost:5173) y, para los estados «Enviando…», otra con VITE_MOCK_LATENCY=4000 en `urlLenta`.
// No es parte de la aplicación: es evidencia reproducible. Escribe `measures.json` y las capturas.
import fs from 'node:fs';
import path from 'node:path';

import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const OUT = path.resolve(process.argv[2] ?? 'out');
const FAST = process.argv[3] ?? 'http://localhost:5173';
const SLOW = process.argv[4] ?? 'http://localhost:5174';
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

// Filtros para ejecuciones parciales: VP=1280,375  THEME=dark  ONLY=^login  SHOTS=0 (sin capturas).
const VP_FILTER = process.env.VP ? process.env.VP.split(',') : null;
const VIEWPORTS = [
  { name: '1280', width: 1280, height: 800, shots: true },
  { name: '375', width: 375, height: 800, shots: true },
  { name: '360', width: 360, height: 800, shots: false },
].filter((vp) => !VP_FILTER || VP_FILTER.includes(vp.name));
const THEMES = (process.env.THEME ? process.env.THEME.split(',') : ['dark', 'light']);
const SHOTS = process.env.SHOTS !== '0';
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null;

// ───────────────────────── medición dentro de la página ─────────────────────────
// Los selectores de cada tipo aceptan los de hoy y los de la interfaz migrada (se amplían en cada tarea).
const SELECTORS = {
  button: 'button:not([role=tab]):not([aria-pressed]):not([role=switch])',
  chip: 'button[aria-pressed]',
  tab: '[role=tab]',
  linkButton: 'a',
  text: 'input:not([type=range]):not([type=checkbox]):not([type=hidden]):not([type=radio])',
  textarea: 'textarea',
  select: 'select',
  range: 'input[type=range], .tmu-slider',
  check: 'input[type=checkbox]:not([role=switch]), .tmu-switch__track',
  notice: '.notice, .tmu-notice',
  stamp: '.stamp, .tmu-stamp',
  skeleton: '.skeleton, .tmu-skeleton',
  slip: '[role=dialog]',
};

const MEASURE = `(selectors) => {
  const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim().slice(0, 48);
  // Líneas de texto: solo los nodos de texto (los iconos no cuentan); una línea por cada «alto de línea».
  const lines = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const rects = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push(r);
    }
    rects.sort((x, y) => x.top - y.top);
    let count = 0;
    let bottom = -Infinity;
    for (const r of rects) {
      if (r.top >= bottom - 1) { count++; bottom = r.bottom; } else bottom = Math.max(bottom, r.bottom);
    }
    return count;
  };
  const nameOf = (el) =>
    el.getAttribute('role') === 'dialog' && el.getAttribute('aria-labelledby') ? norm(document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) :
    el.classList.contains('tmu-slider') ? norm(el.closest('.field')?.querySelector('.label')?.textContent) :
    el.classList.contains('tmu-switch__track') ? norm(el.closest('.tmu-switch')?.textContent) :
    norm(el.getAttribute('aria-label') || (el.labels && el.labels[0] ? el.labels[0].textContent : '') ||
      el.getAttribute('title') || el.textContent || el.getAttribute('placeholder') || el.getAttribute('name') || '');
  const out = [];
  const seen = new Map();
  for (const [kind, selector] of Object.entries(selectors)) {
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (kind === 'linkButton' && !(parseFloat(cs.borderTopLeftRadius) >= 100 || cs.borderRadius.includes('999'))) continue;
      const base = kind + '|' + nameOf(el);
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      out.push({
        key: base + '|' + n,
        kind,
        disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
        bg: cs.backgroundColor,
        color: cs.color,
        borderColor: cs.borderTopColor,
        borderWidth: cs.borderTopWidth,
        radius: cs.borderTopLeftRadius,
        fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, ''),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        lines: ['input', 'select', 'textarea'].includes(el.tagName.toLowerCase()) ? 0 : lines(el),
      });
    }
  }
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    theme: document.documentElement.dataset.theme,
    items: out,
  };
}`;

// ───────────────────────── escenarios ─────────────────────────
async function login(page, base) {
  await page.goto(base + '/login');
  await page.fill('input[type=email]', 'demo@teammatchup.gg');
  await page.fill('input[type=password]', 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 8000 });
  await settle(page, 500);
  // Una sesión propia, la misma en todas las vistas con sesión: el anfitrión ve «Editar» y «Cancelar».
  await page.evaluate(() => {
    const key = 'tmu.mock-db.v4';
    const db = JSON.parse(localStorage.getItem(key));
    const host = { id: 'user-1', username: 'demo', displayName: 'Jugador Demo', avatarColor: '#4f86e8' };
    if (!db.sessions.some((s) => s.id === 'session-99')) {
      db.sessions.push({ id: 'session-99', gameId: 'lol', hostId: 'user-1', host, title: 'Duos de práctica', notes: 'Traer micrófono.', day: 2, startHour: 20, durationHours: 2, slots: 5, participants: [host], status: 'open', createdAt: '2026-11-21T12:00:00.000Z' });
    }
    localStorage.setItem(key, JSON.stringify(db));
  });
}
const settle = (page, ms = 700) => page.waitForTimeout(ms);
const clickText = (page, text, role = 'button') => page.getByRole(role, { name: text }).first().click();

/** @type {{name: string, auth: boolean, slow?: boolean, path: string | ((page:any)=>Promise<string>), steps?: (page:any)=>Promise<void>}[]} */
const SCENARIOS = [
  { name: 'landing', auth: false, path: '/' },
  { name: 'login', auth: false, path: '/login' },
  {
    name: 'login-error',
    auth: false,
    path: '/login',
    steps: async (p) => {
      await p.fill('input[type=email]', 'demo@teammatchup.gg');
      await p.fill('input[type=password]', 'mala-clave');
      await p.click('button[type=submit]');
      await settle(p, 900);
    },
  },
  {
    name: 'login-enviando',
    auth: false,
    slow: true,
    path: '/login',
    steps: async (p) => {
      await p.fill('input[type=email]', 'demo@teammatchup.gg');
      await p.fill('input[type=password]', 'demo1234');
      await p.click('button[type=submit]');
      await settle(p, 500);
    },
  },
  { name: 'registro', auth: false, path: '/registro' },
  {
    name: 'registro-error',
    auth: false,
    path: '/registro',
    steps: async (p) => {
      await p.click('button[type=submit]');
      await settle(p, 600);
    },
  },
  { name: 'inicio', auth: true, path: '/inicio' },
  { name: 'perfil', auth: true, path: '/perfil' },
  {
    name: 'perfil-valorant',
    auth: true,
    path: '/perfil',
    steps: async (p) => {
      const tabs = p.getByRole('tab');
      if ((await tabs.count()) > 1) await tabs.nth(1).click();
      await settle(p);
    },
  },
  {
    name: 'perfil-editar',
    auth: true,
    path: '/perfil',
    steps: async (p) => {
      await p.getByText('Editar ficha').first().click();
      await settle(p, 3000); // las celdas de la hoja de horas entran con una animación escalonada
    },
  },
  { name: 'configuracion', auth: true, path: '/configuracion' },
  { name: 'coincidencias', auth: true, path: '/coincidencias' },
  {
    name: 'coincidencias-filtros',
    auth: true,
    path: '/coincidencias',
    steps: async (p) => {
      await p.fill('input[type=search]', 'zzzzqq');
      await settle(p, 900);
    },
  },
  { name: 'agenda', auth: true, path: '/agenda' },
  {
    name: 'agenda-anotar',
    auth: true,
    path: '/agenda',
    steps: async (p) => {
      await clickText(p, /^Anotar sesión/);
      await settle(p);
    },
  },
  {
    name: 'agenda-anotar-error',
    auth: true,
    path: '/agenda',
    steps: async (p) => {
      await clickText(p, /^Anotar sesión/);
      await settle(p, 500);
      await p.getByRole('dialog').getByRole('button', { name: /^Anotar sesión/ }).click();
      await settle(p, 600);
    },
  },
  {
    name: 'agenda-cancelar',
    auth: true,
    path: '/agenda',
    steps: async (p) => {
      const cancel = p.getByRole('button', { name: /^Cancelar sesión/ }).first();
      if (await cancel.count()) {
        await cancel.click();
        await settle(p);
      }
    },
  },
  { name: 'detalle', auth: true, path: '/agenda/session-1' },
  { name: 'detalle-propia', auth: true, path: '/agenda/session-99' },
  {
    name: 'detalle-editar',
    auth: true,
    path: '/agenda/session-99',
    steps: async (p) => {
      await clickText(p, /Editar sesión/);
      await settle(p);
    },
  },
  {
    name: 'detalle-cancelar',
    auth: true,
    path: '/agenda/session-99',
    steps: async (p) => {
      await clickText(p, /^Cancelar sesión/);
      await settle(p);
    },
  },
  {
    name: 'ficha',
    auth: true,
    path: async (p) => {
      await p.goto(p.__base + '/coincidencias');
      await settle(p, 900);
      const href = await p.locator('a[href^="/jugadores/"]').first().getAttribute('href');
      return href ?? '/coincidencias';
    },
  },
  { name: 'riot', auth: true, path: '/verificar/riot' },
  { name: 'steam', auth: false, path: '/verificar/steam' },
  { name: 'no-encontrada', auth: false, path: '/no-existe' },
];

// ───────────────────────── ejecución ─────────────────────────
const browser = await chromium.launch({ executablePath: CHROME });
const version = browser.version();
const results = { browser: `Chrome ${version}`, date: new Date().toISOString(), views: {} };

for (const sc of SCENARIOS) {
  if (ONLY && !ONLY.test(sc.name)) continue;
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const base = sc.slow ? SLOW : FAST;
      const id = `${sc.name}__${vp.name}__${theme}`;
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
        reducedMotion: 'no-preference',
        locale: 'es-ES',
      });
      await ctx.addInitScript((t) => {
        try {
          if (!localStorage.getItem('tmu.__init')) {
            localStorage.setItem('tmu.theme', t);
            localStorage.setItem('tmu.__init', '1');
          }
        } catch {}
      }, theme);
      const page = await ctx.newPage();
      page.__base = base;
      page.on('dialog', (d) => d.dismiss().catch(() => {}));
      try {
        if (sc.auth) await login(page, base);
        const target = typeof sc.path === 'function' ? await sc.path(page) : sc.path;
        await page.goto(base + target);
        await page.waitForLoadState('networkidle').catch(() => {});
        await settle(page, 800);
        if (sc.steps) await sc.steps(page);
        const m = await page.evaluate(`(${MEASURE})(${JSON.stringify(SELECTORS)})`);
        results.views[id] = { scenario: sc.name, viewport: vp.name, theme, path: target, ...m };
        if (vp.shots && SHOTS) await page.screenshot({ path: path.join(OUT, 'shots', id + '.jpg'), type: 'jpeg', quality: 72, fullPage: true });
        console.log('ok  ', id, m.items.length, 'elementos');
      } catch (err) {
        results.views[id] = { scenario: sc.name, viewport: vp.name, theme, error: String(err).slice(0, 200) };
        console.log('FALLA', id, String(err).split('\n')[0].slice(0, 140));
      }
      await ctx.close();
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'measures.json'), JSON.stringify(results, null, 1));
console.log('guardado', path.join(OUT, 'measures.json'));
