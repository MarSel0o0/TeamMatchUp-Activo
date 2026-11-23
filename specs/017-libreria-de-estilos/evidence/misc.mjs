// Comprobaciones sueltas de T23: ventanas abiertas tras cambiar de tema (RF-6), texto al 200 % y movimiento reducido (RNF-5).
//   PW=<playwright-core/index.mjs> node misc.mjs [url]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const BASE = process.argv[2] ?? 'http://localhost:5173';
const SECTIONS = (process.env.SECTIONS ?? 'tema,texto,movimiento').split(',');
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
async function session(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width ?? 1280, height: 900 }, colorScheme: opts.scheme ?? 'dark', reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript((t) => { try { localStorage.setItem('tmu.theme', t); } catch {} }, opts.scheme ?? 'dark');
  const page = await ctx.newPage();
  await page.goto(BASE + '/login');
  await page.fill('input[type=email]', 'demo@teammatchup.gg');
  await page.fill('input[type=password]', 'demo1234');
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.evaluate(() => { const k = 'tmu.mock-db.v4'; const db = JSON.parse(localStorage.getItem(k)); const host = { id: 'user-1', username: 'demo', displayName: 'Jugador Demo', avatarColor: '#4f86e8' }; if (!db.sessions.some((s) => s.id === 'session-99')) db.sessions.push({ id: 'session-99', gameId: 'lol', hostId: 'user-1', host, title: 'Duos de práctica', notes: 'Traer micrófono.', day: 2, startHour: 20, durationHours: 2, slots: 5, participants: [host], status: 'open', createdAt: '2026-11-21T12:00:00.000Z' }); localStorage.setItem(k, JSON.stringify(db)); });
  return { ctx, page };
}
const surface = (page) => page.evaluate(() => {
  const d = document.querySelector('[role=dialog]');
  const css = getComputedStyle(document.documentElement);
  const overlay = document.querySelector('.tmu-modal__overlay');
  return { theme: document.documentElement.dataset.theme, dialogBg: getComputedStyle(d).backgroundColor, tokenSurface: css.getPropertyValue('--surface').trim(), overlayBg: overlay ? getComputedStyle(overlay).backgroundColor : null, tokenScrim: css.getPropertyValue('--scrim').trim() };
});

console.log('RF-6: cada ventana abierta después de cambiar el tema sale entera en el tema nuevo');
if (SECTIONS.includes('tema')) for (const [name, path, open] of [
  ['Anotar una sesión', '/agenda', async (p) => { await p.getByRole('button', { name: /^Anotar sesión/ }).first().click(); }],
  ['¿Cancelar esta sesión?', '/agenda', async (p) => { await p.getByRole('button', { name: /^Cancelar sesión/ }).first().click(); }],
  ['¿Desvincular …?', '/configuracion', async (p) => { await p.getByRole('button', { name: 'Desvincular', exact: true }).first().click(); }],
]) {
  const { ctx, page } = await session({ scheme: 'dark' });
  await page.goto(BASE + path);
  await page.waitForTimeout(1300);
  await page.getByRole('button', { name: /Cambiar a tema claro/ }).click();
  await page.waitForTimeout(1000);
  await open(page);
  await page.waitForTimeout(800);
  const s = await surface(page);
  const rgb = (hex) => hex; // los tokens se comparan por su valor resuelto en la página
  console.log(`  ${name}: tema ${s.theme}; fondo de la ventana ${s.dialogBg} (--surface ${s.tokenSurface}); velo ${s.overlayBg} (--scrim ${s.tokenScrim})`);
  await ctx.close();
}

console.log('\nTexto al 200 %: elementos que se salen del ancho de la ventana');
for (const width of [1280, 375]) {
  for (const [path, label] of [['/inicio', 'inicio'], ['/perfil', 'perfil'], ['/configuracion', 'configuración'], ['/coincidencias', 'coincidencias'], ['/agenda', 'agenda'], ['/agenda/session-99', 'detalle'], ['/login', 'acceso']]) {
    const { ctx, page } = await session({ width });
    await page.goto(BASE + path);
    await page.waitForTimeout(1200);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const off = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > w + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.week, .hours, .tmu-tabs__list, svg'); }).slice(0, 4).map((e) => (e.className && typeof e.className === 'string' ? e.className.split(' ')[0] : e.tagName.toLowerCase()));
      return { scroll: document.documentElement.scrollWidth, w, off };
    });
    console.log(`  ${String(width).padEnd(4)} ${label.padEnd(14)} desplazable ${info.scroll} de ${info.w}${info.off.length ? ' | fuera: ' + info.off.join(', ') : ''}`);
    await ctx.close();
  }
}

console.log('\nMovimiento reducido: animaciones del sello y de la píldora');
{
  const { ctx, page } = await session({ reduced: true });
  await page.goto(BASE + '/agenda');
  await page.waitForTimeout(1200);
  console.log('  sello:', await page.evaluate(() => { const e = document.querySelector('.tmu-stamp'); const cs = getComputedStyle(e); return `animation ${cs.animationName} ${cs.animationDuration}`; }));
  await page.goto(BASE + '/perfil');
  await page.waitForTimeout(1200);
  const before = await page.locator('.tmu-tabs__pill').evaluate((e) => e.getBoundingClientRect().left);
  await page.getByRole('tab', { name: 'Counter-Strike 2' }).click();
  await page.waitForTimeout(30);
  const early = await page.locator('.tmu-tabs__pill').evaluate((e) => e.getBoundingClientRect().left);
  await page.waitForTimeout(800);
  const after = await page.locator('.tmu-tabs__pill').evaluate((e) => e.getBoundingClientRect().left);
  console.log(`  píldora: antes ${before.toFixed(0)} px; a los 30 ms ${early.toFixed(0)} px; al final ${after.toFixed(0)} px ${Math.abs(early - after) < 2 ? '(sin deslizamiento)' : '(con deslizamiento)'}`);
  await ctx.close();
}
await browser.close();
