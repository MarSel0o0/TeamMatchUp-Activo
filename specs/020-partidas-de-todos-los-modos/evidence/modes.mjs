// Validación en navegador de las pestañas de partidas por modo (spec 020, T11). Uso:
//   PW=<playwright-core/index.mjs> node modes.mjs [url-del-frontend]
// Necesita el servidor real (con una base de datos desechable) y el frontend de desarrollo con su proxy. Registra dos usuarios
// por la API, vincula una cuenta de LoL, una de R6 y una de CS2 (simuladas), y **intercepta la respuesta del resumen por
// juego** para que la de LoL declare datos de Riot y traiga partidas de varios modos (el modo simulado nunca produce datos
// de Riot, spec 014 RF-42, y aquí no hay clave real). Imprime una línea por comprobación y termina con código 1 si falla alguna.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(path.resolve(process.env.PW)).href);
const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = path.resolve(import.meta.dirname, 'modes');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const version = browser.version();

const LABEL = { all: 'Todas', solo: 'Solo/Dúo', flex: 'Flex', normal: 'Normales', aram: 'ARAM', other: 'Otros' };
const TABS_SELECTOR = '[role=tablist][aria-label="Modo de partida"]';
const rows = [];
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  rows.push({ name, ok, detail });
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// ---- Datos de la interceptación -------------------------------------------------------------------------------------
const NOW = Date.UTC(2026, 10, 22, 12, 0, 0);
const matchOf = (i, mode, win) => ({
  id: `LA2_${String(i).padStart(2, '0')}_${mode}`,
  gameId: 'lol',
  playedAt: new Date(NOW - (i + 1) * 3_600_000).toISOString(),
  result: win ? 'win' : 'loss',
  summary: `Ahri · ${i}/2/${i + 3}`,
  durationMinutes: 25 + (i % 9),
  mode,
  ...(mode === 'solo' && i % 4 === 0 ? { rankDelta: 17 } : {}),
});
/** 20 partidas: las pares de Solo/Dúo (10) y las impares repartidas en Flex, Normales, ARAM y Otros. */
const mixed20 = () =>
  Array.from({ length: 20 }, (_, i) =>
    matchOf(i, i % 2 === 0 ? 'solo' : ['flex', 'normal', 'aram', 'other', 'aram'][((i - 1) / 2) % 5], i % 3 !== 0),
  );
const SCENARIOS = {
  mixed: { matches: mixed20(), winRate: 50 },
  noSolo: { matches: [matchOf(0, 'aram', true), matchOf(1, 'flex', false), matchOf(2, 'aram', true)], winRate: null },
  oneMode: { matches: Array.from({ length: 3 }, (_, i) => matchOf(i, 'solo', i !== 1)), winRate: 67 },
  empty: { matches: [], winRate: null },
  noAram: { matches: mixed20().filter((m) => m.mode !== 'aram'), winRate: 50 },
};
let scenario = SCENARIOS.mixed;
let simulated = false; // true: se deja pasar la respuesta del servidor tal cual
let lastAccount = null; // la cuenta de LoL tal como la devolvió el servidor, para la resincronización interceptada

// ---- Preparación: dos usuarios con cuentas de LoL, R6 y CS2 ------------------------------------------------------------
const stamp = Date.now().toString(36);
const users = [];
async function setupUser(name) {
  const ctx = await browser.newContext();
  const api = ctx.request;
  const email = `${name}-${stamp}@example.com`;
  const password = 'contraseña-segura';
  const reg = await api.post(`${BASE}/api/users`, { data: { email, username: `${name}${stamp}`.slice(0, 20), password } });
  if (reg.status() !== 201) throw new Error(`registro ${reg.status()} ${await reg.text()}`);
  const user = await reg.json();
  const login = await api.post(`${BASE}/api/auth/login`, { data: { email, password } });
  const csrf = login.headers()['x-csrf-token'];
  for (const body of [
    { gameId: 'lol', handle: `Prueba${name}#LAS`, region: 'LAS' },
    { gameId: 'r6', handle: `prueba${name}`, region: 'LATAM' },
    { gameId: 'cs2', handle: name === 'ana' ? '76561190000000001' : '76561190000000002', region: 'South America' },
  ]) {
    const res = await api.post(`${BASE}/api/accounts`, { data: body, headers: { 'X-CSRF-Token': csrf } });
    if (res.status() !== 201) throw new Error(`vincular ${body.gameId}: ${res.status()} ${await res.text()}`);
  }
  await ctx.close();
  return { email, password, id: user.id };
}
users.push(await setupUser('ana'), await setupUser('beto'));
const [ana, beto] = users;

/** Abre una página con sesión de `who`, tema y ancho dados, con el resumen de LoL interceptado. */
async function open(who, { theme = 'dark', width = 1280 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem('tmu.theme', t), theme);
  const page = await ctx.newPage();
  const apiCalls = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/')) apiCalls.push(`${req.method()} ${new URL(req.url()).pathname}`);
  });
  await page.route(/\/api\/users\/[^/]+\/games\/lol$/, async (route) => {
    const response = await route.fetch();
    if (simulated) return route.fulfill({ response });
    const body = await response.json();
    lastAccount = body.account;
    body.account.origins = { ...body.account.origins, matches: 'riot' };
    body.recentMatches = scenario.matches;
    if (scenario.winRate === null) body.winRate = null;
    else body.winRate = scenario.winRate;
    return route.fulfill({ response, json: body });
  });
  // La resincronización de una cuenta simulada tiene su espera mínima: se contesta con la cuenta y la interfaz relee el resumen.
  await page.route(/\/api\/accounts\/[^/]+\/sync$/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(lastAccount) }));
  await page.goto(`${BASE}/login`);
  await page.fill('input[type=email]', who.email);
  await page.fill('input[type=password]', who.password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  return { ctx, page, apiCalls };
}

const tabNames = (page) => page.locator(`${TABS_SELECTOR} [role=tab]`).allInnerTexts();
const selectedTab = (page) => page.locator(`${TABS_SELECTOR} [role=tab][aria-selected=true]`).innerText();
const rowCount = (page) => page.locator('.ficha__matches .ledger tbody tr').count();
const rowNotes = (page) => page.locator('.ficha__matches .ledger tbody tr .note').allInnerTexts();
const waitLedger = (page) => page.waitForSelector('.ficha__matches .ledger, .ficha__matches p.note', { timeout: 10_000 });
const goProfile = async (page) => {
  await page.goto(`${BASE}/perfil`);
  await page.getByRole('tab', { name: /League of Legends/ }).click();
  await waitLedger(page);
  await page.waitForTimeout(1800); // el contador del % de victorias se anima
};
const modeLabelsIn = (text) => Object.values(LABEL).filter((l) => l !== 'Todas' && text.includes(` · ${l}`));

// ---- S1. Partidas de 20, modos mezclados, en los dos temas ------------------------------------------------------------
for (const theme of ['dark', 'light']) {
  scenario = SCENARIOS.mixed;
  simulated = false;
  const { ctx, page, apiCalls } = await open(ana, { theme });
  await goProfile(page);
  const t = `[${theme}] `;
  check(`${t}pestañas en el orden fijo, con «Todas» primero`, JSON.stringify(await tabNames(page)) === JSON.stringify(['Todas', 'Solo/Dúo', 'Flex', 'Normales', 'ARAM', 'Otros']), (await tabNames(page)).join(' | '));
  check(`${t}«Todas» elegida al abrir`, (await selectedTab(page)) === 'Todas');
  check(`${t}«Todas» enseña 8 partidas, aunque haya 20`, (await rowCount(page)) === 8, String(await rowCount(page)));
  const allNotes = await rowNotes(page);
  check(`${t}en «Todas» cada fila dice su modo`, allNotes.length === 8 && allNotes.every((n) => modeLabelsIn(n).length === 1), allNotes.slice(0, 3).join(' / '));
  check(`${t}el % de victorias sigue el valor del resumen (50)`, (await page.locator('.ficha__winrate').innerText()).includes('50'), await page.locator('.ficha__winrate').innerText());
  check(`${t}etiqueta de origen «Datos de Riot Games»`, (await page.locator('.ficha__matches').innerText()).includes('Datos de Riot Games'));

  apiCalls.length = 0;
  const expected = { solo: 10, flex: 2, normal: 2, aram: 4, other: 2 };
  for (const mode of ['solo', 'flex', 'normal', 'aram', 'other']) {
    await page.getByRole('tab', { name: LABEL[mode], exact: true }).click();
    await page.waitForTimeout(450);
    const n = await rowCount(page);
    const notes = await rowNotes(page);
    check(`${t}«${LABEL[mode]}»: ${Math.min(8, expected[mode])} partidas (hay ${expected[mode]})`, n === Math.min(8, expected[mode]), `filas ${n}`);
    check(`${t}«${LABEL[mode]}»: las filas no repiten el modo`, notes.every((x) => modeLabelsIn(x).length === 0), notes.slice(0, 2).join(' / '));
    check(`${t}«${LABEL[mode]}»: el % de victorias no cambia`, (await page.locator('.ficha__winrate').innerText()).includes('50'));
  }
  check(`${t}cambiar de pestaña no hace peticiones al servidor`, apiCalls.length === 0, apiCalls.join(', '));
  await page.waitForTimeout(1800);
  if (theme === 'dark') await page.screenshot({ path: path.join(OUT, `mixed-${theme}-1280.jpg`), type: 'jpeg', quality: 70 });
  await page.getByRole('tab', { name: 'Todas', exact: true }).click();
  await page.waitForTimeout(1800); // la píldora y las filas terminan de animarse
  await page.screenshot({ path: path.join(OUT, `mixed-all-${theme}-1280.jpg`), type: 'jpeg', quality: 70 });
  await ctx.close();
}

// ---- S2. Teclado -----------------------------------------------------------------------------------------------------
{
  scenario = SCENARIOS.mixed;
  const { ctx, page } = await open(ana);
  await goProfile(page);
  const tab = (name) => page.getByRole('tab', { name, exact: true });
  await tab('Todas').focus();
  const pressed = async (key) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(350);
    return { selected: await selectedTab(page), focused: await page.evaluate(() => document.activeElement?.textContent ?? '') };
  };
  let r = await pressed('ArrowRight');
  check('teclado: → pasa a la siguiente pestaña y la elige', r.selected === 'Solo/Dúo' && r.focused.includes('Solo/Dúo'), JSON.stringify(r));
  r = await pressed('End');
  check('teclado: Fin va a la última y la elige', r.selected === 'Otros' && r.focused.includes('Otros'), JSON.stringify(r));
  r = await pressed('ArrowRight');
  check('teclado: → en la última vuelve a la primera (circular)', r.selected === 'Todas', JSON.stringify(r));
  r = await pressed('ArrowLeft');
  check('teclado: ← en la primera va a la última (circular)', r.selected === 'Otros', JSON.stringify(r));
  r = await pressed('Home');
  check('teclado: Inicio va a la primera y la elige', r.selected === 'Todas' && r.focused.includes('Todas'), JSON.stringify(r));
  const roving = await page.locator(`${TABS_SELECTOR} [role=tab]`).evaluateAll((els) => els.map((e) => e.tabIndex));
  check('una sola parada de Tab para el grupo (la pestaña elegida)', roving.filter((x) => x === 0).length === 1 && roving[0] === 0, JSON.stringify(roving));
  const wiring = await page.evaluate((sel) => {
    const tabEl = document.querySelector(`${sel} [role=tab][aria-selected=true]`);
    const panel = document.getElementById(tabEl?.getAttribute('aria-controls') ?? '');
    return { hasPanel: !!panel, role: panel?.getAttribute('role'), labelled: panel?.getAttribute('aria-labelledby') === tabEl?.id, tabIndex: panel?.tabIndex };
  }, TABS_SELECTOR);
  check('cada pestaña está asociada a su panel (aria-controls / aria-labelledby)', wiring.hasPanel && wiring.role === 'tabpanel' && wiring.labelled, JSON.stringify(wiring));
  await page.keyboard.press('Tab');
  const onPanel = await page.evaluate(() => ({ role: document.activeElement?.getAttribute('role'), outline: getComputedStyle(document.activeElement).outlineStyle, width: getComputedStyle(document.activeElement).outlineWidth }));
  check('Tab desde la pestaña lleva al panel, con foco visible', onPanel.role === 'tabpanel' && onPanel.outline !== 'none' && onPanel.width !== '0px', JSON.stringify(onPanel));
  await page.keyboard.press('Shift+Tab');
  const back = await page.evaluate(() => document.activeElement?.getAttribute('role'));
  check('Mayús+Tab vuelve a la pestaña elegida', back === 'tab', back ?? '');
  const tabFocus = await page.evaluate(() => ({ outline: getComputedStyle(document.activeElement).outlineStyle, width: getComputedStyle(document.activeElement).outlineWidth }));
  check('la pestaña enfocada con teclado tiene indicador de foco', tabFocus.outline !== 'none' && tabFocus.width !== '0px', JSON.stringify(tabFocus));
  await ctx.close();
}

// ---- S3. Sin Solo/Dúo, un solo modo, vacío ------------------------------------------------------------------------------
for (const [name, key, expectTabs, expectRate] of [
  ['sin Solo/Dúo', 'noSolo', ['Todas', 'Flex', 'ARAM'], 'Sin datos'],
  ['un solo modo', 'oneMode', ['Todas', 'Solo/Dúo'], '67'],
]) {
  scenario = SCENARIOS[key];
  const { ctx, page } = await open(ana);
  await goProfile(page);
  check(`${name}: pestañas ${expectTabs.join(', ')}`, JSON.stringify(await tabNames(page)) === JSON.stringify(expectTabs), (await tabNames(page)).join(' | '));
  const rate = await page.locator('.ficha__winrate').innerText();
  check(`${name}: porcentaje «${expectRate}»`, rate.includes(expectRate), rate);
  if (key === 'noSolo') check('sin Solo/Dúo el rango sigue mostrándose', (await page.locator('.ficha__game').innerText()).toLowerCase().includes('rango vigente'));
  await ctx.close();
}
{
  scenario = SCENARIOS.empty;
  const { ctx, page } = await open(ana);
  await goProfile(page);
  check('sin partidas: sin pestañas y con el estado vacío de siempre', (await page.locator(TABS_SELECTOR).count()) === 0 && (await page.locator('.ficha__matches').innerText()).includes('Todavía no hay partidas'));
  await ctx.close();
}

// ---- S4. Reinicios -------------------------------------------------------------------------------------------------------
{
  scenario = SCENARIOS.mixed;
  const { ctx, page } = await open(ana);
  await goProfile(page);
  await page.getByRole('tab', { name: 'ARAM', exact: true }).click();
  await page.waitForTimeout(300);
  check('prueba previa: ARAM elegida', (await selectedTab(page)) === 'ARAM');
  await page.getByRole('tab', { name: /Counter-Strike 2/ }).click();
  await page.waitForTimeout(500);
  check('en CS2 (simulada) no hay pestañas de modo', (await page.locator(TABS_SELECTOR).count()) === 0);
  await page.getByRole('tab', { name: /League of Legends/ }).click();
  await waitLedger(page);
  await page.waitForTimeout(500);
  check('LoL → CS2 → LoL vuelve a «Todas» (RF-6)', (await selectedTab(page)) === 'Todas', await selectedTab(page));
  await page.getByRole('tab', { name: 'ARAM', exact: true }).click();
  await page.waitForTimeout(300);
  scenario = SCENARIOS.noAram;
  await page.getByRole('button', { name: 'Resincronizar' }).first().click();
  await page.waitForTimeout(2500);
  const names = await tabNames(page);
  check('al volver a pedir el resumen sin partidas de ARAM, la pestaña desaparece', !names.includes('ARAM'), names.join(' | '));
  check('y la pestaña elegida vuelve a «Todas» (RF-10)', (await selectedTab(page)) === 'Todas', await selectedTab(page));
  scenario = SCENARIOS.mixed;
  await ctx.close();
}

// ---- S5. Cuentas simuladas, CS2 y R6; ficha de otro jugador -----------------------------------------------------------------
{
  simulated = true;
  const { ctx, page } = await open(ana);
  await page.goto(`${BASE}/perfil`);
  for (const [name, re] of [['LoL simulada', /League of Legends/], ['R6', /Rainbow Six/], ['CS2', /Counter-Strike 2/]]) {
    await page.getByRole('tab', { name: re }).click();
    await waitLedger(page);
    await page.waitForTimeout(500);
    check(`${name}: sin pestañas de modo y con la lista de siempre`, (await page.locator(TABS_SELECTOR).count()) === 0 && (await rowCount(page)) >= 1 && (await rowCount(page)) <= 8, `filas ${await rowCount(page)}`);
    const notes = await rowNotes(page);
    check(`${name}: las filas no llevan modo`, notes.every((n) => modeLabelsIn(n).length === 0));
  }
  await ctx.close();
  simulated = false;
}
{
  scenario = SCENARIOS.mixed;
  const { ctx, page } = await open(ana);
  await page.goto(`${BASE}/jugadores/${beto.id}`);
  await page.getByRole('tab', { name: /League of Legends/ }).click();
  await waitLedger(page);
  await page.waitForTimeout(600);
  check('ficha de otro jugador: mismas pestañas', JSON.stringify(await tabNames(page)) === JSON.stringify(['Todas', 'Solo/Dúo', 'Flex', 'Normales', 'ARAM', 'Otros']), (await tabNames(page)).join(' | '));
  await page.getByRole('tab', { name: 'Flex', exact: true }).click();
  await page.waitForTimeout(300);
  check('ficha de otro jugador: el cálculo y la selección funcionan igual', (await rowCount(page)) === 2 && (await page.locator('.ficha__winrate').innerText()).includes('50'));
  await ctx.close();
}

// ---- S6. Anchos estrechos, en los dos temas -------------------------------------------------------------------------------
for (const theme of ['dark', 'light']) {
  for (const width of [375, 360]) {
    scenario = SCENARIOS.mixed;
    const { ctx, page } = await open(ana, { theme, width });
    await goProfile(page);
    const t = `[${theme} ${width}px] `;
    const m = await page.evaluate((sel) => {
      const list = document.querySelector(sel);
      const box = list?.getBoundingClientRect();
      const ficha = document.querySelector('.ficha__matches')?.getBoundingClientRect();
      return {
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        listClient: list?.clientWidth, listScroll: list?.scrollWidth,
        listRight: box ? Math.round(box.right) : null, fichaRight: ficha ? Math.round(ficha.right) : null,
        tabHeight: Math.round(document.querySelector(`${sel} [role=tab]`)?.getBoundingClientRect().height ?? 0),
      };
    }, TABS_SELECTOR);
    check(`${t}la página no se desplaza en horizontal`, m.pageOverflow <= 0, JSON.stringify(m));
    check(`${t}la lista de pestañas no sale de la ficha`, m.listRight !== null && m.fichaRight !== null && m.listRight <= m.fichaRight + 1, JSON.stringify(m));
    await page.getByRole('tab', { name: 'Todas', exact: true }).focus();
    await page.keyboard.press('End');
    await page.waitForTimeout(500);
    const last = await page.evaluate((sel) => {
      const el = document.querySelector(`${sel} [role=tab][aria-selected=true]`);
      const list = document.querySelector(sel);
      const a = el.getBoundingClientRect();
      const b = list.getBoundingClientRect();
      return { name: el.textContent, inside: a.left >= b.left - 1 && a.right <= b.right + 1 };
    }, TABS_SELECTOR);
    check(`${t}la última pestaña se alcanza con Fin y queda a la vista`, last.name === 'Otros' && last.inside, JSON.stringify(last));
    const rowsFit = await page.evaluate(() => [...document.querySelectorAll('.ficha__matches .ledger tbody tr')].every((tr) => tr.getBoundingClientRect().right <= window.innerWidth + 1));
    check(`${t}las filas de partidas caben en el ancho`, rowsFit);
    await page.getByRole('tab', { name: 'Todas', exact: true }).click();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT, `mixed-${theme}-${width}.jpg`), type: 'jpeg', quality: 70 });
    await ctx.close();
  }
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ browser: `Chrome ${version}`, date: new Date().toISOString(), checks: rows }, null, 2));
await browser.close();
console.log(failures ? `\n${failures} comprobación(es) fallida(s) de ${rows.length}` : `\nTodas las comprobaciones pasan (${rows.length}) con Chrome ${version}`);
process.exitCode = failures ? 1 : 0;
