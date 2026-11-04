# Validación 008 — Vista nueva: ficha de jugador

- Fecha de inicio: 2026-10-20
- Commit de partida: `d08b393` (rama `marselo`)
- Node: v24.19.0 (el plan 6 citaba 24.13.0, la versión de la 007; la máquina tiene ahora 24.19.0)
- Estado: T1 a T10 hechas (2026-10-20). T10: registro hecho, con defectos abiertos D10-1 y D10-2 (contraste, RNF-5) y D10-3, el posible cambio C10-1 y NVDA pendiente (usuario); ver 4.7 y 4.8

## 1. Comprobaciones con Node

Método (plan 6, punto 1; reglas de `tasks.md`): script desechable en el scratchpad, escrito
antes que el código, ejecutado en rojo contra el módulo inexistente o vacío y después en
verde. El script no se versiona; su texto y sus salidas se pegan aquí.

### 1.0 Gancho de resolución (P54; decisión del usuario 2026-10-20, Pregunta 5)

Reescrito en T1 a partir de la descripción de `specs/007-integrar-frontend/validation.md`
(filas T4, T14, T24, T27 y líneas 125-129): añade `.ts` a los imports relativos sin extensión
y resuelve el alias `@/` contra la variable `TMU_SRC` (= `<repo>/frontend/src`). **No se
versiona como archivo**; T2, T3 y T10 copian este texto en su scratchpad. Uso:
`TMU_SRC=<repo>/frontend/src node --import ./register.mjs --test check.mjs` (con
`--experimental-transform-types` cuando el grafo de imports tenga TypeScript que no sea solo
de tipos, obligatorio en T3).

`hooks.mjs`:

```js
// Gancho de resolución de Node para cargar frontend/src/**/*.ts sin compilar (spec 008, T1;
// reescrito a partir de la descripción de specs/007-integrar-frontend/validation.md).
// - Resuelve el alias `@/` contra la variable de entorno TMU_SRC (= <repo>/frontend/src).
// - Añade `.ts` a los imports relativos (o del alias) sin extensión que no resuelven tal cual.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = process.env.TMU_SRC;

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;
  if (specifier.startsWith('@/')) {
    if (!SRC) throw new Error('TMU_SRC no está definida (debe apuntar a frontend/src)');
    target = pathToFileURL(path.join(SRC, specifier.slice(2))).href;
  }
  const isPathLike =
    target !== specifier || target.startsWith('./') || target.startsWith('../') || target.startsWith('/');
  if (!isPathLike || path.extname(target) !== '') return nextResolve(target, context);
  try {
    return await nextResolve(target, context);
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' && error?.code !== 'ERR_UNSUPPORTED_DIR_IMPORT') throw error;
    return nextResolve(`${target}.ts`, context);
  }
}
```

`register.mjs`:

```js
// Registra el gancho de resolución: node --import ./register.mjs check.mjs
import { register } from 'node:module';

register('./hooks.mjs', import.meta.url);
```

### 1.1 T1 — `domain/playerSheet.ts` (2026-10-20)

RF-4, RF-6, RF-7, RF-9, RF-10, RF-12, RF-13, RF-15, RF-17, RF-19, RF-20, RF-22, RF-23, RNF-6.
Casos del plan 6.1 de `sharedHours` + `proposeState` (los seis de 3.1), la comparación
`groupBlocks` frente a `sharedRuns` en cada uno (P53, Pregunta 6), `sharedHours` sin cruce y
con `[]`, los seis motivos (el 2 en `lol`, `r6` y `cs2`), carga, fallo, motivo 1 con datos
cargando o fallidos, habilitado, `playerTabs`/`resolveTab`, `playerPageState`,
`isOwnPlayerRef`, `zonesDiffer`, `distanceView`, `readNormalized` y `readWinRate`. 40 pruebas
de `node:test`.

Bandera: el grafo de imports de `playerSheet.ts` (`availability`, `games`, `matching`,
`proposal`, `types`, `rankScale`) solo tiene TypeScript borrable; cargó con el gancho y el
borrado de tipos por defecto de Node 24, **sin** `--experimental-transform-types`.

Script (`<scratchpad>/t1/check.mjs`):

```js
// Spec 008, T1: comprobaciones de domain/playerSheet.ts (plan 6.1).
// Ejecución: TMU_SRC=<repo>/frontend/src node --import ./register.mjs --test check.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SRC = process.env.TMU_SRC;
const load = (rel) => import(pathToFileURL(path.join(SRC, rel)).href);

const sheet = await load('domain/playerSheet.ts');
const { groupBlocks, formatRange, intersectBlocks } = await load('domain/availability.ts');
const { sharedRuns } = await load('domain/proposal.ts');

const ready = (value) => ({ state: 'ready', value });
const loading = { state: 'loading' };
const failed = { state: 'failed' };

/** Los cuatro datos cargados con la misma lista de bloques a los dos lados. */
function readyInput(mine, theirs, gameId = 'lol') {
  return {
    gameId,
    displayName: 'B',
    theirAccounts: ready([{ gameId }]),
    myAccounts: ready([{ gameId }]),
    myBlocks: ready(mine),
    theirBlocks: ready(theirs),
  };
}

const range = (n, day, from) => Array.from({ length: n }, (_, i) => `${day}-${from + i}`);

// ---------- sharedHours + proposeState (plan 3.1) ----------
const CASES_31 = [
  {
    name: 'recorrido: martes 20, 21, 22 + jueves 3',
    blocks: ['1-20', '1-21', '1-22', '3-3'],
    ranges: ['Mar 20:00–23:00', 'Jue 03:00–04:00'],
    total: 4,
    expect: { kind: 'ready', day: 1, startHour: 20, durationHours: 3 },
  },
  {
    name: '00:00 y 12:00 el mismo día (miércoles, orden literal, tramos distintos)',
    blocks: ['2-12', '2-0'],
    ranges: ['Mié 00:00–01:00', 'Mié 12:00–13:00'],
    total: 2,
    expect: { kind: 'ready', day: 2, startHour: 0, durationHours: 1 },
  },
  {
    name: 'serie de 6 h (lunes 12–17) → 12:00, 4 h',
    blocks: range(6, 0, 12),
    ranges: ['Lun 12:00–18:00'],
    total: 6,
    expect: { kind: 'ready', day: 0, startHour: 12, durationHours: 4 },
  },
  {
    name: 'tramo viernes 10:00–14:00 → 12:00, 2 h',
    blocks: range(4, 4, 10),
    ranges: ['Vie 10:00–14:00'],
    total: 4,
    expect: { kind: 'ready', day: 4, startHour: 12, durationHours: 2 },
  },
  {
    name: 'martes 23 + miércoles 0 → dos tramos, martes 23:00, 1 h',
    blocks: ['1-23', '2-0'],
    ranges: ['Mar 23:00–00:00', 'Mié 00:00–01:00'],
    total: 2,
    expect: { kind: 'ready', day: 1, startHour: 23, durationHours: 1 },
  },
  {
    name: 'solo jueves 02:00 a 11:00 → outsideAgenda, los tramos sí aparecen',
    blocks: range(10, 3, 2),
    ranges: ['Jue 02:00–12:00'],
    total: 10,
    expect: { kind: 'blocked', reason: 'outsideAgenda', gameId: 'lol' },
  },
];

for (const c of CASES_31) {
  test(`sharedHours + proposeState: ${c.name}`, () => {
    const result = sheet.sharedHours(c.blocks, c.blocks);
    assert.deepEqual(result.blocks, intersectBlocks(c.blocks, c.blocks));
    assert.deepEqual(result.ranges.map(formatRange), c.ranges);
    assert.equal(result.total, c.total);
    const state = sheet.proposeState(readyInput(c.blocks, c.blocks));
    if (c.expect.kind === 'ready') {
      assert.equal(state.kind, 'ready');
      assert.deepEqual(state.proposal, {
        gameId: 'lol',
        day: c.expect.day,
        startHour: c.expect.startHour,
        durationHours: c.expect.durationHours,
        title: 'Sesión con B',
        slots: 5,
        notes: '',
      });
    } else {
      assert.deepEqual(state, c.expect);
    }
  });

  test(`groupBlocks frente a sharedRuns (P53): ${c.name}`, () => {
    const common = sheet.sharedHours(c.blocks, c.blocks).blocks;
    const grouped = groupBlocks(common);
    const runs = sharedRuns(common);
    assert.equal(grouped.length, runs.length);
    grouped.forEach((g, i) => {
      assert.equal(g.day, runs[i].day);
      assert.equal(g.startHour, runs[i].startHour);
      assert.equal(g.endHour, runs[i].endHour + 1);
    });
  });
}

test('sharedHours: intersección con listas distintas (delegada en intersectBlocks)', () => {
  const r = sheet.sharedHours(['1-20', '1-21', '5-14', '1-22'], ['1-22', '1-20', '1-21', '6-0']);
  assert.deepEqual(r.blocks, ['1-20', '1-21', '1-22']);
  assert.deepEqual(r.ranges.map(formatRange), ['Mar 20:00–23:00']);
  assert.equal(r.total, 3);
});

test('sharedHours sin cruce o con una lista [] → vacío y total 0', () => {
  const empty = { blocks: [], ranges: [], total: 0 };
  assert.deepEqual(sheet.sharedHours(['0-12', '0-13'], ['1-12', '1-13']), empty);
  assert.deepEqual(sheet.sharedHours([], ['1-12']), empty);
  assert.deepEqual(sheet.sharedHours(['1-12'], []), empty);
  assert.deepEqual(sheet.sharedHours([], []), empty);
});

// ---------- proposeState (plan 3.2) ----------
test('proposeState motivo 1: cuentas del jugador [] y el resto loading → noTheirAccounts', () => {
  assert.deepEqual(
    sheet.proposeState({
      gameId: null,
      displayName: 'B',
      theirAccounts: ready([]),
      myAccounts: loading,
      myBlocks: loading,
      theirBlocks: loading,
    }),
    { kind: 'blocked', reason: 'noTheirAccounts', gameId: null },
  );
});

for (const g of ['lol', 'r6', 'cs2']) {
  test(`proposeState motivo 2 en ${g}: sin cuenta propia → noOwnAccount con ${g}`, () => {
    const others = ['lol', 'r6', 'cs2'].filter((x) => x !== g).map((gameId) => ({ gameId }));
    assert.deepEqual(
      sheet.proposeState({
        gameId: g,
        displayName: 'B',
        theirAccounts: ready([{ gameId: g }]),
        myAccounts: ready(others),
        myBlocks: loading,
        theirBlocks: loading,
      }),
      { kind: 'blocked', reason: 'noOwnAccount', gameId: g },
    );
  });
}

test('proposeState motivo 3: horas propias [], las del otro loading → noOwnHours', () => {
  const input = { ...readyInput([], []), theirBlocks: loading };
  assert.deepEqual(sheet.proposeState(input), { kind: 'blocked', reason: 'noOwnHours', gameId: 'lol' });
});

test('proposeState motivo 4: horas del otro [] → noTheirHours', () => {
  assert.deepEqual(sheet.proposeState(readyInput(['1-20'], [])), {
    kind: 'blocked',
    reason: 'noTheirHours',
    gameId: 'lol',
  });
});

test('proposeState motivo 5: sin cruce → noCommon', () => {
  assert.deepEqual(sheet.proposeState(readyInput(['1-20'], ['2-20'], 'r6')), {
    kind: 'blocked',
    reason: 'noCommon',
    gameId: 'r6',
  });
});

test('proposeState motivo 6: solo jueves 03:00 en común → outsideAgenda', () => {
  assert.deepEqual(sheet.proposeState(readyInput(['3-3', '1-20'], ['3-3', '2-20'], 'cs2')), {
    kind: 'blocked',
    reason: 'outsideAgenda',
    gameId: 'cs2',
  });
});

test('proposeState carga: cuentas del jugador con datos, cuentas propias loading → loading', () => {
  const input = { ...readyInput(['1-20'], ['1-20']), myAccounts: loading };
  assert.deepEqual(sheet.proposeState(input), { kind: 'loading' });
});

test('proposeState carga y fallo de cada dato en su turno', () => {
  const base = readyInput(['1-20'], ['1-20']);
  assert.deepEqual(sheet.proposeState({ ...base, theirAccounts: loading }), { kind: 'loading' });
  assert.deepEqual(sheet.proposeState({ ...base, theirAccounts: failed }), { kind: 'failed' });
  assert.deepEqual(sheet.proposeState({ ...base, myAccounts: failed }), { kind: 'failed' });
  assert.deepEqual(sheet.proposeState({ ...base, myBlocks: loading }), { kind: 'loading' });
  assert.deepEqual(sheet.proposeState({ ...base, theirBlocks: loading }), { kind: 'loading' });
  assert.deepEqual(sheet.proposeState({ ...base, theirBlocks: failed }), { kind: 'failed' });
  // Defensivo: pestaña aún sin resolver con cuentas del jugador → loading.
  assert.deepEqual(sheet.proposeState({ ...base, gameId: null }), { kind: 'loading' });
});

test('proposeState fallo: horas propias failed → failed', () => {
  const input = { ...readyInput(['1-20'], ['1-20']), myBlocks: failed };
  assert.deepEqual(sheet.proposeState(input), { kind: 'failed' });
});

test('proposeState fallo: cuentas del jugador [] y horas propias failed → motivo 1', () => {
  const input = { ...readyInput(['1-20'], ['1-20']), theirAccounts: ready([]), myBlocks: failed };
  assert.deepEqual(sheet.proposeState(input), { kind: 'blocked', reason: 'noTheirAccounts', gameId: null });
});

test('proposeState habilitado: los cuatro ready y cruce proponible → ready', () => {
  const state = sheet.proposeState(readyInput(['1-20', '1-21'], ['1-21', '1-20'], 'r6'));
  assert.deepEqual(state, {
    kind: 'ready',
    proposal: { gameId: 'r6', day: 1, startHour: 20, durationHours: 2, title: 'Sesión con B', slots: 5, notes: '' },
  });
});

// ---------- playerTabs / resolveTab (plan 3.3) ----------
const acc = (...ids) => ids.map((gameId) => ({ gameId }));

test('playerTabs: orden de GAME_IDS y sin repetidos', () => {
  assert.deepEqual(sheet.playerTabs(acc('r6', 'lol', 'cs2')), ['lol', 'r6', 'cs2']);
  assert.deepEqual(sheet.playerTabs(acc('cs2', 'r6', 'cs2')), ['r6', 'cs2']);
  assert.deepEqual(sheet.playerTabs([]), []);
});

test('resolveTab', () => {
  const all = acc('r6', 'lol', 'cs2');
  const lolReplace = { tab: 'lol', urlGame: 'lol', mustReplace: true };
  assert.deepEqual(sheet.resolveTab(all, null), lolReplace);
  assert.deepEqual(sheet.resolveTab(all, 'r6'), { tab: 'r6', urlGame: 'r6', mustReplace: false });
  assert.deepEqual(sheet.resolveTab(all, 'LOL'), lolReplace);
  assert.deepEqual(sheet.resolveTab(all, 'xyz'), lolReplace);
  assert.deepEqual(sheet.resolveTab(all, 'constructor'), lolReplace);
  assert.deepEqual(sheet.resolveTab(all, '__proto__'), lolReplace);
  assert.deepEqual(sheet.resolveTab(acc('lol', 'r6'), 'cs2'), lolReplace);
  // Pestaña que desaparece: tenía r6, ya no.
  assert.deepEqual(sheet.resolveTab(acc('lol', 'cs2'), 'r6'), lolReplace);
  assert.deepEqual(sheet.resolveTab(acc('cs2', 'r6'), 'lol'), { tab: 'r6', urlGame: 'r6', mustReplace: true });
  assert.deepEqual(sheet.resolveTab([], 'lol'), { tab: null, urlGame: null, mustReplace: true });
  assert.deepEqual(sheet.resolveTab([], null), { tab: null, urlGame: null, mustReplace: false });
});

// ---------- playerPageState ----------
test('playerPageState', () => {
  const s = (state, errorStatus = null) => sheet.playerPageState({ state, errorStatus });
  assert.equal(s('failed', 400), 'notFound');
  assert.equal(s('failed', 404), 'notFound');
  // 404 del usuario tras RF-19 (las cuentas respondieron 200 []): manda el usuario.
  assert.equal(s('failed', 404), 'notFound');
  assert.equal(s('failed', 500), 'failed');
  assert.equal(s('failed', 0), 'failed');
  assert.equal(s('failed', null), 'failed');
  assert.equal(s('loading'), 'loading');
  assert.equal(s('ready'), 'ready');
});

// ---------- isOwnPlayerRef ----------
test('isOwnPlayerRef', () => {
  assert.equal(sheet.isOwnPlayerRef('me', 'user-3'), true);
  assert.equal(sheet.isOwnPlayerRef('user-3', 'user-3'), true);
  assert.equal(sheet.isOwnPlayerRef('USER-3', 'user-3'), true);
  assert.equal(sheet.isOwnPlayerRef('User-3', 'user-3'), true);
  assert.equal(sheet.isOwnPlayerRef('ME', 'user-3'), false);
  assert.equal(sheet.isOwnPlayerRef('Me', 'user-3'), false);
  assert.equal(sheet.isOwnPlayerRef(' me', 'user-3'), false);
  assert.equal(sheet.isOwnPlayerRef('USER-5', 'user-3'), false);
  const oid = '65a1b2c3d4e5f6a7b8c9d0e1';
  assert.equal(sheet.isOwnPlayerRef(oid.toUpperCase(), oid), true);
  assert.equal(sheet.isOwnPlayerRef('me', oid), true);
});

// ---------- zonesDiffer ----------
test('zonesDiffer', () => {
  assert.equal(sheet.zonesDiffer('America/Argentina/Buenos_Aires', 'America/Sao_Paulo'), true);
  assert.equal(sheet.zonesDiffer('America/Santiago', 'America/Santiago'), false);
});

// ---------- readNormalized / readWinRate ----------
test('readNormalized', () => {
  assert.equal(sheet.readNormalized(undefined), null);
  assert.equal(sheet.readNormalized(null), null);
  assert.equal(sheet.readNormalized({}), null);
  assert.equal(sheet.readNormalized({ currentRank: null }), null);
  assert.equal(sheet.readNormalized({ currentRank: {} }), null);
  assert.equal(sheet.readNormalized({ currentRank: { normalized: null } }), null);
  assert.equal(sheet.readNormalized({ currentRank: { normalized: '50' } }), null);
  assert.equal(sheet.readNormalized({ currentRank: { normalized: NaN } }), null);
  assert.equal(sheet.readNormalized({ currentRank: { normalized: Infinity } }), null);
  assert.equal(sheet.readNormalized({ currentRank: { normalized: 0 } }), 0);
  assert.equal(sheet.readNormalized({ currentRank: { normalized: 100 } }), 100);
});

test('readWinRate', () => {
  assert.equal(sheet.readWinRate(undefined), null);
  assert.equal(sheet.readWinRate(null), null);
  assert.equal(sheet.readWinRate({}), null);
  assert.equal(sheet.readWinRate({ winRate: null }), null);
  assert.equal(sheet.readWinRate({ winRate: '50' }), null);
  assert.equal(sheet.readWinRate({ winRate: NaN }), null);
  assert.equal(sheet.readWinRate({ winRate: 0 }), 0);
  assert.equal(sheet.readWinRate({ winRate: 100 }), 100);
});

// ---------- distanceView ----------
const rank = (normalized) => ({ normalized });

test('distanceView: 40 y 52 → value 12', () => {
  assert.deepEqual(
    sheet.distanceView({
      gameId: 'lol',
      myAccounts: ready([{ gameId: 'r6', currentRank: rank(90) }, { gameId: 'lol', currentRank: rank(40) }]),
      theirAccount: ready({ currentRank: rank(52), simulated: false }),
    }),
    { kind: 'value', points: 12, simulated: false },
  );
});

test('distanceView: mismo valor → value 0; simulated se propaga', () => {
  assert.deepEqual(
    sheet.distanceView({
      gameId: 'cs2',
      myAccounts: ready([{ gameId: 'cs2', currentRank: rank(40) }]),
      theirAccount: ready({ currentRank: rank(40), simulated: true }),
    }),
    { kind: 'value', points: 0, simulated: true },
  );
  assert.deepEqual(
    sheet.distanceView({
      gameId: 'cs2',
      myAccounts: ready([{ gameId: 'cs2', currentRank: rank(52) }]),
      theirAccount: ready({ currentRank: rank(40) }),
    }),
    { kind: 'value', points: 12, simulated: false },
  );
});

test('distanceView: cuentas propias sin el juego → noOwnAccount aunque el resumen falle', () => {
  const mine = ready([{ gameId: 'lol', currentRank: rank(40) }]);
  for (const theirAccount of [failed, loading, ready({ currentRank: null })]) {
    assert.deepEqual(sheet.distanceView({ gameId: 'r6', myAccounts: mine, theirAccount }), {
      kind: 'noOwnAccount',
      gameId: 'r6',
    });
  }
});

test('distanceView: sin currentRank en una → noData', () => {
  assert.deepEqual(
    sheet.distanceView({
      gameId: 'lol',
      myAccounts: ready([{ gameId: 'lol', currentRank: rank(40) }]),
      theirAccount: ready({ currentRank: null, simulated: true }),
    }),
    { kind: 'noData' },
  );
  assert.deepEqual(
    sheet.distanceView({
      gameId: 'lol',
      myAccounts: ready([{ gameId: 'lol' }]),
      theirAccount: ready({ currentRank: rank(52) }),
    }),
    { kind: 'noData' },
  );
  assert.deepEqual(
    sheet.distanceView({
      gameId: 'lol',
      myAccounts: ready([{ gameId: 'lol', currentRank: { normalized: '40' } }]),
      theirAccount: ready({ currentRank: rank(52) }),
    }),
    { kind: 'noData' },
  );
});

test('distanceView: cuentas propias failed → failed ownAccounts; loading', () => {
  assert.deepEqual(
    sheet.distanceView({ gameId: 'lol', myAccounts: failed, theirAccount: ready({ currentRank: rank(52) }) }),
    { kind: 'failed', source: 'ownAccounts' },
  );
  assert.deepEqual(
    sheet.distanceView({ gameId: 'lol', myAccounts: loading, theirAccount: ready({ currentRank: rank(52) }) }),
    { kind: 'loading' },
  );
});

test('distanceView: resumen loading → loading; resumen failed → failed summary', () => {
  const mine = ready([{ gameId: 'lol', currentRank: rank(40) }]);
  assert.deepEqual(sheet.distanceView({ gameId: 'lol', myAccounts: mine, theirAccount: loading }), {
    kind: 'loading',
  });
  assert.deepEqual(sheet.distanceView({ gameId: 'lol', myAccounts: mine, theirAccount: failed }), {
    kind: 'failed',
    source: 'summary',
  });
});
```

**Rojo 1** — módulo inexistente (`TMU_SRC=<repo>/frontend/src node --import ./register.mjs --test check.mjs`; trazas `at …` omitidas):

```
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repo>/frontend/src/domain/playerSheet.ts' imported from <scratchpad>/t1/check.mjs
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file://<repo>/frontend/src/domain/playerSheet.ts'
}
Node.js v24.19.0
✖ check.mjs (81.137ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 89.491125
✖ failing tests:
test at check.mjs:1:1
✖ check.mjs (81.137ms)
  'test failed'
```

**Rojo 2** — módulo vacío (`export {};`), cada caso falla por separado (40 de 40):

```
✖ sharedHours + proposeState: recorrido: martes 20, 21, 22 + jueves 3 (0.457ms)
✖ groupBlocks frente a sharedRuns (P53): recorrido: martes 20, 21, 22 + jueves 3 (0.051625ms)
✖ sharedHours + proposeState: 00:00 y 12:00 el mismo día (miércoles, orden literal, tramos distintos) (0.034666ms)
✖ groupBlocks frente a sharedRuns (P53): 00:00 y 12:00 el mismo día (miércoles, orden literal, tramos distintos) (0.032625ms)
✖ sharedHours + proposeState: serie de 6 h (lunes 12–17) → 12:00, 4 h (0.031583ms)
✖ groupBlocks frente a sharedRuns (P53): serie de 6 h (lunes 12–17) → 12:00, 4 h (0.025125ms)
✖ sharedHours + proposeState: tramo viernes 10:00–14:00 → 12:00, 2 h (0.030625ms)
✖ groupBlocks frente a sharedRuns (P53): tramo viernes 10:00–14:00 → 12:00, 2 h (0.025208ms)
✖ sharedHours + proposeState: martes 23 + miércoles 0 → dos tramos, martes 23:00, 1 h (0.035625ms)
✖ groupBlocks frente a sharedRuns (P53): martes 23 + miércoles 0 → dos tramos, martes 23:00, 1 h (0.061292ms)
✖ sharedHours + proposeState: solo jueves 02:00 a 11:00 → outsideAgenda, los tramos sí aparecen (0.041416ms)
✖ groupBlocks frente a sharedRuns (P53): solo jueves 02:00 a 11:00 → outsideAgenda, los tramos sí aparecen (0.028625ms)
✖ sharedHours: intersección con listas distintas (delegada en intersectBlocks) (0.031334ms)
✖ sharedHours sin cruce o con una lista [] → vacío y total 0 (0.034791ms)
✖ proposeState motivo 1: cuentas del jugador [] y el resto loading → noTheirAccounts (0.034542ms)
✖ proposeState motivo 2 en lol: sin cuenta propia → noOwnAccount con lol (0.262ms)
✖ proposeState motivo 2 en r6: sin cuenta propia → noOwnAccount con r6 (0.056958ms)
✖ proposeState motivo 2 en cs2: sin cuenta propia → noOwnAccount con cs2 (0.047958ms)
✖ proposeState motivo 3: horas propias [], las del otro loading → noOwnHours (0.072541ms)
✖ proposeState motivo 4: horas del otro [] → noTheirHours (0.041167ms)
✖ proposeState motivo 5: sin cruce → noCommon (0.033625ms)
✖ proposeState motivo 6: solo jueves 03:00 en común → outsideAgenda (0.035625ms)
✖ proposeState carga: cuentas del jugador con datos, cuentas propias loading → loading (0.03425ms)
✖ proposeState carga y fallo de cada dato en su turno (0.044833ms)
✖ proposeState fallo: horas propias failed → failed (0.03575ms)
✖ proposeState fallo: cuentas del jugador [] y horas propias failed → motivo 1 (0.03425ms)
✖ proposeState habilitado: los cuatro ready y cruce proponible → ready (0.036166ms)
✖ playerTabs: orden de GAME_IDS y sin repetidos (0.045709ms)
✖ resolveTab (0.050333ms)
✖ playerPageState (0.043875ms)
✖ isOwnPlayerRef (0.044375ms)
✖ zonesDiffer (0.03ms)
✖ readNormalized (0.043542ms)
✖ readWinRate (0.0355ms)
✖ distanceView: 40 y 52 → value 12 (0.04625ms)
✖ distanceView: mismo valor → value 0; simulated se propaga (0.041666ms)
✖ distanceView: cuentas propias sin el juego → noOwnAccount aunque el resumen falle (0.045083ms)
✖ distanceView: sin currentRank en una → noData (0.044292ms)
✖ distanceView: cuentas propias failed → failed ownAccounts; loading (0.03825ms)
✖ distanceView: resumen loading → loading; resumen failed → failed summary (0.035959ms)
  (…)
  TypeError: sheet.sharedHours is not a function
ℹ tests 40
ℹ suites 0
ℹ pass 0
ℹ fail 40
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 135.7805
```

**Verde** — con `playerSheet.ts` implementado (salida exit 0):

```
✔ sharedHours + proposeState: recorrido: martes 20, 21, 22 + jueves 3 (1.072625ms)
✔ groupBlocks frente a sharedRuns (P53): recorrido: martes 20, 21, 22 + jueves 3 (0.098959ms)
✔ sharedHours + proposeState: 00:00 y 12:00 el mismo día (miércoles, orden literal, tramos distintos) (0.090458ms)
✔ groupBlocks frente a sharedRuns (P53): 00:00 y 12:00 el mismo día (miércoles, orden literal, tramos distintos) (0.046292ms)
✔ sharedHours + proposeState: serie de 6 h (lunes 12–17) → 12:00, 4 h (0.093542ms)
✔ groupBlocks frente a sharedRuns (P53): serie de 6 h (lunes 12–17) → 12:00, 4 h (0.046583ms)
✔ sharedHours + proposeState: tramo viernes 10:00–14:00 → 12:00, 2 h (0.36375ms)
✔ groupBlocks frente a sharedRuns (P53): tramo viernes 10:00–14:00 → 12:00, 2 h (0.2475ms)
✔ sharedHours + proposeState: martes 23 + miércoles 0 → dos tramos, martes 23:00, 1 h (0.064959ms)
✔ groupBlocks frente a sharedRuns (P53): martes 23 + miércoles 0 → dos tramos, martes 23:00, 1 h (0.067833ms)
✔ sharedHours + proposeState: solo jueves 02:00 a 11:00 → outsideAgenda, los tramos sí aparecen (0.064709ms)
✔ groupBlocks frente a sharedRuns (P53): solo jueves 02:00 a 11:00 → outsideAgenda, los tramos sí aparecen (0.038125ms)
✔ sharedHours: intersección con listas distintas (delegada en intersectBlocks) (0.0445ms)
✔ sharedHours sin cruce o con una lista [] → vacío y total 0 (0.042166ms)
✔ proposeState motivo 1: cuentas del jugador [] y el resto loading → noTheirAccounts (0.133ms)
✔ proposeState motivo 2 en lol: sin cuenta propia → noOwnAccount con lol (0.052875ms)
✔ proposeState motivo 2 en r6: sin cuenta propia → noOwnAccount con r6 (0.026666ms)
✔ proposeState motivo 2 en cs2: sin cuenta propia → noOwnAccount con cs2 (0.020875ms)
✔ proposeState motivo 3: horas propias [], las del otro loading → noOwnHours (0.03075ms)
✔ proposeState motivo 4: horas del otro [] → noTheirHours (0.032125ms)
✔ proposeState motivo 5: sin cruce → noCommon (0.031292ms)
✔ proposeState motivo 6: solo jueves 03:00 en común → outsideAgenda (0.027916ms)
✔ proposeState carga: cuentas del jugador con datos, cuentas propias loading → loading (0.032791ms)
✔ proposeState carga y fallo de cada dato en su turno (0.043ms)
✔ proposeState fallo: horas propias failed → failed (0.026167ms)
✔ proposeState fallo: cuentas del jugador [] y horas propias failed → motivo 1 (0.024542ms)
✔ proposeState habilitado: los cuatro ready y cruce proponible → ready (0.039333ms)
✔ playerTabs: orden de GAME_IDS y sin repetidos (0.050375ms)
✔ resolveTab (0.076792ms)
✔ playerPageState (0.043917ms)
✔ isOwnPlayerRef (0.034667ms)
✔ zonesDiffer (0.022542ms)
✔ readNormalized (0.043875ms)
✔ readWinRate (0.033625ms)
✔ distanceView: 40 y 52 → value 12 (0.06525ms)
✔ distanceView: mismo valor → value 0; simulated se propaga (0.04025ms)
✔ distanceView: cuentas propias sin el juego → noOwnAccount aunque el resumen falle (0.036708ms)
✔ distanceView: sin currentRank en una → noData (0.333084ms)
✔ distanceView: cuentas propias failed → failed ownAccounts; loading (0.0295ms)
✔ distanceView: resumen loading → loading; resumen failed → failed summary (0.024583ms)
ℹ tests 40
ℹ suites 0
ℹ pass 40
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 182.9355
```

### 1.2 T2 — `formatRankGain`, `nextTabIndex`, `playerPath`, `isProtectedPath` y `resolveMockUserTarget` (2026-10-20)

RF-1, RF-2, RF-4, RF-11, RF-15, RF-17, RF-20, RNF-2. Casos del plan 6.1: `formatRankGain` (7,
0 → "▲ +0 pts desde la primera lectura", −5 con el signo comprobado por código de carácter
U+2212, `null` → `NO_DATA_TEXT` importado de `copy.ts`), `nextTabIndex`, `playerPath`
(con juego, `' me'` codificado, sin juego y sin `?`), `ROUTES.player` y `PLAYER_TAB_PARAM`,
`isProtectedPath('/jugadores/x')`, y `resolveMockUserTarget` (todos los de T2). 11 pruebas
de `node:test`.

Bandera: mismo gancho de 1.0 (copia en `<scratchpad>/t2/`), sin
`--experimental-transform-types`: `rankProgress.ts` → `@/shared/utils/copy` y `routes.ts` →
`lucide-react` (resuelto desde `frontend/node_modules`) + `import type` borrable.
`tabKeys.ts` y `mockUserTarget.ts` no tienen imports. Cada prueba importa su módulo dentro
de la prueba, para que el rojo de un módulo inexistente no tape el de los demás.

Script (`<scratchpad>/t2/check.mjs`):

```js
// Spec 008, T2: comprobaciones de formatRankGain, nextTabIndex, playerPath,
// isProtectedPath y resolveMockUserTarget (plan 6.1).
// Ejecución: TMU_SRC=<repo>/frontend/src node --import ./register.mjs --test check.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SRC = process.env.TMU_SRC;
const load = (rel) => import(pathToFileURL(path.join(SRC, rel)).href);

const MINUS = '−';
const SUFFIX = ' pts desde la primera lectura';

test('formatRankGain: 7 → "▲ +7 pts desde la primera lectura"', async () => {
  const { formatRankGain } = await load('domain/rankProgress.ts');
  assert.equal(formatRankGain(7), `▲ +7${SUFFIX}`);
});

test('formatRankGain: 0 → "▲ +0 pts desde la primera lectura"', async () => {
  const { formatRankGain } = await load('domain/rankProgress.ts');
  assert.equal(formatRankGain(0), `▲ +0${SUFFIX}`);
});

test('formatRankGain: −5 → "▼ −5 pts …" con U+2212', async () => {
  const { formatRankGain } = await load('domain/rankProgress.ts');
  const text = formatRankGain(-5);
  assert.equal(text, `▼ ${MINUS}5${SUFFIX}`);
  assert.equal(text.codePointAt(2), 0x2212);
  assert.ok(!text.includes('-'), 'sin guion-menos ASCII');
});

test('formatRankGain: null → NO_DATA_TEXT ("Sin datos") importado de copy.ts', async () => {
  const { formatRankGain } = await load('domain/rankProgress.ts');
  const { NO_DATA_TEXT } = await load('shared/utils/copy.ts');
  assert.equal(NO_DATA_TEXT, 'Sin datos');
  assert.equal(formatRankGain(null), NO_DATA_TEXT);
});

test('nextTabIndex: flechas circulares, Home, End y otra tecla', async () => {
  const { nextTabIndex } = await load('shared/utils/tabKeys.ts');
  assert.equal(nextTabIndex('ArrowRight', 2, 3), 0);
  assert.equal(nextTabIndex('ArrowRight', 0, 3), 1);
  assert.equal(nextTabIndex('ArrowLeft', 0, 3), 2);
  assert.equal(nextTabIndex('ArrowLeft', 2, 3), 1);
  assert.equal(nextTabIndex('Home', 2, 3), 0);
  assert.equal(nextTabIndex('End', 0, 3), 2);
  assert.equal(nextTabIndex('a', 1, 3), null);
});

test('playerPath: con juego, identificador codificado y sin juego', async () => {
  const { playerPath } = await load('app/routes.ts');
  assert.equal(playerPath('user-3', 'r6'), '/jugadores/user-3?juego=r6');
  assert.equal(playerPath(' me'), '/jugadores/%20me');
  assert.equal(playerPath(' me', 'lol'), '/jugadores/%20me?juego=lol');
  assert.equal(playerPath('user-3'), '/jugadores/user-3');
  assert.ok(!playerPath('user-3').includes('?'));
});

test('ROUTES.player y PLAYER_TAB_PARAM', async () => {
  const { ROUTES, PLAYER_TAB_PARAM } = await load('app/routes.ts');
  assert.equal(ROUTES.player, '/jugadores/:userId');
  assert.equal(PLAYER_TAB_PARAM, 'juego');
});

test('isProtectedPath: /jugadores/x protegida; las de la 007 siguen igual', async () => {
  const { isProtectedPath } = await load('app/routes.ts');
  assert.equal(isProtectedPath('/jugadores/x'), true);
  assert.equal(isProtectedPath('/perfil'), true);
  assert.equal(isProtectedPath('/login'), false);
  assert.equal(isProtectedPath('/'), false);
});

test('resolveMockUserTarget: forma user-<dígitos> sin distinguir mayúsculas', async () => {
  const { resolveMockUserTarget } = await load('services/mock/mockUserTarget.ts');
  assert.deepEqual(resolveMockUserTarget('USER-5', 'user-3'), { ok: true, id: 'user-5', own: false });
  assert.deepEqual(resolveMockUserTarget('user-999999', 'user-3'), { ok: true, id: 'user-999999', own: false });
  assert.deepEqual(resolveMockUserTarget('USER-999999', 'user-3'), { ok: true, id: 'user-999999', own: false });
});

test('resolveMockUserTarget: formas no válidas → { ok: false }', async () => {
  const { resolveMockUserTarget } = await load('services/mock/mockUserTarget.ts');
  for (const raw of ['abc', 'ME', ' me', 'user-', 'user-3 ']) {
    assert.deepEqual(resolveMockUserTarget(raw, 'user-3'), { ok: false }, raw);
  }
});

test('resolveMockUserTarget: "me" exacto y USER-3 con sesión user-3 → own', async () => {
  const { resolveMockUserTarget, MOCK_USER_ID_PATTERN } = await load('services/mock/mockUserTarget.ts');
  assert.deepEqual(resolveMockUserTarget('me', 'user-3'), { ok: true, id: 'user-3', own: true });
  assert.deepEqual(resolveMockUserTarget('USER-3', 'user-3'), { ok: true, id: 'user-3', own: true });
  assert.ok(MOCK_USER_ID_PATTERN instanceof RegExp);
  assert.equal(MOCK_USER_ID_PATTERN.source, '^user-[0-9]+$');
  assert.equal(MOCK_USER_ID_PATTERN.flags, 'i');
});
```

**Rojo** — `formatRankGain`, `playerPath`, `ROUTES.player`, `PLAYER_TAB_PARAM` y
`NO_DATA_TEXT` sin crear; `tabKeys.ts` y `mockUserTarget.ts` inexistentes
(`TMU_SRC=<repo>/frontend/src node --import ./register.mjs --test check.mjs`; trazas `at …`
omitidas):

```
✖ formatRankGain: 7 → "▲ +7 pts desde la primera lectura" (41.560542ms)
✖ formatRankGain: 0 → "▲ +0 pts desde la primera lectura" (0.329708ms)
✖ formatRankGain: −5 → "▼ −5 pts …" con U+2212 (0.252125ms)
✖ formatRankGain: null → NO_DATA_TEXT ("Sin datos") importado de copy.ts (2.090708ms)
✖ nextTabIndex: flechas circulares, Home, End y otra tecla (1.076334ms)
✖ playerPath: con juego, identificador codificado y sin juego (65.398375ms)
✖ ROUTES.player y PLAYER_TAB_PARAM (0.488083ms)
✖ isProtectedPath: /jugadores/x protegida; las de la 007 siguen igual (0.419459ms)
✖ resolveMockUserTarget: forma user-<dígitos> sin distinguir mayúsculas (0.521083ms)
✖ resolveMockUserTarget: formas no válidas → { ok: false } (0.396167ms)
✖ resolveMockUserTarget: "me" exacto y USER-3 con sesión user-3 → own (0.315042ms)
ℹ tests 11
ℹ suites 0
ℹ pass 0
ℹ fail 11
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 223.009292
✖ failing tests:
test at check.mjs:15:1
✖ formatRankGain: 7 → "▲ +7 pts desde la primera lectura" (41.560542ms)
  TypeError: formatRankGain is not a function
test at check.mjs:20:1
✖ formatRankGain: 0 → "▲ +0 pts desde la primera lectura" (0.329708ms)
  TypeError: formatRankGain is not a function
test at check.mjs:25:1
✖ formatRankGain: −5 → "▼ −5 pts …" con U+2212 (0.252125ms)
  TypeError: formatRankGain is not a function
test at check.mjs:33:1
✖ formatRankGain: null → NO_DATA_TEXT ("Sin datos") importado de copy.ts (2.090708ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + undefined
  - 'Sin datos'
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: 'Sin datos',
    operator: 'strictEqual',
    diff: 'simple'
  }
test at check.mjs:40:1
✖ nextTabIndex: flechas circulares, Home, End y otra tecla (1.076334ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repo>/frontend/src/shared/utils/tabKeys.ts' imported from <scratchpad>/t2/check.mjs
    code: 'ERR_MODULE_NOT_FOUND',
    url: 'file://<repo>/frontend/src/shared/utils/tabKeys.ts'
  }
test at check.mjs:51:1
✖ playerPath: con juego, identificador codificado y sin juego (65.398375ms)
  TypeError: playerPath is not a function
test at check.mjs:60:1
✖ ROUTES.player y PLAYER_TAB_PARAM (0.488083ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + undefined
  - '/jugadores/:userId'
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: '/jugadores/:userId',
    operator: 'strictEqual',
    diff: 'simple'
  }
test at check.mjs:66:1
✖ isProtectedPath: /jugadores/x protegida; las de la 007 siguen igual (0.419459ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  false !== true
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: 'strictEqual',
    diff: 'simple'
  }
test at check.mjs:74:1
✖ resolveMockUserTarget: forma user-<dígitos> sin distinguir mayúsculas (0.521083ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repo>/frontend/src/services/mock/mockUserTarget.ts' imported from <scratchpad>/t2/check.mjs
    code: 'ERR_MODULE_NOT_FOUND',
    url: 'file://<repo>/frontend/src/services/mock/mockUserTarget.ts'
  }
test at check.mjs:81:1
✖ resolveMockUserTarget: formas no válidas → { ok: false } (0.396167ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repo>/frontend/src/services/mock/mockUserTarget.ts' imported from <scratchpad>/t2/check.mjs
    code: 'ERR_MODULE_NOT_FOUND',
    url: 'file://<repo>/frontend/src/services/mock/mockUserTarget.ts'
  }
test at check.mjs:88:1
✖ resolveMockUserTarget: "me" exacto y USER-3 con sesión user-3 → own (0.315042ms)
  Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repo>/frontend/src/services/mock/mockUserTarget.ts' imported from <scratchpad>/t2/check.mjs
    code: 'ERR_MODULE_NOT_FOUND',
    url: 'file://<repo>/frontend/src/services/mock/mockUserTarget.ts'
  }
```

**Verde** (mismo comando, exit 0):

```
✔ formatRankGain: 7 → "▲ +7 pts desde la primera lectura" (43.921334ms)
✔ formatRankGain: 0 → "▲ +0 pts desde la primera lectura" (0.219292ms)
✔ formatRankGain: −5 → "▼ −5 pts …" con U+2212 (0.178708ms)
✔ formatRankGain: null → NO_DATA_TEXT ("Sin datos") importado de copy.ts (0.614708ms)
✔ nextTabIndex: flechas circulares, Home, End y otra tecla (0.667125ms)
✔ playerPath: con juego, identificador codificado y sin juego (64.475084ms)
✔ ROUTES.player y PLAYER_TAB_PARAM (0.250084ms)
✔ isProtectedPath: /jugadores/x protegida; las de la 007 siguen igual (0.287417ms)
✔ resolveMockUserTarget: forma user-<dígitos> sin distinguir mayúsculas (1.08175ms)
✔ resolveMockUserTarget: formas no válidas → { ok: false } (0.262167ms)
✔ resolveMockUserTarget: "me" exacto y USER-3 con sesión user-3 → own (0.193666ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 213.746458
```

### 1.3 T3 — contrato `users`, cliente HTTP y backend simulado (2026-10-20)

RF-11, RF-24, RNF-3. Comprobación previa del servidor (paso 1), sin cambios en `backend/`:

| Pieza del servidor | Lo que dice | Coincide con el plan 4.5 |
| --- | --- | --- |
| `domain/userId.ts` | `SELF_ALIAS = "me"` (texto exacto); `INVALID_ID_MESSAGE = "id con formato inválido"`; `resolveUserTarget` compara en minúsculas | sí |
| `services/userTarget.ts` | `USER_TARGET_MESSAGES.userNotFound = "usuario no encontrado"` | sí |
| `domain/accountRules.ts` | `ACCOUNT_ERRORS.invalidId` = `INVALID_ID_MESSAGE`; `invalidGame = "juego no válido"`; `noAccountForGame = "el jugador no tiene una cuenta vinculada en este juego"`; `parseAccountFilters`: `user` con `resolveUserTarget`, si no vale 400 `invalidId` | sí |
| `controllers/users.ts` `GET /:id` | 400 `target.error` → 404 `userNotFound` → 200 propio con correo (`toOwnUserJson`) o público sin correo (`toPublicUserJson`) | sí |
| `controllers/users.ts` `GET /:id/availability` | 400 → 404 `userNotFound` → 200 `[...availability]` | sí |
| `controllers/users.ts` `GET /:id/games/:gameId` | id (400 `invalidId`) → juego (400 `invalidGame`, `isGameId` con `Object.hasOwn`) → usuario (404 `userNotFound`) → cuenta (404 `noAccountForGame`) → 200 `{ account, recentMatches (8), winRate, trend }` | sí |
| `controllers/accounts.ts` `GET /` | filtros (400) → `find({ user })` ordenado por `_id`: usuario inexistente → 200 `[]` | sí |

En el mock, la tabla `MESSAGES` de `mockApi.ts` ya tiene `invalidId`, `userNotFound`,
`invalidGame` y `noAccountForGame` con esos textos (líneas 157, 166, 182 y 183): se reutilizan.

**Tabla de casos del mock** (escrita antes del script; sesión de la cuenta demo, `user-1`;
`user-2` es `nocturna`, con cuentas de LoL y CS2 y sin cuenta de R6, semilla 007 sin cambios).
"400 id" = 400 "id con formato inválido"; "404 usuario" = 404 "usuario no encontrado";
"400 juego" = 400 "juego no válido"; "404 cuenta" = 404 "el jugador no tiene una cuenta
vinculada en este juego".

| Operación | Entrada | Esperado |
| --- | --- | --- |
| `users.get` | `me` | 200, `id` `user-1`, con `email` (propio) |
| `users.get` | `user-1`, `USER-1` | 200, `id` `user-1`, con `email` (propio por identificador) |
| `users.get` | `user-2`, `USER-2` | 200, `id` `user-2`, **sin** `email` (y con `username`, `displayName`, `avatarColor`, `bio`, `timezone`, `createdAt`) |
| `users.get` | `user-999999`, `USER-999999` | 404 usuario |
| `users.get` | `abc`, `ME`, `' me'`, `user-` | 400 id |
| `users.listAccounts` | `me` | 200, las 3 cuentas de `user-1` en orden de creación (lol, r6, cs2) |
| `users.listAccounts` | `user-2`, `USER-2` | 200, las cuentas de `user-2` (lol, cs2), todas con `userId` `user-2` |
| `users.listAccounts` | `user-999999`, `USER-999999` | 200 `[]` |
| `users.listAccounts` | `abc`, `ME`, `' me'`, `user-` | 400 id |
| `users.getGameSummary` | (`abc`, `xyz`) | 400 id (el id va antes que el juego) |
| `users.getGameSummary` | (`user-999999`, `xyz`), (`user-2`, `LOL`) | 400 juego (el juego va antes que el usuario) |
| `users.getGameSummary` | (`user-999999`, `lol`), (`USER-999999`, `lol`) | 404 usuario (el usuario va antes que la cuenta) |
| `users.getGameSummary` | (`user-2`, `r6`) | 404 cuenta |
| `users.getGameSummary` | (`user-2`, `lol`), (`USER-2`, `lol`) | 200, `account.userId` `user-2` y `account.gameId` `lol`, `recentMatches` ≤ 8, `winRate` = porcentaje redondeado de victorias de esas partidas, `trend` numérico; ningún `email` en la respuesta |
| `users.getGameSummary` | (`me`, `lol`) | 200 igual que `profile.getGameSummary('lol')` (misma función interna) |
| `users.getGameSummary` | (`ME`, `lol`), (`' me'`, `lol`), (`user-`, `lol`) | 400 id |
| `profile.getAvailabilityOf` | `me` | 200, igual que `profile.getAvailability()` |
| `profile.getAvailabilityOf` | `user-2`, `USER-2` | 200, los mismos bloques en los dos casos |
| `profile.getAvailabilityOf` | `user-999999`, `USER-999999` | 404 usuario |
| `profile.getAvailabilityOf` | `abc`, `ME`, `' me'`, `user-` | 400 id |
| las cuatro | `user-2` (resumen con `lol`) sin sesión | 401 "sesión no iniciada" (pasan por `asUser` y `execute`) |

Cada error se comprueba como `ApiError` con `status` y `message` iguales a los de la tabla y
`hasMessage === true` (cuerpo crudo `{ error }` leído por `execute`).

Gancho y bandera (decisión del usuario Q1; P54): el `register.mjs` de 1.0 sin cambios y el
`hooks.mjs` de 1.0 con un gancho de carga añadido (`load`) que sustituye `import.meta.env` en
los archivos de `TMU_SRC` por un objeto con las variables del modo simulado (lo que hace Vite;
`VITE_MOCK_LATENCY` = `'0'` para no esperar 350 ms por llamada). `--experimental-transform-types`
obligatorio (`ApiError` de `transport.ts`). El script registra antes de importar un
`localStorage` en memoria en `globalThis`. **El módulo cargó** con el gancho y los
sustitutos, sin tocar el código para que cargue. 16 pruebas de `node:test` (los 45 casos de la
tabla, agrupados por operación y resultado).

Comando (desde `<scratchpad>/t3/`):
`TMU_SRC=<repo>/frontend/src node --experimental-transform-types --import ./register.mjs --test check.mjs`

`hooks.mjs` (T3; el `resolve` es el de 1.0, sin cambios):

```js
// Gancho de resolución de Node para cargar frontend/src/**/*.ts sin compilar (spec 008, T1;
// reescrito a partir de la descripción de specs/007-integrar-frontend/validation.md).
// - Resuelve el alias `@/` contra la variable de entorno TMU_SRC (= <repo>/frontend/src).
// - Añade `.ts` a los imports relativos (o del alias) sin extensión que no resuelven tal cual.
// T3 (decisión del usuario Q1): gancho de carga que sustituye `import.meta.env` en los
// archivos de TMU_SRC por un objeto con las variables del modo simulado (lo que hace Vite).
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = process.env.TMU_SRC;

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;
  if (specifier.startsWith('@/')) {
    if (!SRC) throw new Error('TMU_SRC no está definida (debe apuntar a frontend/src)');
    target = pathToFileURL(path.join(SRC, specifier.slice(2))).href;
  }
  const isPathLike =
    target !== specifier || target.startsWith('./') || target.startsWith('../') || target.startsWith('/');
  if (!isPathLike || path.extname(target) !== '') return nextResolve(target, context);
  try {
    return await nextResolve(target, context);
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' && error?.code !== 'ERR_UNSUPPORTED_DIR_IMPORT') throw error;
    return nextResolve(`${target}.ts`, context);
  }
}

// Variables del modo simulado (frontend/.env.example con VITE_USE_MOCK_API=true; latencia 0
// para que el script no espere 350 ms por llamada).
const MOCK_ENV = JSON.stringify({
  VITE_API_URL: '/api',
  VITE_USE_MOCK_API: 'true',
  VITE_MOCK_LATENCY: '0',
  MODE: 'development',
  DEV: true,
  PROD: false,
});

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  const srcUrl = SRC ? pathToFileURL(SRC).href : null;
  if (srcUrl === null || !url.startsWith(srcUrl) || result.source === undefined) return result;
  const text = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
  if (!text.includes('import.meta.env')) return result;
  return { ...result, source: text.replaceAll('import.meta.env', `(${MOCK_ENV})`) };
}
```

Script (`<scratchpad>/t3/check.mjs`):

```js
// Spec 008, T3: casos del backend simulado de la ficha (plan 4.5; validation.md, 1.3).
// Ejecución (desde este directorio):
//   TMU_SRC=<repo>/frontend/src node --experimental-transform-types --import ./register.mjs --test check.mjs
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Sustituto de localStorage (en memoria, en globalThis), registrado antes de importar mockApi.
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => void store.set(key, String(value)),
  removeItem: (key) => void store.delete(key),
  clear: () => store.clear(),
};

const SRC = process.env.TMU_SRC;
const load = (rel) => import(pathToFileURL(path.join(SRC, rel)).href);

const ID = [400, 'id con formato inválido'];
const USER = [404, 'usuario no encontrado'];
const GAME = [400, 'juego no válido'];
const ACCOUNT = [404, 'el jugador no tiene una cuenta vinculada en este juego'];
const NO_SESSION = [401, 'sesión no iniciada'];
const BAD_IDS = ['abc', 'ME', ' me', 'user-'];

let api;
let ApiError;

before(async () => {
  ({ mockApi: api } = await load('services/mock/mockApi.ts'));
  ({ ApiError } = await load('services/http/transport.ts'));
  await api.auth.login({ email: 'demo@teammatchup.gg', password: 'demo1234' });
});

/** Ejecuta la llamada y devuelve el cuerpo, o lanza si falla. */
const ok = (call) => call();

/** Comprueba que la llamada falla con `ApiError` de ese código y texto (cuerpo `{ error }`). */
async function rejects(call, [status, message], label) {
  let error;
  try {
    await call();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof ApiError, `${label}: se esperaba ApiError, llegó ${error}`);
  assert.equal(error.status, status, `${label}: código`);
  assert.equal(error.message, message, `${label}: texto`);
  assert.equal(error.hasMessage, true, `${label}: con mensaje del servidor`);
}

test('users.get: me, user-1 y USER-1 → propio con email', async () => {
  for (const raw of ['me', 'user-1', 'USER-1']) {
    const user = await ok(() => api.users.get(raw));
    assert.equal(user.id, 'user-1', raw);
    assert.equal(user.email, 'demo@teammatchup.gg', raw);
  }
});

test('users.get: user-2 y USER-2 → datos públicos sin email', async () => {
  for (const raw of ['user-2', 'USER-2']) {
    const user = await ok(() => api.users.get(raw));
    assert.equal(user.id, 'user-2', raw);
    assert.equal(Object.hasOwn(user, 'email'), false, `${raw}: sin email`);
    assert.deepEqual(
      Object.keys(user).sort(),
      ['avatarColor', 'bio', 'createdAt', 'displayName', 'id', 'timezone', 'username'],
      raw,
    );
  }
});

test('users.get: user-999999 y USER-999999 → 404 usuario no encontrado', async () => {
  for (const raw of ['user-999999', 'USER-999999']) await rejects(() => api.users.get(raw), USER, raw);
});

test('users.get: abc, ME, " me", user- → 400 id con formato inválido', async () => {
  for (const raw of BAD_IDS) await rejects(() => api.users.get(raw), ID, JSON.stringify(raw));
});

test('users.listAccounts: me → las 3 cuentas de user-1 en orden de creación', async () => {
  const accounts = await ok(() => api.users.listAccounts('me'));
  assert.deepEqual(accounts.map((a) => [a.userId, a.gameId]), [
    ['user-1', 'lol'],
    ['user-1', 'r6'],
    ['user-1', 'cs2'],
  ]);
});

test('users.listAccounts: user-2 y USER-2 → cuentas de user-2 (lol, cs2)', async () => {
  for (const raw of ['user-2', 'USER-2']) {
    const accounts = await ok(() => api.users.listAccounts(raw));
    assert.deepEqual(accounts.map((a) => [a.userId, a.gameId]), [
      ['user-2', 'lol'],
      ['user-2', 'cs2'],
    ], raw);
  }
});

test('users.listAccounts: user-999999 y USER-999999 → 200 []', async () => {
  for (const raw of ['user-999999', 'USER-999999']) {
    assert.deepEqual(await ok(() => api.users.listAccounts(raw)), [], raw);
  }
});

test('users.listAccounts: abc, ME, " me", user- → 400 id con formato inválido', async () => {
  for (const raw of BAD_IDS) await rejects(() => api.users.listAccounts(raw), ID, JSON.stringify(raw));
});

test('users.getGameSummary: orden id → juego → usuario → cuenta', async () => {
  await rejects(() => api.users.getGameSummary('abc', 'xyz'), ID, 'abc/xyz');
  await rejects(() => api.users.getGameSummary('user-999999', 'xyz'), GAME, 'user-999999/xyz');
  await rejects(() => api.users.getGameSummary('user-2', 'LOL'), GAME, 'user-2/LOL');
  await rejects(() => api.users.getGameSummary('user-999999', 'lol'), USER, 'user-999999/lol');
  await rejects(() => api.users.getGameSummary('USER-999999', 'lol'), USER, 'USER-999999/lol');
  await rejects(() => api.users.getGameSummary('user-2', 'r6'), ACCOUNT, 'user-2/r6');
});

test('users.getGameSummary: ME, " me", user- con lol → 400 id con formato inválido', async () => {
  for (const raw of ['ME', ' me', 'user-']) {
    await rejects(() => api.users.getGameSummary(raw, 'lol'), ID, JSON.stringify(raw));
  }
});

test('users.getGameSummary: user-2 y USER-2 con lol → 200, ≤ 8 partidas, sin email', async () => {
  for (const raw of ['user-2', 'USER-2']) {
    const summary = await ok(() => api.users.getGameSummary(raw, 'lol'));
    assert.equal(summary.account.userId, 'user-2', raw);
    assert.equal(summary.account.gameId, 'lol', raw);
    assert.ok(summary.recentMatches.length > 0 && summary.recentMatches.length <= 8, raw);
    const wins = summary.recentMatches.filter((m) => m.result === 'win').length;
    assert.equal(summary.winRate, Math.round((wins * 100) / summary.recentMatches.length), raw);
    assert.equal(typeof summary.trend, 'number', raw);
    assert.equal(JSON.stringify(summary).includes('"email"'), false, `${raw}: sin email`);
  }
});

test('users.getGameSummary: me con lol → igual que profile.getGameSummary', async () => {
  const own = await api.profile.getGameSummary('lol');
  assert.deepEqual(await ok(() => api.users.getGameSummary('me', 'lol')), own);
});

test('profile.getAvailabilityOf: me → igual que getAvailability; user-2 = USER-2', async () => {
  assert.deepEqual(await api.profile.getAvailabilityOf('me'), await api.profile.getAvailability());
  const lower = await api.profile.getAvailabilityOf('user-2');
  assert.ok(Array.isArray(lower) && lower.length > 0);
  assert.deepEqual(await ok(() => api.profile.getAvailabilityOf('USER-2')), lower);
});

test('profile.getAvailabilityOf: user-999999 y USER-999999 → 404 usuario no encontrado', async () => {
  for (const raw of ['user-999999', 'USER-999999']) {
    await rejects(() => api.profile.getAvailabilityOf(raw), USER, raw);
  }
});

test('profile.getAvailabilityOf: abc, ME, " me", user- → 400 id con formato inválido', async () => {
  for (const raw of BAD_IDS) {
    await rejects(() => api.profile.getAvailabilityOf(raw), ID, JSON.stringify(raw));
  }
});

test('las cuatro sin sesión → 401 sesión no iniciada (asUser + execute)', async () => {
  await api.auth.logout();
  await rejects(() => api.users.get('user-2'), NO_SESSION, 'users.get');
  await rejects(() => api.users.listAccounts('user-2'), NO_SESSION, 'users.listAccounts');
  await rejects(() => api.users.getGameSummary('user-2', 'lol'), NO_SESSION, 'users.getGameSummary');
  await rejects(() => api.profile.getAvailabilityOf('user-2'), NO_SESSION, 'getAvailabilityOf');
});
```

**Rojo** (antes de implementar, exit 1): `mockApi.users` no existe (`TypeError`) y el
`getAvailabilityOf` de la 007 da 400 con `USER-2` y `USER-999999` (su forma era
`/^user-[0-9A-Za-z-]+$/`, sensible a mayúsculas). Pasa solo el caso de 400 de
`getAvailabilityOf` (`abc`, `ME`, `' me'`, `user-` ya eran 400).

```
(node:676) ExperimentalWarning: Transform Types is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
✖ users.get: me, user-1 y USER-1 → propio con email (13.243333ms)
✖ users.get: user-2 y USER-2 → datos públicos sin email (0.741875ms)
✖ users.get: user-999999 y USER-999999 → 404 usuario no encontrado (0.282209ms)
✖ users.get: abc, ME, " me", user- → 400 id con formato inválido (0.095125ms)
✖ users.listAccounts: me → las 3 cuentas de user-1 en orden de creación (0.055583ms)
✖ users.listAccounts: user-2 y USER-2 → cuentas de user-2 (lol, cs2) (0.054208ms)
✖ users.listAccounts: user-999999 y USER-999999 → 200 [] (0.051791ms)
✖ users.listAccounts: abc, ME, " me", user- → 400 id con formato inválido (0.067917ms)
✖ users.getGameSummary: orden id → juego → usuario → cuenta (0.085917ms)
✖ users.getGameSummary: ME, " me", user- con lol → 400 id con formato inválido (0.124875ms)
✖ users.getGameSummary: user-2 y USER-2 con lol → 200, ≤ 8 partidas, sin email (0.058959ms)
✖ users.getGameSummary: me con lol → igual que profile.getGameSummary (2.561167ms)
✖ profile.getAvailabilityOf: me → igual que getAvailability; user-2 = USER-2 (5.895708ms)
✖ profile.getAvailabilityOf: user-999999 y USER-999999 → 404 usuario no encontrado (4.077125ms)
✔ profile.getAvailabilityOf: abc, ME, " me", user- → 400 id con formato inválido (5.332542ms)
✖ las cuatro sin sesión → 401 sesión no iniciada (asUser + execute) (0.380584ms)
ℹ tests 16
ℹ suites 0
ℹ pass 1
ℹ fail 15
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 228.694541

✖ failing tests:

test at check.mjs:54:1
✖ users.get: me, user-1 y USER-1 → propio con email (13.243333ms)
  TypeError: Cannot read properties of undefined (reading 'get')
      at file://<scratchpad>/t3/check.mjs:56:43
      at ok (file://<scratchpad>/t3/check.mjs:38:22)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:56:24)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async startSubtestAfterBootstrap (node:internal/test_runner/harness:387:3)

test at check.mjs:62:1
✖ users.get: user-2 y USER-2 → datos públicos sin email (0.741875ms)
  TypeError: Cannot read properties of undefined (reading 'get')
      at file://<scratchpad>/t3/check.mjs:64:43
      at ok (file://<scratchpad>/t3/check.mjs:38:22)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:64:24)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7)

test at check.mjs:75:1
✖ users.get: user-999999 y USER-999999 → 404 usuario no encontrado (0.282209ms)
  AssertionError [ERR_ASSERTION]: user-999999: se esperaba ApiError, llegó TypeError: Cannot read properties of undefined (reading 'get')
      at rejects (file://<scratchpad>/t3/check.mjs:48:10)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:76:59)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at check.mjs:79:1
✖ users.get: abc, ME, " me", user- → 400 id con formato inválido (0.095125ms)
  AssertionError [ERR_ASSERTION]: "abc": se esperaba ApiError, llegó TypeError: Cannot read properties of undefined (reading 'get')
      at rejects (file://<scratchpad>/t3/check.mjs:48:10)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:80:36)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at check.mjs:83:1
✖ users.listAccounts: me → las 3 cuentas de user-1 en orden de creación (0.055583ms)
  TypeError: Cannot read properties of undefined (reading 'listAccounts')
      at file://<scratchpad>/t3/check.mjs:84:45
      at ok (file://<scratchpad>/t3/check.mjs:38:22)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:84:26)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7)

test at check.mjs:92:1
✖ users.listAccounts: user-2 y USER-2 → cuentas de user-2 (lol, cs2) (0.054208ms)
  TypeError: Cannot read properties of undefined (reading 'listAccounts')
      at file://<scratchpad>/t3/check.mjs:94:47
      at ok (file://<scratchpad>/t3/check.mjs:38:22)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:94:28)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7)

test at check.mjs:102:1
✖ users.listAccounts: user-999999 y USER-999999 → 200 [] (0.051791ms)
  TypeError: Cannot read properties of undefined (reading 'listAccounts')
      at file://<scratchpad>/t3/check.mjs:104:47
      at ok (file://<scratchpad>/t3/check.mjs:38:22)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:104:28)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7)

test at check.mjs:108:1
✖ users.listAccounts: abc, ME, " me", user- → 400 id con formato inválido (0.067917ms)
  AssertionError [ERR_ASSERTION]: "abc": se esperaba ApiError, llegó TypeError: Cannot read properties of undefined (reading 'listAccounts')
      at rejects (file://<scratchpad>/t3/check.mjs:48:10)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:109:36)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at check.mjs:112:1
✖ users.getGameSummary: orden id → juego → usuario → cuenta (0.085917ms)
  AssertionError [ERR_ASSERTION]: abc/xyz: se esperaba ApiError, llegó TypeError: Cannot read properties of undefined (reading 'getGameSummary')
      at rejects (file://<scratchpad>/t3/check.mjs:48:10)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:113:9)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at check.mjs:121:1
✖ users.getGameSummary: ME, " me", user- con lol → 400 id con formato inválido (0.124875ms)
  AssertionError [ERR_ASSERTION]: "ME": se esperaba ApiError, llegó TypeError: Cannot read properties of undefined (reading 'getGameSummary')
      at rejects (file://<scratchpad>/t3/check.mjs:48:10)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:123:11)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at check.mjs:127:1
✖ users.getGameSummary: user-2 y USER-2 con lol → 200, ≤ 8 partidas, sin email (0.058959ms)
  TypeError: Cannot read properties of undefined (reading 'getGameSummary')
      at file://<scratchpad>/t3/check.mjs:129:46
      at ok (file://<scratchpad>/t3/check.mjs:38:22)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:129:27)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      at Test.run (node:internal/test_runner/test:1382:25)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7)

test at check.mjs:140:1
✖ users.getGameSummary: me con lol → igual que profile.getGameSummary (2.561167ms)
  TypeError: Cannot read properties of undefined (reading 'getGameSummary')
      at file://<scratchpad>/t3/check.mjs:142:45
      at ok (file://<scratchpad>/t3/check.mjs:38:22)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:142:26)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7)

test at check.mjs:145:1
✖ profile.getAvailabilityOf: me → igual que getAvailability; user-2 = USER-2 (5.895708ms)
  Error [ApiError]: id con formato inválido
      at execute (<repo>/frontend/src/services/http/transport.ts:161:9)
      at async protectedOperation (<repo>/frontend/src/services/mock/mockApi.ts:283:20)
      at async TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:149:20)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    status: 400,
    details: undefined,
    hasMessage: true
  }

test at check.mjs:152:1
✖ profile.getAvailabilityOf: user-999999 y USER-999999 → 404 usuario no encontrado (4.077125ms)
  AssertionError [ERR_ASSERTION]: USER-999999: código
  
  400 !== 404
  
      at rejects (file://<scratchpad>/t3/check.mjs:49:10)
      at async TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:154:5)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 400,
    expected: 404,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at check.mjs:164:1
✖ las cuatro sin sesión → 401 sesión no iniciada (asUser + execute) (0.380584ms)
  AssertionError [ERR_ASSERTION]: users.get: se esperaba ApiError, llegó TypeError: Cannot read properties of undefined (reading 'get')
      at rejects (file://<scratchpad>/t3/check.mjs:48:10)
      at TestContext.<anonymous> (file://<scratchpad>/t3/check.mjs:166:9)
      at async Test.run (node:internal/test_runner/test:1389:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:960:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }
```

**Verde** (tras implementar, mismo comando, exit 0):

```
(node:904) ExperimentalWarning: Transform Types is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
✔ users.get: me, user-1 y USER-1 → propio con email (18.150334ms)
✔ users.get: user-2 y USER-2 → datos públicos sin email (3.140292ms)
✔ users.get: user-999999 y USER-999999 → 404 usuario no encontrado (3.26425ms)
✔ users.get: abc, ME, " me", user- → 400 id con formato inválido (5.4065ms)
✔ users.listAccounts: me → las 3 cuentas de user-1 en orden de creación (1.564375ms)
✔ users.listAccounts: user-2 y USER-2 → cuentas de user-2 (lol, cs2) (2.803875ms)
✔ users.listAccounts: user-999999 y USER-999999 → 200 [] (1.573083ms)
✔ users.listAccounts: abc, ME, " me", user- → 400 id con formato inválido (5.507291ms)
✔ users.getGameSummary: orden id → juego → usuario → cuenta (8.428625ms)
✔ users.getGameSummary: ME, " me", user- con lol → 400 id con formato inválido (4.110583ms)
✔ users.getGameSummary: user-2 y USER-2 con lol → 200, ≤ 8 partidas, sin email (2.869291ms)
✔ users.getGameSummary: me con lol → igual que profile.getGameSummary (2.855417ms)
✔ profile.getAvailabilityOf: me → igual que getAvailability; user-2 = USER-2 (5.421333ms)
✔ profile.getAvailabilityOf: user-999999 y USER-999999 → 404 usuario no encontrado (2.722292ms)
✔ profile.getAvailabilityOf: abc, ME, " me", user- → 400 id con formato inválido (5.302666ms)
✔ las cuatro sin sesión → 401 sesión no iniciada (asUser + execute) (5.970833ms)
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 294.910917
```

## 2. Revisiones de código

### 2.1 T1 — `playerSheet.ts` puro y sin reimplementar (2026-10-20)

```
$ grep -n "^import" frontend/src/domain/playerSheet.ts
7:import { groupBlocks, intersectBlocks } from './availability';
8:import type { BlockRange } from './availability';
9:import { GAME_IDS } from './games';
10:import { rankDistance } from './matching';
11:import { blockReason, buildProposal } from './proposal';
12:import type { BlockReason, Proposal } from './proposal';
13:import type { GameId, TimeBlock } from './types';
$ grep -nE "react|fetch|Date|localStorage|sessionStorage|indexedDB|new Set|\.sort\(|Math\.abs|endHour|startHour|any\b|@ts-ignore| as " frontend/src/domain/playerSheet.ts
(sin coincidencias)
$ grep -nE "GAME_IDS\.includes|isGameId" frontend/src/domain/playerSheet.ts
(sin coincidencias)
```

Sin React, `fetch`, `Date` ni almacenamiento; sin intersección (`new Set`, `.sort`), agrupado
(`startHour`/`endHour`) ni distancia (`Math.abs`) propios: delega en `intersectBlocks`,
`groupBlocks`, `rankDistance`, `blockReason` y `buildProposal`. La pestaña se compara con
`GAME_IDS.find((gameId) => gameId === requested)` (P58), sin `as`.

Verificación estándar (T1): `cd frontend && npm run typecheck && npm run lint && npm run
build` en verde (exit 0). Antes del primer `build` hubo que ejecutar `npm install` en
`frontend/`: `node_modules` no tenía `@fontsource-variable/geist` ni `geist-mono`, que ya
estaban en `package.json` y `package-lock.json` (el lockfile no cambió; ninguna dependencia
nueva). `VITE_USE_MOCK_API=true` + Vite arranca sin errores en el terminal y sirve
`/src/main.tsx` y `/src/domain/playerSheet.ts` (200); T1 no tiene cambios visibles (ningún
componente importa aún `playerSheet.ts`), así que no se abrió el navegador.

### 2.2 T2 — sin imports, sin literal "Sin datos" y cabecera de `copy.ts` (2026-10-20)

```
$ grep -n "^import" frontend/src/shared/utils/tabKeys.ts frontend/src/services/mock/mockUserTarget.ts
(sin coincidencias; la palabra "imports" solo aparece en el comentario de cabecera de ambos)
$ grep -n "Sin datos" frontend/src/domain/rankProgress.ts
9: * `null` si la cuenta no trae historial: la interfaz muestra "Sin datos" (RF-14, caso
$ grep -n "^import\|NO_DATA_TEXT" frontend/src/domain/rankProgress.ts
4:import { NO_DATA_TEXT } from '@/shared/utils/copy';
25: * `null` → `NO_DATA_TEXT` (P62).
28:  if (gain === null) return NO_DATA_TEXT;
$ grep -n "NO_DATA_TEXT\|fijan las specs" frontend/src/shared/utils/copy.ts
2: * Textos literales que fijan las specs 007 y 008. Única fuente: ningún otro archivo los
13:export const NO_DATA_TEXT = 'Sin datos';
$ grep -nE "any|@ts-ignore| as |innerHTML" frontend/src/domain/rankProgress.ts frontend/src/shared/utils/tabKeys.ts frontend/src/services/mock/mockUserTarget.ts frontend/src/app/routes.ts
frontend/src/app/routes.ts:16:} as const;   (el `as const` de ROUTES, de la 007)
```

`tabKeys.ts` y `mockUserTarget.ts` no tienen ningún `import`. En `rankProgress.ts` "Sin datos"
solo queda en el comentario de la 007 (línea 9, no se cambia); `formatRankGain(null)`
devuelve `NO_DATA_TEXT`. `copy.ts` tiene `NO_DATA_TEXT` y la cabecera nueva. El signo de
"▼ −n" se escribe como `\u2212` en el código y el script lo comprueba con `codePointAt`.
`rankGainSinceFirst` no cambia (Pregunta 4); `RankScale` y los demás literales "Sin datos"
tampoco (T5 y T9).

Verificación estándar (T2): `npm run typecheck`, `npm run lint` y `npm run build` en
`frontend/`, exit 0 los tres. `VITE_USE_MOCK_API=true` + Vite arranca sin errores en el
terminal y sirve `/`, `/src/main.tsx`, `/src/app/routes.ts`, `/src/domain/rankProgress.ts`,
`/src/shared/utils/tabKeys.ts`, `/src/services/mock/mockUserTarget.ts` y `/jugadores/user-3`
(200). T2 no tiene cambios visibles (ningún componente usa aún estas piezas; la ruta no está
en el enrutador hasta T8), así que no se abrió el navegador.

### 2.3 T3 — codificación en `httpApi.ts` y todo por `execute` en el mock (2026-10-20)

```
$ grep -nF '/users/${' frontend/src/services/http/httpApi.ts
84:      request<TimeBlock[]>(`/users/${encodeURIComponent(userId)}/availability`),
94:    get: (userId: string) => request<PublicUser>(`/users/${encodeURIComponent(userId)}`),
101:        `/users/${encodeURIComponent(userId)}/games/${encodeURIComponent(gameId)}`,
$ grep -n "listAccounts" frontend/src/services/http/httpApi.ts
97:    listAccounts: (userId: string) => request<GameAccount[]>('/accounts', { query: { user: userId } }),
$ (mockApi.ts, bloques getAvailabilityOf y users) grep -nE "(get|listAccounts|getGameSummary|getAvailabilityOf): |protectedOperation|serve|execute|fetch"
    getAvailabilityOf: (userId: string) =>
      protectedOperation<TimeBlock[]>((user) => {
    get: (userId: string) =>
      protectedOperation<PublicUser>((user) => {
    listAccounts: (userId: string) =>
      protectedOperation<GameAccount[]>((user) => {
    getGameSummary: (userId: string, gameId: GameId) =>
      protectedOperation<GameProfileSummary>((user) => {
$ grep -n "^async function protectedOperation" -A1 frontend/src/services/mock/mockApi.ts
283:async function protectedOperation<T>(handle: (user: User) => Reply): Promise<T> {
284-  const { body } = await serve<T>(asUser(handle), true);
$ grep -n "function serve" -A1 frontend/src/services/mock/mockApi.ts
270:function serve<T>(handle: Handler, protectedCall: boolean) {
271-  return execute<T>(
$ grep -nE "\bany\b|@ts-ignore|innerHTML|\.only\(" (apiContract.ts, httpApi.ts, mockApi.ts)
(sin coincidencias)
$ git diff --stat -- backend frontend/src/services/mock/seed.ts
(sin cambios)
```

Las tres rutas con el identificador en el segmento (`users.get`, `users.getGameSummary` y
`profile.getAvailabilityOf` de la 007, que ya codificaba) usan `encodeURIComponent(userId)`;
`users.listAccounts` pasa `user` por la opción `query`, que lo codifica con
`URLSearchParams` (plan 4.5). Las cuatro operaciones del mock van por `protectedOperation` →
`serve` → `execute` (plazo de 30 s, 401) y responden crudo con `fail(status, error)` =
`{ error }`; los textos salen de `MESSAGES` (`invalidId`, `userNotFound`, `invalidGame`,
`noAccountForGame`) sin copias nuevas. `users.get` de otro jugador pasa por `toPublicUser` (sin
correo; el script lo comprueba por las claves). El resumen propio y el de otro jugador usan la
misma función interna `gameSummaryOf` (sacada del `getGameSummary` propio sin cambiar su
resultado; el script compara los dos con `me`). `USER_ID_SHAPE` (la forma vieja de
`getAvailabilityOf`) queda sin uso y se borra.

Verificación estándar (T3): `npm run typecheck`, `npm run lint` y `npm run build` en
`frontend/`, exit 0 los tres. `VITE_USE_MOCK_API=true` + Vite arranca sin errores en el
terminal y sirve `/`, `/src/main.tsx`, `/src/services/api.ts`, `/src/services/apiContract.ts`,
`/src/services/http/httpApi.ts`, `/src/services/mock/mockApi.ts` y
`/src/services/mock/mockUserTarget.ts` (200). T3 no tiene cambios visibles (ningún componente
usa aún `users.*`), así que no se abrió el navegador.

### 2.4 T4 — claves por visita, hooks de la ficha, pestaña en la dirección y RF-19 (2026-10-20)

Archivos: `frontend/src/app/providers/queryKeys.ts` (mod., `queryKeys.player.*`),
`frontend/src/features/players/hooks.ts`, `frontend/src/features/players/usePlayerTab.ts` y
`frontend/src/features/players/useSummaryRecheck.ts` (nuevos). T4 no tiene pruebas con Node
(son hooks de React; el "Hecho cuando" es esta revisión de código). Greps en `frontend/`:

```
$ grep -c "useQuery({" src/features/players/hooks.ts
6
$ grep -c "\.\.\.SHEET_QUERY_OPTIONS," src/features/players/hooks.ts
6
$ grep -n -A3 "const SHEET_QUERY_OPTIONS" src/features/players/hooks.ts
23:const SHEET_QUERY_OPTIONS = {
24-  staleTime: Infinity,
25-  refetchOnMount: false,
26-} as const;
$ grep -n "enabled:" src/features/players/hooks.ts
18: * P55: todas con `enabled: sessionUserId !== null && !own`. La condición de sesión es la de la
46:    enabled: sessionUserId !== null && !own,
57:    enabled: sessionUserId !== null && !own,
68:    enabled: sessionUserId !== null && !own,
84:    enabled: sessionUserId !== null && !own && tab !== null,
98:    enabled: sessionUserId !== null && !own,
109:    enabled: sessionUserId !== null && !own,
$ grep -rn "refetchInterval\|refetchOnWindowFocus\|refetchOnReconnect\|staleTime" src/features/players src/app/providers/queryClient.ts
src/features/players/hooks.ts:13: * RF-26: las 7 consultas usan una clave por visita, `staleTime: Infinity` y
src/features/players/hooks.ts:24:  staleTime: Infinity,
src/app/providers/queryClient.ts:8: * - `staleTime: 0`: los datos (cuentas de otros, coincidencias, sesiones) son
src/app/providers/queryClient.ts:17:      staleTime: 0,
src/app/providers/queryClient.ts:19:      refetchOnWindowFocus: false,
src/app/providers/queryClient.ts:20:      refetchOnReconnect: false,
$ grep -n "queryKey:" src/features/players/hooks.ts
43:    queryKey: queryKeys.player.user(sessionUserId, visit, id),
54:    queryKey: queryKeys.player.accounts(sessionUserId, visit, id),
65:    queryKey: queryKeys.player.availability(sessionUserId, visit, id),
81:    queryKey: queryKeys.player.summary(sessionUserId, visit, id, tab ?? 'lol'),
95:    queryKey: queryKeys.player.ownAccounts(sessionUserId, visit),
106:    queryKey: queryKeys.player.ownAvailability(sessionUserId, visit),
$ grep -n "'player'" src/app/providers/queryKeys.ts
30:   * `['u', sessionUserId, 'player', visit, …]`. `visit` es nueva en cada montaje de la
38:      ['u', userId, 'player', visit, 'them', id, 'user'] as const,
40:      ['u', userId, 'player', visit, 'them', id, 'accounts'] as const,
42:      ['u', userId, 'player', visit, 'them', id, 'availability'] as const,
44:      ['u', userId, 'player', visit, 'them', id, 'summary', gameId] as const,
46:      ['u', userId, 'player', visit, 'own', 'accounts'] as const,
48:      ['u', userId, 'player', visit, 'own', 'availability'] as const,
$ grep -n "404\|errorUpdatedAt\|handled\|Promise.all" src/features/players/useSummaryRecheck.ts
(líneas 7–16: comentario)
26:  const [handled, setHandled] = useState<ReadonlySet<string>>(() => new Set());
33:    errorStatusOf(summary.error) === 404
34:      ? `${tab}:${summary.errorUpdatedAt}`
36:  const pending = key !== null && !handled.has(key);
45:    void Promise.all([refetchUser(), refetchAccounts()]).finally(() => setRunning(false));
$ grep -n "accounts.state\|replace: true" src/features/players/usePlayerTab.ts
27:  const resolution = accounts.state === 'ready' ? resolveTab(accounts.value, requested) : null;
34:    setSearchParams(urlGame ? { [PLAYER_TAB_PARAM]: urlGame } : {}, { replace: true });
40:      setSearchParams({ [PLAYER_TAB_PARAM]: gameId }, { replace: true });
```

Conclusiones:
- **Cuántas consultas (RF-26).** El plan y las tareas hablan de "las 7 consultas", pero las
  claves de 3.6 y la composición de 3.7 enumeran seis (usuario, cuentas, disponibilidad y
  resumen del jugador; cuentas y disponibilidad propias), y el hook del resumen crea una
  consulta por pestaña vista. Se implementaron esas seis; ninguna falta. Las seis (`useQuery({`
  ×6) llevan `...SHEET_QUERY_OPTIONS` (×6) = `staleTime: Infinity` y `refetchOnMount: false`.
  `enabled` va después del objeto esparcido, así que no lo pisa.
- **Sin refresco automático (RF-26).** En `features/players` no hay `refetchInterval`,
  `refetchOnWindowFocus` ni `refetchOnReconnect`; los globales de la 007
  (`queryClient.ts`) siguen en `false`. El `staleTime: 0` global queda anulado por la opción
  de cada consulta de la ficha.
- **`enabled` (P55).** Las seis tienen `sessionUserId !== null && !own`, la condición de la
  corrección D-A2 de la T31 de la 007; el resumen además `tab !== null`.
- **Claves.** Las seis claves llevan `sessionUserId` en la posición 1 y `visit` en la 3, bajo
  `['u', sessionUserId, 'player', visit, …]`. `usePlayerVisit` usa
  `useState(() => ++visitCounter)`: visita nueva en cada montaje.
- **El resumen no se pide sin cuentas cargadas.** `usePlayerTab` devuelve `tab = null` mientras
  `accounts.state !== 'ready'` (línea 27), y `usePlayerSummary` requiere `tab !== null`
  (línea 84). Mientras se repiden (RF-19), `toLoadable` deja las cuentas en `ready` con los
  datos anteriores, así que las pestañas no cambian.
- **`useSummaryRecheck`.** La clave solo existe si el resumen está en error, sin estar
  pidiéndose y con `ApiError.status === 404` (líneas 30–35); cualquier otro estado (0, 400,
  500…) deja `key = null` y no hace nada (RF-18 normal). Cada error se atiende una vez:
  `handled` guarda `${tab}:${errorUpdatedAt}` antes de repedir, así que el mismo error no
  vuelve a activar el flujo. Si al terminar la pestaña sigue existiendo, el resumen sigue en
  error y `toLoadable` da `failed` con `errorStatus` 404: se muestra como error de RF-18 sin
  pedir nada más (Pregunta 3 del plan). `Promise.all` espera usuario y cuentas (P47).
  `rechecking` es `running || pending`: vale `true` ya en el render en que aparece el 404, no
  solo tras el efecto, así la sección nunca enseña el error un instante antes de repedir.
- **`toLoadable`.** `success` → `ready` (también durante un `refetch()`); `error` sin pedir →
  `failed` con `errorStatus = ApiError.status` (0 = sin respuesta → `failed`, RF-24); lo demás
  (pendiente, deshabilitada, "Reintentar" en curso) → `loading`.
- **Pestaña en la dirección.** `usePlayerTab` corrige con `replace: true` cuando
  `resolveTab` da `mustReplace` (quitando `juego` si no hay cuentas) y `selectTab` también
  usa `replace: true` (P13, P14).
- **Corrección posterior (P64, durante T8, 2026-10-20).** La ficha saliente sigue montada
  durante la animación de `AnimatePresence` de `AppLayout` y su efecto corregía la dirección de
  la página de destino (`/agenda?juego=lol`, perdiendo la propuesta; `/perfil?juego=lol`).
  `usePlayerTab` ahora solo corrige la dirección y `selectTab` solo actúa si
  `useMatch(ROUTES.player)` coincide. Re-verificado: el `check.mjs` de T6 completo (50/50) y el
  de T8 con la regresión de salida por el menú (27/27); detalle en 3.3.

Verificación estándar (T4): `npm run typecheck`, `npm run lint` y `npm run build` en
`frontend/`, exit 0 los tres. `VITE_USE_MOCK_API=true` + Vite arranca sin errores en el
terminal y sirve `/`, `/src/main.tsx`, `/src/app/providers/queryKeys.ts`,
`/src/features/players/hooks.ts`, `/src/features/players/usePlayerTab.ts` y
`/src/features/players/useSummaryRecheck.ts` (200). T4 no tiene cambios visibles (ninguna
página usa aún los hooks), así que no se abrió el navegador.

### 2.5 T5 — pestañas accesibles, `GameSummaryPanel` y "Sin datos" sin cambio visible (2026-10-20)

RF-4, RF-5, RF-16, RF-17, RF-27, RNF-1, RNF-2. Archivos: `shared/components/GameTabs.tsx`,
`features/profile/components/GameSummaryPanel.tsx` (nuevo), `features/profile/pages/ProfilePage.tsx`,
`features/profile/components/AccountRow.tsx`, `shared/components/RankScale.tsx`.

**Precondición.** `NO_DATA_TEXT = 'Sin datos'` existe en `frontend/src/shared/utils/copy.ts`
(línea 13, añadida en T2): se sigue.

#### Capturas antes y después

Método: no hay MCP de Chrome DevTools ni Playwright en el proyecto. Se usó el Chrome instalado
(`/Applications/Google Chrome.app`, 155.0.8059.85) en modo `--headless=new`, manejado por el
protocolo de DevTools (CDP) desde un script de Node 24 (WebSocket global), con un perfil de
navegador nuevo en cada toma. Servidor: `VITE_USE_MOCK_API=true npx vite --port 5191`. El
script entra con la cuenta demo (botón "rellenar" de `/login` y envío), y captura la página
completa de `/perfil` y `/coincidencias` a 1280 y 360 px de ancho (alto de ventana 900,
`deviceScaleFactor` 1), una captura por pestaña de juego (LoL, R6, CS2). Antes de cada captura
congela las animaciones (`document.getAnimations()`: las infinitas, del fondo, pausadas en su
tiempo 0; las finitas, terminadas); sin esto, dos tomas del **mismo** código salían distintas
en el fondo animado (hasta 60 747 px). Con la congelación, dos tomas seguidas del código sin
tocar dieron **todas iguales píxel a píxel** (comprobación de determinismo hecha antes de las
capturas oficiales). La comparación es píxel a píxel (decodificador PNG con `zlib`).

Variante "Sin datos" (para cubrir P62; los datos demo no tienen ningún "Sin datos"): solo en la
base simulada del navegador de captura (`localStorage['tmu.mock-db.v3']`, sin tocar código), la
cuenta LoL del demo queda con `currentRank: null` y `rankHistory: []` y la de R6 con
`rankHistory: []`; se captura el perfil (pestañas LoL y R6) a 1280 y 360 px. La tasa de
victorias no se puede dejar sin dato en el modo simulado (`winRateOf` devuelve siempre un
número), así que esa rama queda cubierta solo por revisión de código.

Archivos: `specs/008-ficha-de-jugador/validation/before/` y `validation/after/`, 16 PNG cada
una (`perfil-{1280,360}-{0,1,2}`, `coincidencias-{1280,360}-{0,1,2}`,
`sindatos-perfil-{1280,360}-{0,1}`) más el `outerHTML` del `tablist` del perfil y de
coincidencias (`*-tablist.html`).

Salida de la toma "antes" (código sin tocar) y de la toma "después" (idéntica en las dos):

```
tras login: /inicio
delta perfil: ["<span class=\"rank-scale__delta num\" data-up=\"true\">▲ +0 pts desde la primera lectura</span>"]
variante sin datos: ["account-user-1-lol:sin-rango","account-user-1-r6:sin-historial"]
textos r6 sin historial: ["<dd class=\"num\" style=\"color: rgb(62, 160, 200);\">Emerald II · 3836 MMR</dd>","<dd class=\"num\">LATAM</dd>","<dd class=\"num\">hace 2 horas</dd>","<span class=\"rank-scale__delta num\">Sin datos</span>","<p class=\"note note--faint\">Primera lectura: Sin datos</p>"]
textos lol sin rango: ["<dd class=\"num\" style=\"color: rgb(200, 150, 62);\">Sin datos</dd>","<dd class=\"num\">LAS</dd>","<dd class=\"num\">hace 3 horas</dd>","<p class=\"note note--faint\">Sin datos</p>"]
errores de consola: []
```

(Los únicos avisos de consola, filtrados, son los dos "React Router Future Flag Warning" de
siempre; ningún error ni excepción.) El perfil sigue mostrando "▲ +0 pts desde la primera
lectura" con una sola lectura (LoL demo, `data-up="true"`), y los cuatro "Sin datos" salen en
los mismos elementos y clases antes y después (`dd.num` con el color del juego, `span.rank-scale__delta.num`
sin `data-up`, `p.note.note--faint`).

Comparación `before` → `after`:

```
IGUAL   coincidencias-1280-0.png
IGUAL   coincidencias-1280-1.png
IGUAL   coincidencias-1280-2.png
IGUAL   coincidencias-360-0.png
IGUAL   coincidencias-360-1.png
IGUAL   coincidencias-360-2.png
IGUAL   perfil-1280-0.png
IGUAL   perfil-1280-1.png
DIFIERE perfil-1280-2.png: 44 px, caja x 357-363, y 984-991
IGUAL   perfil-360-0.png
IGUAL   perfil-360-1.png
IGUAL   perfil-360-2.png
IGUAL   sindatos-perfil-1280-0.png
IGUAL   sindatos-perfil-1280-1.png
IGUAL   sindatos-perfil-360-0.png
IGUAL   sindatos-perfil-360-1.png
RESULTADO: hay diferencias
marcado igual perfil-tablist.html
marcado igual coincidencias-tablist.html
```

**Diferencia anotada (una; se esperaba ninguna).** `perfil-1280-2` (CS2, 1280 px): 44 píxeles
en un recuadro de 7 × 8 px, dentro de "▲ +0 pts desde la primera lectura". Ampliada, es el
suavizado (antialiasing) del glifo "p" de "primera": mismo texto, misma posición, mismo
elemento y misma clase; a tamaño real no se distingue. Causa: antes el texto eran tres nodos
(`'▲ +'`, `0`, `' pts desde la primera lectura'`) y ahora es uno solo (`formatRankGain`, P41),
así que el navegador coloca la tira con otra fracción de píxel. Es determinista (una segunda
toma "después" sale igual píxel a píxel a la primera) y no aparece en LoL, R6 ni a 360 px.
No se considera cambio visible; queda a criterio del revisor.

#### Revisión de código

- **`GameTabs` sin `idBase`/`panelId`.** Las props nuevas solo se esparcen si llegan las dos
  (`accessible`); `ref` no se refleja en el DOM. El `outerHTML` del `tablist` del perfil y de
  coincidencias es idéntico antes y después (comparación con `cmp`).
- **`GameTabs` con `idBase` y `panelId`** (plan 4.3): `id={idBase}-tab-{juego}`,
  `aria-controls={panelId}`, `aria-selected`, `tabIndex` 0 en la elegida y −1 en las demás;
  `onKeyDown` → `nextTabIndex(key, índice, n)`; si no es `null`, `preventDefault`,
  `onChange(games[i])` y foco en esa pestaña (activación automática). Ninguna página lo usa
  aún (la ficha llega en T6): su comportamiento con teclado se comprueba en T6/T10.
- **`GameSummaryPanel`.** Es el bloque `ficha__game` de `ProfilePage` movido sin cambiar
  elementos ni clases. `MutationNotice` solo con `onSync` (en el perfil siempre lo hay y sin
  error no pinta nada). Sin `onSync`, `AccountRow` no dibuja botones ni la nota de
  resincronizar. `hasRank = currentRank != null && readNormalized(summary.account) !== null`:
  sin él no se dibuja `RankScale`, que es quien llama a `rankGainSinceFirst`, así que **el panel
  no provoca la llamada a `rankGainSinceFirst` cuando `readNormalized` es `null`** (P52); con
  rango pero sin historial, `rankGainSinceFirst` da `null` y `formatRankGain(null)` →
  `NO_DATA_TEXT` (comprobado en la captura `sindatos-perfil-*-1`). Tasa de victorias con
  `readWinRate`; `null` → `NO_DATA_TEXT` en `span.ficha__winrate`. La Etiqueta (`DemoTag`) sigue
  en los mismos sitios: `AccountRow`, junto al número de lecturas y en `MatchLedger`.
- **`rankGainSinceFirst` no cambia.** `git diff src/domain/rankProgress.ts`: solo las líneas
  que añadió T2 (`import { NO_DATA_TEXT }` y `formatRankGain` tras la línea 16); el cuerpo de
  `rankGainSinceFirst` no tiene cambios.
- **`RankScale`.** Un solo `<span className="rank-scale__delta num">` con
  `data-up={(delta !== null && delta >= 0) || undefined}` y `{formatRankGain(delta)}`.
- **`AccountRow`.** `showHandleLabel` (por defecto `false`) antepone `GAMES[g].handleLabel` +
  `" · "` al identificador en el mismo `<p className="note note--faint">`.

`grep -n "Sin datos"` en los cuatro archivos:

```
features/profile/components/GameSummaryPanel.tsx:40:  // llegara una no se muestra ni se calcula ningún valor derivado: aparece "Sin datos".
features/profile/components/AccountRow.tsx:38:  // se muestra "Sin datos" y ningún valor derivado.
```

Solo comentarios (`ProfilePage.tsx` y `RankScale.tsx`: ninguno). `NO_DATA_TEXT` se importa en
`AccountRow.tsx` (línea 7; uso en 68) y `GameSummaryPanel.tsx` (línea 9; usos en 87, 91 y 105).
El comentario "Defensivo (RF-14)…" de `ProfilePage.tsx` (antes líneas 59-60) se movió **sin
cambiar su texto** a `GameSummaryPanel.tsx` junto con las variables a las que acompaña.

Verificación estándar (T5): en `frontend/`, `npm run typecheck`, `npm run lint` y
`npm run build`, exit 0 los tres; `npx tsc -p tsconfig.app.json --noEmit`, exit 0. Modo
simulado arrancado sin errores de consola (salida de arriba).

Hallazgo (fuera de T5, sin tocar): `npm run typecheck` (`tsc --noEmit`) no comprueba nada,
porque `tsconfig.json` tiene `"files": []` y solo `references`; la comprobación real de tipos
la hace `tsc -b` dentro de `npm run build`. En T5 un import de tipo equivocado pasó
`typecheck` y lo detectó `build`. Hallazgo previo, también fuera de T5: a 360 px el perfil
mide 522–550 px de ancho (desbordamiento horizontal) y coincidencias 361 px, igual antes y
después; corresponde a T10 (RNF-5) o a un cambio aparte.

<details>
<summary>Script de capturas (<code>shoot.mjs</code>, scratchpad, no versionado)</summary>

```js
// Capturas del perfil y de coincidencias en modo simulado (spec 008, T5).
// Uso: node shoot.mjs <outDir> [baseUrl]
// Lanza Chrome headless con un perfil nuevo, entra con la cuenta demo y captura página completa
// a 1280 y 360 px, una por pestaña de juego. Registra errores de consola.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.argv[2]);
const BASE = process.argv[3] ?? 'http://localhost:5191';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const PROFILE = path.join(path.dirname(new URL(import.meta.url).pathname), 'chrome-profile');
mkdirSync(OUT, { recursive: true });
rmSync(PROFILE, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb',
  'about:blank',
], { stdio: 'ignore' });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 160; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
  } catch { /* aún arrancando */ }
  await wait(250);
}
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let id = 0;
const pending = new Map();
const consoleErrors = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    consoleErrors.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
  } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    consoleErrors.push(`log: ${msg.params.entry.text} ${msg.params.entry.url ?? ''}`);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  pending.set(n, { resolve, reject });
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

async function setWidth(width) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
}
async function go(url) {
  await send('Page.navigate', { url });
  await wait(2500);
}
async function shot(name) {
  // Congela las animaciones para que dos tomas del mismo código sean iguales: las infinitas
  // (fondo) en su tiempo 0 y pausadas; las finitas, terminadas.
  await evaluate(`(() => {
    for (const a of document.getAnimations()) {
      const t = a.effect?.getComputedTiming?.();
      if (t && t.iterations === Infinity) { a.pause(); a.currentTime = 0; } else { try { a.finish(); } catch {} }
    }
    return true;
  })()`);
  await wait(300);
  const { cssContentSize } = await send('Page.getLayoutMetrics');
  const { data } = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: cssContentSize.width, height: Math.ceil(cssContentSize.height), scale: 1 },
  });
  writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
  console.log('captura', name, Math.round(cssContentSize.width), 'x', Math.ceil(cssContentSize.height));
}

// Entrada con la cuenta demo (botón que rellena el formulario y envío).
await setWidth(1280);
await go(`${BASE}/login`);
await evaluate(`(() => {
  const demo = [...document.querySelectorAll('.access__demo button')][0];
  demo.click();
  return true;
})()`);
await wait(300);
await evaluate(`document.querySelector('button[type=submit]').click()`);
await wait(2500);
console.log('tras login:', await evaluate('location.pathname'));

const pages = [
  { name: 'perfil', url: '/perfil' },
  { name: 'coincidencias', url: '/coincidencias' },
];
for (const width of [1280, 360]) {
  await setWidth(width);
  for (const p of pages) {
    await go(`${BASE}${p.url}`);
    const tabs = await evaluate(`[...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.trim())`);
    await shot(`${p.name}-${width}-0`);
    for (let i = 1; i < tabs.length; i++) {
      await evaluate(`document.querySelectorAll('[role=tab]')[${i}].click()`);
      await wait(2500);
      await shot(`${p.name}-${width}-${i}`);
    }
    // Volver a la primera pestaña para que el estado de partida sea el mismo en la siguiente anchura.
    if (tabs.length > 1) { await evaluate(`document.querySelectorAll('[role=tab]')[0].click()`); await wait(800); }
    console.log(p.name, width, 'pestañas:', JSON.stringify(tabs));
  }
}

// Marcado de las pestañas del perfil y textos de la escala (para comparar antes/después).
await setWidth(1280);
await go(`${BASE}/perfil`);
const markup = await evaluate(`document.querySelector('[role=tablist]').outerHTML`);
const deltas = await evaluate(`[...document.querySelectorAll('.rank-scale__delta')].map((e) => e.outerHTML)`);
writeFileSync(path.join(OUT, 'perfil-tablist.html'), markup);
console.log('delta perfil:', JSON.stringify(deltas));
await go(`${BASE}/coincidencias`);
const mMarkup = await evaluate(`document.querySelector('[role=tablist]')?.outerHTML ?? ''`);
writeFileSync(path.join(OUT, 'coincidencias-tablist.html'), mMarkup);

// Variante "Sin datos": solo en la base simulada de este navegador de captura (no en el código).
// LoL: sin rango vigente ni historial (RF-14 defensivo). R6: rango vigente sin historial.
const changed = await evaluate(`(() => {
  const key = 'tmu.mock-db.v3';
  const db = JSON.parse(localStorage.getItem(key));
  const uid = db.session.userId;
  const out = [];
  for (const a of db.accounts) {
    if (a.userId !== uid) continue;
    if (a.gameId === 'lol') { a.currentRank = null; a.rankHistory = []; out.push(a.id + ':sin-rango'); }
    if (a.gameId === 'r6') { a.rankHistory = []; out.push(a.id + ':sin-historial'); }
  }
  localStorage.setItem(key, JSON.stringify(db));
  return out;
})()`);
console.log('variante sin datos:', JSON.stringify(changed));
for (const width of [1280, 360]) {
  await setWidth(width);
  await go(`${BASE}/perfil`);
  const n = await evaluate(`document.querySelectorAll('[role=tab]').length`);
  await shot(`sindatos-perfil-${width}-0`);
  for (let i = 1; i < Math.min(n, 2); i++) {
    await evaluate(`document.querySelectorAll('[role=tab]')[${i}].click()`);
    await wait(2500);
    await shot(`sindatos-perfil-${width}-${i}`);
  }
  if (width === 1280) {
    const texts = await evaluate(`[...document.querySelectorAll('.account__entries dd.num, .ficha__scale p, .rank-scale__delta')].map((e) => e.outerHTML)`);
    console.log('textos r6 sin historial:', JSON.stringify(texts));
    await evaluate(`document.querySelectorAll('[role=tab]')[0].click()`);
    await wait(2000);
    const t0 = await evaluate(`[...document.querySelectorAll('.account__entries dd.num, .ficha__scale p, .rank-scale__delta')].map((e) => e.outerHTML)`);
    console.log('textos lol sin rango:', JSON.stringify(t0));
  }
}

console.log('errores de consola:', consoleErrors.length ? consoleErrors.filter((e) => !e.includes('React Router Future Flag')) : 'ninguno');
ws.close();
chrome.kill();
```

</details>

<details>
<summary>Script de comparación (<code>diff.mjs</code>, scratchpad, no versionado)</summary>

```js
// Comparación de píxeles entre dos carpetas de capturas PNG (RGBA/RGB 8 bits, sin entrelazado).
// Uso: node diff.mjs <dirA> <dirB> [diffOutDir]
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import path from 'node:path';

function decode(file) {
  const buf = readFileSync(file);
  let pos = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[x] = (line[x] + p) & 255;
    }
    for (let x = 0; x < width; x++) {
      for (let k = 0; k < 3; k++) out[(y * width + x) * 4 + k] = line[x * bpp + k];
      out[(y * width + x) * 4 + 3] = bpp === 4 ? line[x * bpp + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data: out };
}

function crcTable() { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; }
const CRC = crcTable();
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); }
function encode(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const [A, B, OUT] = process.argv.slice(2);
if (OUT) mkdirSync(OUT, { recursive: true });
let allSame = true;
for (const name of readdirSync(A).filter((f) => f.endsWith('.png')).sort()) {
  const fb = path.join(B, name);
  if (!existsSync(fb)) { console.log(`FALTA   ${name}`); allSame = false; continue; }
  const a = decode(path.join(A, name)), b = decode(fb);
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`TAMAÑO  ${name}: ${a.width}x${a.height} vs ${b.width}x${b.height}`); allSame = false; continue;
  }
  let diff = 0, minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  const mask = Buffer.from(a.data);
  for (let i = 0; i < a.width * a.height; i++) {
    const o = i * 4;
    if (a.data[o] !== b.data[o] || a.data[o + 1] !== b.data[o + 1] || a.data[o + 2] !== b.data[o + 2]) {
      diff++; const x = i % a.width, y = (i / a.width) | 0;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      mask[o] = 255; mask[o + 1] = 0; mask[o + 2] = 255; mask[o + 3] = 255;
    }
  }
  if (diff === 0) console.log(`IGUAL   ${name}`);
  else {
    allSame = false;
    console.log(`DIFIERE ${name}: ${diff} px, caja x ${minX}-${maxX}, y ${minY}-${maxY}`);
    if (OUT) writeFileSync(path.join(OUT, name), encode(a.width, a.height, mask));
  }
}
console.log(allSame ? 'RESULTADO: todas iguales píxel a píxel' : 'RESULTADO: hay diferencias');
```

</details>

## 3. Modo simulado

(T2 a T10.)

### 3.1 T6 — página de la ficha: ruta, ficha propia, encabezado, estado de página y sección de juegos (2026-10-20)

RF-1, RF-3, RF-4, RF-5, RF-6 (solo la constante de P59), RF-8, RF-9, RF-10, RF-15, RF-16,
RF-18, RF-19, RF-20, RF-24, RNF-1, RNF-3, RNF-5. Archivos: `app/router.tsx`,
`features/players/pages/PlayerPage.tsx` (nuevo), `features/players/pages/playerPage.css`
(nuevo), `features/players/components/PlayerHeader.tsx` (nuevo),
`features/players/components/PlayerGamesSection.tsx` (nuevo), `shared/utils/copy.ts`.

**Método.** Igual que T5 (sección 2.5): Chrome instalado en `--headless=new` manejado por CDP
desde Node 24, perfil nuevo por navegador, cuenta demo (`user-1`). Servidor de desarrollo
`VITE_USE_MOCK_API=true npx vite --port 5191`; para la red lenta, la construcción con modo
simulado servida con `vite preview` (`--port 5192`), con `Network.emulateNetworkConditions`
(latencia 2000 ms, 400 kbit/s de bajada y subida, caché desactivada). Variaciones de datos
(jugador con los tres juegos creados al revés, nombre de 40 caracteres y biografía larga sin
espacios, jugador sin cuentas, cuenta que desaparece con la ficha abierta) solo en la base
simulada del navegador de captura (`localStorage['tmu.mock-db.v3']`), sin tocar código. Scripts
`cdp.mjs` y `check.mjs` en el scratchpad (no versionados), pegados abajo.

**Salida de `node check.mjs` (50/50):**

```
OK    encabezado: nombre, @usuario, zona, alta y biografía — "IC\nIsidora Campos\n\n@nocturna · America/Santiago · se inscribió hace 6 meses\n\nJuego después de las 22:00, sin excepción."
OK    encabezado sin correo ni totales ni "Editar ficha"
OK    título del documento = nombre visible — Isidora Campos · TeamMatchUp
OK    pestañas de user-2 en orden LoL, CS2 — ["League of Legends","Counter-Strike 2"]
OK    dirección corregida a ?juego=lol (pestaña inicial) con replace — ["about:blank","http://localhost:5191/inicio","http://localhost:5191/jugadores/user-2?juego=lol"]
OK    panel: rango vigente, región, verificada, última lectura
OK    panel: escala, lecturas, primera lectura y diferencia
OK    panel: últimas partidas y tasa de victorias
OK    panel: identificador con su etiqueta (Riot ID) — Riot ID · Nocturna#038
OK    panel: Etiqueta de datos simulados
OK    panel sin acciones (sin Resincronizar ni Desvincular)
OK    aviso global de datos simulados en barra/pie
OK    patrón de pestañas: ids, aria-controls, tabIndex itinerante, panel enlazado — {"label":"Juegos del jugador","tabs":[["player-games-tab-lol","player-games-panel","true",0],["player-games-tab-cs2","player-games-panel","false",-1]],"panel":["player-games-panel","player-games-tab-lol",0]}
OK    cambiar de pestaña no recarga la página
OK    cambiar de pestaña deja ?juego=cs2 sin entrada nueva — 3 → 3
OK    CS2: identificador con etiqueta SteamID64
OK    teclado: Inicio y flecha derecha eligen y enfocan la pestaña — player-games-tab-lol, player-games-tab-cs2
OK    teclado: sin entradas nuevas en el historial
OK    user-10: pestañas R6, CS2 y ?juego=cs2 respetado — ["Rainbow Six Siege","Counter-Strike 2"]
OK    R6: identificador con etiqueta Ubisoft ID y escala
OK    "Atrás" tras cambiar de pestaña sale de la ficha — http://localhost:5191/coincidencias
OK    ?juego=xyz (valor inventado) → ?juego=lol con replace — ["http://localhost:5191/coincidencias","http://localhost:5191/jugadores/user-2?juego=lol"]
OK    ?juego=r6 (juego sin cuenta) → ?juego=lol con replace — ["http://localhost:5191/coincidencias","http://localhost:5191/jugadores/user-2?juego=lol"]
OK    ?juego=LOL (mayúsculas) → ?juego=lol con replace — ["http://localhost:5191/coincidencias","http://localhost:5191/jugadores/user-2?juego=lol"]
OK    ?juego=constructor (propiedad heredada) → ?juego=lol con replace — ["http://localhost:5191/coincidencias","http://localhost:5191/jugadores/user-2?juego=lol"]
OK    USER-7 abre la ficha de user-7 (Antonia Herrera, R6) — http://localhost:5191/jugadores/USER-7?juego=r6
OK    /jugadores/me → /perfil y "Atrás" vuelve a coincidencias — ["http://localhost:5191/coincidencias","http://localhost:5191/perfil"]
OK    /jugadores/user-1 → /perfil y "Atrás" vuelve a coincidencias — ["http://localhost:5191/coincidencias","http://localhost:5191/perfil"]
OK    /jugadores/USER-1 → /perfil y "Atrás" vuelve a coincidencias — ["http://localhost:5191/coincidencias","http://localhost:5191/perfil"]
OK    /jugadores/User-1 → /perfil y "Atrás" vuelve a coincidencias — ["http://localhost:5191/coincidencias","http://localhost:5191/perfil"]
OK    tres juegos creados en orden CS2, LoL, R6 → pestañas LoL, R6, CS2 — ["League of Legends","Rainbow Six Siege","Counter-Strike 2"]
OK    360 px, pestaña lol: sin desplazamiento horizontal — scrollWidth − clientWidth = 0
OK    360 px, pestaña r6: sin desplazamiento horizontal — scrollWidth − clientWidth = 0
OK    360 px, pestaña cs2: sin desplazamiento horizontal — scrollWidth − clientWidth = 0
OK    360 px, nombre de 40 caracteres y biografía larga sin espacios: sin desplazamiento horizontal — 0
OK    biografía "<b>x</b>" se ve literal (sin HTML)
OK    360 px, "Este jugador no existe" (user-999999): sin desplazamiento horizontal
OK    360 px, "Este jugador no existe" (abc): sin desplazamiento horizontal
OK    RF-10: sin cuentas → "Este jugador no ha vinculado ningún juego", sin pestañas
OK    RF-10: la dirección queda sin juego (replace) — ["http://localhost:5191/coincidencias","http://localhost:5191/jugadores/user-4"]
OK    360 px, RF-10: sin desplazamiento horizontal
OK    RF-19: 404 del resumen → repide, quita R6 y vuelve a CS2 con replace — estados del panel: carga → datos
OK    RF-19: el panel nunca muestra error durante la comprobación
OK    3G lenta, user-999999: "Este jugador no existe" sin un instante de "Este jugador no ha vinculado ningún juego" — secuencia: Cargando los datos para proponer una sesión… → Este jugador no existe (15780 ms)
OK    3G lenta, abc: "Este jugador no existe" sin un instante de "Este jugador no ha vinculado ningún juego" — secuencia: Cargando los datos para proponer una sesión… → Este jugador no existe (15984 ms)
OK    3G lenta, ME: "Este jugador no existe" sin un instante de "Este jugador no ha vinculado ningún juego" — secuencia: Cargando los datos para proponer una sesión… → Este jugador no existe (15726 ms)
OK    3G lenta, USER-999999: "Este jugador no existe" sin un instante de "Este jugador no ha vinculado ningún juego" — secuencia: Cargando los datos para proponer una sesión… → Este jugador no existe (15819 ms)
OK    sin sesión: la ficha lleva a login
OK    tras login vuelve a la ficha, en la pestaña inicial (?juego=lol) — http://localhost:5191/jugadores/user-2?juego=lol
avisos del cliente HMR de Vite (bfcache), excluidos: 5
OK    sin errores de consola (salvo los avisos de React Router de siempre) — []
RESUMEN: 50/50 OK
```

**Notas sobre la salida.**
- La red lenta afecta a la carga del código; el backend simulado responde dentro del navegador
  (350 ms, sin red), así que el orden entre "obtener el usuario" (404/400) y "listar cuentas"
  (200 `[]`) lo decide su latencia, no la red. El observador (`MutationObserver` instalado antes
  de cada documento) registró la secuencia completa de textos: carga ("Cargando los datos para
  proponer una sesión…") y luego "Este jugador no existe", nunca "Este jugador no ha vinculado
  ningún juego". El caso con el servidor real y red lenta queda para T10.
- Los 5 avisos excluidos son del cliente HMR de Vite (`WebSocket ... Page entered
  Back-Forward Cache`) al volver con "Atrás" en el servidor de desarrollo; no son de la app.
  Los otros avisos filtrados son los "React Router Future Flag Warning" de siempre.
- **360 px.** La primera ejecución dio desplazamiento horizontal en la ficha (99 a 181 px): el
  riel del marcador de `RankScale` (`.rank-scale__rail`) se mueve con `transform` y su caja
  sobresale a la derecha de la regla. Es el mismo origen que el desbordamiento del perfil
  anotado en T5. Se corrigió **solo en la ficha** con `overflow-x: clip` en el panel
  (`.player-panel`, `playerPage.css`); el perfil sigue igual (T10 o cambio aparte). Con eso,
  0 px en LoL, R6 y CS2, con nombres largos, en "Este jugador no existe" y en RF-10. La
  lista de pestañas, si no cabe, se desplaza dentro de su propia cápsula (`.tabs`, ya existente).

**No comprobado en pantalla (y por qué).**
- `failed` del usuario en toda la ficha con "Reintentar" y errores de sección (RF-18, RF-24): el
  backend simulado no produce 5xx y una latencia simulada de más de 30 s también haría fallar el
  inicio de sesión. Cubierto por revisión de código (abajo); con el servidor real, en T10
  (servidor apagado y latencia de 40 s).
- El 404 que queda tras RF-19 cuando la pestaña sigue existiendo (Pregunta 3): necesita que la
  cuenta vuelva entre el 404 y el repedido; revisión de código.
- Lector de pantalla (NVDA) y contraste: T10.

**Revisión de código.**
- `PlayerPage`: `isOwnPlayerRef(rawId, user.id)` → `<Navigate to="/perfil" replace />` en el
  componente exterior, antes de montar `PlayerSheet`, que es el único que llama a los hooks de
  consultas (ninguna petición para la ficha propia). `key={rawId}`: otro jugador es otra visita.
- `playerPageState(toLoadable(userQuery))`: `notFound` → `Blank` "Este jugador no existe" con
  enlace "Ir a coincidencias"; `failed` → `Failure` con el error del usuario y "Reintentar" =
  `userQuery.refetch()` (mientras reintenta, `toLoadable` da `loading` y vuelve la carga);
  `loading` → las tres secciones con esqueleto y "Proponer sesión" con `aria-disabled="true"`,
  `aria-describedby` y "Cargando los datos para proponer una sesión…" (Pregunta 2).
- `usePlayerTab` recibe las cuentas solo con el usuario en `ready` (antes, `loading`): no se
  decide pestaña, no se corrige la dirección ni se pide el resumen hasta el 200 del usuario.
- `PlayerGamesSection`: cuentas `loading` → esqueleto de sección; `failed` → `Failure` con
  "Reintentar" = solo cuentas; vacío → `Blank` RF-10; panel con esqueleto durante el resumen o
  `rechecking`, `Failure` con "Reintentar" = solo resumen, o `GameSummaryPanel` sin `onSync` y con
  `showHandleLabel`. `GameTabs` con `idBase`/`panelId` y `role="tabpanel"` enlazado.
- `PlayerHeader`: monograma, nombre (`doc-title`), `@usuario · zona · se inscribió …`, biografía
  como texto; sin correo, totales ni editar. Sin `dangerouslySetInnerHTML` en
  `features/players` (grep sin resultados).
- `copy.ts`: añadidos solo los textos nuevos de 4.6 (sin repetir `NO_DATA_TEXT`, motivos 3–6 ni
  "Reintentar"), incluido `NO_SHARED_HOURS_TEXT = 'Sin horas en común esta semana.'` (P59);
  `MatchEntry.tsx` no se toca (T9).
- `grep -nE '#[0-9a-fA-F]{3,8}|rgb\(|hsl\('` en los cinco archivos nuevos: sin resultados.
- `npm run typecheck`, `npm run lint` y `npm run build`: en verde.

Capturas (`specs/008-ficha-de-jugador/validation/t6/`, 1,7 MB): `ficha-user2-1280-lol.png`,
`ficha-user2-360-lol.png`, `ficha-largos-360.png`, `ficha-sin-cuentas-360.png`.

<details>
<summary>Arnés CDP (<code>cdp.mjs</code>, scratchpad, no versionado)</summary>

```js
// Arnés mínimo de Chrome headless por el protocolo de DevTools (spec 008, T6). Mismo método que
// el shoot.mjs de T5: perfil de navegador nuevo, WebSocket global de Node 24, sin dependencias.
import { spawn } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(port, profileDir) {
  rmSync(profileDir, { recursive: true, force: true });
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb',
    'about:blank',
  ], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 160; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
    } catch { /* arrancando */ }
    await wait(250);
  }
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      consoleErrors.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      consoleErrors.push(`log: ${msg.params.entry.text} ${msg.params.entry.url ?? ''}`);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  async function waitFor(expression, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try { if (await evaluate(expression)) return true; } catch { /* documento cambiando */ }
      await wait(100);
    }
    return false;
  }
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  async function setWidth(width) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  }
  async function go(url) {
    await send('Page.navigate', { url });
    await waitFor(`document.readyState === 'complete'`, 120000);
  }
  async function history() {
    const { currentIndex, entries } = await send('Page.getNavigationHistory');
    return { currentIndex, urls: entries.map((e) => e.url) };
  }
  async function shot(file) {
    await evaluate(`(() => {
      for (const a of document.getAnimations()) {
        const t = a.effect?.getComputedTiming?.();
        if (t && t.iterations === Infinity) { a.pause(); a.currentTime = 0; } else { try { a.finish(); } catch {} }
      }
      return true;
    })()`);
    await wait(300);
    const { cssContentSize } = await send('Page.getLayoutMetrics');
    const { data } = await send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: cssContentSize.width, height: Math.ceil(cssContentSize.height), scale: 1 },
    });
    writeFileSync(file, Buffer.from(data, 'base64'));
    return `${path.basename(file)} ${Math.round(cssContentSize.width)}x${Math.ceil(cssContentSize.height)}`;
  }
  async function loginDemo(base) {
    await go(`${base}/login`);
    await waitFor(`document.querySelector('.access__demo button')`);
    await evaluate(`document.querySelector('.access__demo button').click(), true`);
    await wait(300);
    await evaluate(`document.querySelector('button[type=submit]').click(), true`);
    await waitFor(`location.pathname !== '/login'`, 30000);
    await wait(500);
  }
  function close() { ws.close(); chrome.kill(); }
  return { send, evaluate, waitFor, setWidth, go, history, shot, loginDemo, consoleErrors, close };
}
```

</details>

<details>
<summary>Comprobaciones (<code>check.mjs</code>, scratchpad, no versionado)</summary>

```js
// Comprobaciones en pantalla de la T6 de la spec 008 en modo simulado con la cuenta demo.
// Uso: node check.mjs <outDir> [baseDev] [basePreview]
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { launch, wait } from './cdp.mjs';

const OUT = path.resolve(process.argv[2]);
const DEV = process.argv[3] ?? 'http://localhost:5191';
const PREVIEW = process.argv[4] ?? 'http://localhost:5192';
mkdirSync(OUT, { recursive: true });
const here = path.dirname(new URL(import.meta.url).pathname);
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'OK   ' : 'FALLA'} ${name}${detail ? ' — ' + detail : ''}`);
};
const NO_GAMES = 'Este jugador no ha vinculado ningún juego';
const NOT_FOUND = 'Este jugador no existe';
const pageText = `document.querySelector('.shell__page')?.innerText ?? ''`;
const panelReady = `!!document.querySelector('[role=tabpanel] .account')`;
const tabsExpr = `[...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.trim())`;
const hScroll = `document.documentElement.scrollWidth - document.documentElement.clientWidth`;

/* ------------------------------------------------------------------ 1. Ficha semilla */
const c = await launch(9341, path.join(here, 'prof-a'));
await c.setWidth(1280);
await c.loginDemo(DEV);

await c.go(`${DEV}/jugadores/user-2`);
await c.waitFor(panelReady);
const head = await c.evaluate(`document.querySelector('.player-head').innerText`);
ok('encabezado: nombre, @usuario, zona, alta y biografía', /Isidora Campos/.test(head) && /@nocturna · America\/Santiago · se inscribió hace/.test(head) && /22:00/.test(head), JSON.stringify(head));
ok('encabezado sin correo ni totales ni "Editar ficha"', !/@teammatchup|@.*\.gg|Juegos vinculados|Cuentas verificadas|Horas declaradas|Editar ficha/.test(await c.evaluate(pageText)));
ok('título del documento = nombre visible', (await c.evaluate('document.title')) === 'Isidora Campos · TeamMatchUp', await c.evaluate('document.title'));
ok('pestañas de user-2 en orden LoL, CS2', JSON.stringify(await c.evaluate(tabsExpr)) === JSON.stringify(['League of Legends', 'Counter-Strike 2']), JSON.stringify(await c.evaluate(tabsExpr)));
ok('dirección corregida a ?juego=lol (pestaña inicial) con replace', (await c.evaluate('location.search')) === '?juego=lol' && !(await c.history()).urls.some((u) => u.endsWith('/jugadores/user-2')), JSON.stringify((await c.history()).urls.slice(-3)));
const panel = await c.evaluate(`document.querySelector('[role=tabpanel]').innerText`);
ok('panel: rango vigente, región, verificada, última lectura', /RANGO VIGENTE[\s\S]*Emerald|Rango vigente/i.test(panel) && /REGIÓN/i.test(panel) && /VERIFICADA|SIN VERIFICAR/i.test(panel) && /ÚLTIMA LECTURA/i.test(panel));
ok('panel: escala, lecturas, primera lectura y diferencia', !!(await c.evaluate(`!!document.querySelector('[role=tabpanel] .rank-scale')`)) && /lectura registrada|lecturas registradas/.test(panel) && /Primera lectura:/.test(panel) && /[▲▼] [+−]\d+ pts desde la primera lectura/.test(panel));
ok('panel: últimas partidas y tasa de victorias', /Últimas partidas/.test(panel) && /% ganadas/.test(panel) && (await c.evaluate(`document.querySelectorAll('[role=tabpanel] .ledger__row, [role=tabpanel] tbody tr, [role=tabpanel] li').length`)) >= 1);
ok('panel: identificador con su etiqueta (Riot ID)', /Riot ID · \S+/.test(panel), (panel.match(/Riot ID · \S+/) ?? [''])[0]);
ok('panel: Etiqueta de datos simulados', (await c.evaluate(`document.querySelectorAll('[role=tabpanel] .demo-tag, [role=tabpanel] [class*=demo]').length`)) > 0 || /Datos de demostración/.test(panel));
ok('panel sin acciones (sin Resincronizar ni Desvincular)', !/Resincronizar|Desvincular/.test(panel));
ok('aviso global de datos simulados en barra/pie', /Datos de demostración/.test(await c.evaluate(`document.querySelector('.shell__foot')?.innerText ?? ''`)));
const aria = await c.evaluate(`(() => { const l = document.querySelector('[role=tablist]'); const p = document.querySelector('[role=tabpanel]'); const ts = [...l.querySelectorAll('[role=tab]')]; return { label: l.getAttribute('aria-label'), tabs: ts.map(t => [t.id, t.getAttribute('aria-controls'), t.getAttribute('aria-selected'), t.tabIndex]), panel: [p.id, p.getAttribute('aria-labelledby'), p.tabIndex] }; })()`);
ok('patrón de pestañas: ids, aria-controls, tabIndex itinerante, panel enlazado', aria.label === 'Juegos del jugador' && aria.tabs[0][0] === 'player-games-tab-lol' && aria.tabs[0][1] === 'player-games-panel' && aria.tabs[0][3] === 0 && aria.tabs[1][3] === -1 && aria.panel[1] === 'player-games-tab-lol', JSON.stringify(aria));
console.log(await c.shot(path.join(OUT, 'ficha-user2-1280-lol.png')));

// Cambio de pestaña por clic: sin recarga, ?juego=cs2, sin entrada nueva en el historial.
await c.evaluate(`window.__noReload = 'sigue', true`);
const hBefore = await c.history();
await c.evaluate(`document.querySelectorAll('[role=tab]')[1].click(), true`);
await c.waitFor(`location.search === '?juego=cs2' && !!document.querySelector('[role=tabpanel] .account') && /SteamID64/.test(document.querySelector('[role=tabpanel]').innerText)`);
const hAfter = await c.history();
ok('cambiar de pestaña no recarga la página', (await c.evaluate('window.__noReload')) === 'sigue');
ok('cambiar de pestaña deja ?juego=cs2 sin entrada nueva', hBefore.urls.length === hAfter.urls.length && hAfter.urls.at(-1).endsWith('?juego=cs2'), `${hBefore.urls.length} → ${hAfter.urls.length}`);
ok('CS2: identificador con etiqueta SteamID64', /SteamID64 · \S+/.test(await c.evaluate(`document.querySelector('[role=tabpanel]').innerText`)));

// Teclado: Inicio y flecha derecha con activación automática y foco.
await c.evaluate(`document.querySelector('[role=tab][aria-selected=true]').focus(), true`);
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 });
await c.waitFor(`location.search === '?juego=lol'`);
const focusHome = await c.evaluate(`document.activeElement.id`);
await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
await c.waitFor(`location.search === '?juego=cs2'`);
const focusRight = await c.evaluate(`document.activeElement.id`);
ok('teclado: Inicio y flecha derecha eligen y enfocan la pestaña', focusHome === 'player-games-tab-lol' && focusRight === 'player-games-tab-cs2', `${focusHome}, ${focusRight}`);
ok('teclado: sin entradas nuevas en el historial', (await c.history()).urls.length === hBefore.urls.length);

// "Atrás" sale de la ficha (no recorre pestañas).
await c.go(`${DEV}/coincidencias`);
await c.go(`${DEV}/jugadores/user-10?juego=cs2`);
await c.waitFor(panelReady);
ok('user-10: pestañas R6, CS2 y ?juego=cs2 respetado', JSON.stringify(await c.evaluate(tabsExpr)) === JSON.stringify(['Rainbow Six Siege', 'Counter-Strike 2']) && (await c.evaluate('location.search')) === '?juego=cs2', JSON.stringify(await c.evaluate(tabsExpr)));
await c.evaluate(`document.querySelectorAll('[role=tab]')[0].click(), true`);
await c.waitFor(`location.search === '?juego=r6' && /Ubisoft ID/.test(document.querySelector('[role=tabpanel]')?.innerText ?? '')`);
ok('R6: identificador con etiqueta Ubisoft ID y escala', /Ubisoft ID · \S+/.test(await c.evaluate(`document.querySelector('[role=tabpanel]').innerText`)) && !!(await c.evaluate(`!!document.querySelector('[role=tabpanel] .rank-scale')`)));
await c.send('Runtime.evaluate', { expression: 'history.back()' });
await c.waitFor(`location.pathname === '/coincidencias'`, 8000);
ok('"Atrás" tras cambiar de pestaña sale de la ficha', (await c.evaluate('location.pathname')) === '/coincidencias', await c.evaluate('location.href'));

// ?juego=xyz y juego sin cuenta → pestaña inicial con replace.
for (const [q, label] of [['xyz', 'valor inventado'], ['r6', 'juego sin cuenta'], ['LOL', 'mayúsculas'], ['constructor', 'propiedad heredada']]) {
  await c.go(`${DEV}/coincidencias`);
  await c.go(`${DEV}/jugadores/user-2?juego=${q}`);
  await c.waitFor(panelReady);
  await c.waitFor(`location.search === '?juego=lol'`, 5000);
  const h = await c.history();
  ok(`?juego=${q} (${label}) → ?juego=lol con replace`, (await c.evaluate('location.search')) === '?juego=lol' && !h.urls.some((u) => u.includes(`juego=${q}`)) && h.urls.at(-2).endsWith('/coincidencias'), JSON.stringify(h.urls.slice(-2)));
}

// USER-<n> abre la ficha de user-<n>.
await c.go(`${DEV}/jugadores/USER-7`);
await c.waitFor(panelReady);
ok('USER-7 abre la ficha de user-7 (Antonia Herrera, R6)', /Antonia Herrera/.test(await c.evaluate(pageText)) && JSON.stringify(await c.evaluate(tabsExpr)) === JSON.stringify(['Rainbow Six Siege']), await c.evaluate('location.href'));

// me, id propio y USER-<propio> → perfil; "Atrás" no vuelve a la ficha.
for (const ref of ['me', 'user-1', 'USER-1', 'User-1']) {
  await c.go(`${DEV}/coincidencias`);
  await c.go(`${DEV}/jugadores/${ref}`);
  await c.waitFor(`location.pathname === '/perfil'`, 8000);
  const h = await c.history();
  const atProfile = (await c.evaluate('location.pathname')) === '/perfil';
  await c.send('Runtime.evaluate', { expression: 'history.back()' });
  await c.waitFor(`location.pathname === '/coincidencias'`, 8000);
  const lastTwo = h.urls.slice(h.currentIndex - 1, h.currentIndex + 1);
  ok(`/jugadores/${ref} → /perfil y "Atrás" vuelve a coincidencias`, atProfile && h.currentIndex === h.urls.length - 1 && lastTwo[0].endsWith('/coincidencias') && lastTwo[1].endsWith('/perfil') && (await c.evaluate('location.pathname')) === '/coincidencias', JSON.stringify(lastTwo));
}

// Orden LoL, R6, CS2 aunque las cuentas se crearan al revés (solo en esta base simulada).
await c.evaluate(`(() => {
  const key = 'tmu.mock-db.v3';
  const db = JSON.parse(localStorage.getItem(key));
  const r6 = db.accounts.find((a) => a.userId === 'user-7' && a.gameId === 'r6');
  const copy = { ...r6, id: 'account-user-2-r6-t6', userId: 'user-2' };
  const others = db.accounts.filter((a) => a.userId === 'user-2').reverse();
  db.accounts = [...db.accounts.filter((a) => a.userId !== 'user-2'), ...others, copy];
  localStorage.setItem(key, JSON.stringify(db));
  return db.accounts.filter((a) => a.userId === 'user-2').map((a) => a.gameId).join(',');
})()`).then((order) => console.log('orden de creación simulado user-2:', order));
await c.go(`${DEV}/jugadores/user-2`);
await c.waitFor(panelReady);
ok('tres juegos creados en orden CS2, LoL, R6 → pestañas LoL, R6, CS2', JSON.stringify(await c.evaluate(tabsExpr)) === JSON.stringify(['League of Legends', 'Rainbow Six Siege', 'Counter-Strike 2']), JSON.stringify(await c.evaluate(tabsExpr)));

// 360 px: sin desplazamiento horizontal en la ficha (cada pestaña) ni en sus estados.
await c.setWidth(360);
await c.go(`${DEV}/jugadores/user-2?juego=lol`);
await c.waitFor(panelReady);
for (const [i, g] of [[0, 'lol'], [1, 'r6'], [2, 'cs2']]) {
  if (i > 0) {
    await c.evaluate(`document.querySelectorAll('[role=tab]')[${i}].click(), true`);
    await c.waitFor(`location.search === '?juego=${g}' && !!document.querySelector('[role=tabpanel] .account')`);
    await wait(400);
  }
  const overflow = await c.evaluate(hScroll);
  ok(`360 px, pestaña ${g}: sin desplazamiento horizontal`, overflow <= 0, `scrollWidth − clientWidth = ${overflow}`);
  if (g !== 'r6') console.log(await c.shot(path.join(OUT, `ficha-user2-360-${g}.png`)));
}
// Nombre y biografía de 40 caracteres sin espacios (solo en esta base simulada).
await c.evaluate(`(() => {
  const key = 'tmu.mock-db.v3';
  const db = JSON.parse(localStorage.getItem(key));
  const u = db.users.find((x) => x.id === 'user-3');
  u.displayName = 'W'.repeat(40); u.username = 'w'.repeat(20); u.bio = '<b>x</b>' + 'M'.repeat(150);
  localStorage.setItem(key, JSON.stringify(db));
  return true;
})()`);
await c.go(`${DEV}/jugadores/user-3`);
await c.waitFor(panelReady);
await wait(300);
ok('360 px, nombre de 40 caracteres y biografía larga sin espacios: sin desplazamiento horizontal', (await c.evaluate(hScroll)) <= 0, `${await c.evaluate(hScroll)}`);
ok('biografía "<b>x</b>" se ve literal (sin HTML)', (await c.evaluate(`document.querySelector('.ficha__bio').textContent.startsWith('<b>x</b>') && !document.querySelector('.ficha__bio b')`)));
console.log(await c.shot(path.join(OUT, 'ficha-largos-360.png')));
for (const id of ['user-999999', 'abc']) {
  await c.go(`${DEV}/jugadores/${id}`);
  await c.waitFor(`document.body.innerText.includes(${JSON.stringify(NOT_FOUND)})`);
  ok(`360 px, "${NOT_FOUND}" (${id}): sin desplazamiento horizontal`, (await c.evaluate(hScroll)) <= 0);
}
// Estado vacío RF-10: jugador sin cuentas (solo en esta base simulada).
await c.evaluate(`(() => {
  const key = 'tmu.mock-db.v3';
  const db = JSON.parse(localStorage.getItem(key));
  db.accounts = db.accounts.filter((a) => a.userId !== 'user-4');
  localStorage.setItem(key, JSON.stringify(db));
  return true;
})()`);
await c.go(`${DEV}/coincidencias`);
await c.go(`${DEV}/jugadores/user-4?juego=lol`);
await c.waitFor(`document.body.innerText.includes(${JSON.stringify(NO_GAMES)})`);
await wait(300);
const h4 = await c.history();
ok('RF-10: sin cuentas → "Este jugador no ha vinculado ningún juego", sin pestañas', !(await c.evaluate(`!!document.querySelector('[role=tablist]')`)) && /Emilia Vargas/.test(await c.evaluate(pageText)));
ok('RF-10: la dirección queda sin juego (replace)', (await c.evaluate('location.search')) === '' && !h4.urls.some((u) => u.includes('user-4?juego')), JSON.stringify(h4.urls.slice(-2)));
ok('360 px, RF-10: sin desplazamiento horizontal', (await c.evaluate(hScroll)) <= 0);
console.log(await c.shot(path.join(OUT, 'ficha-sin-cuentas-360.png')));

// RF-19: la pestaña desaparece con la ficha abierta (la cuenta R6 de user-10 se borra en la base).
await c.setWidth(1280);
await c.go(`${DEV}/jugadores/user-10?juego=cs2`);
await c.waitFor(panelReady);
await c.evaluate(`(() => {
  const key = 'tmu.mock-db.v3';
  const db = JSON.parse(localStorage.getItem(key));
  db.accounts = db.accounts.filter((a) => !(a.userId === 'user-10' && a.gameId === 'r6'));
  localStorage.setItem(key, JSON.stringify(db));
  return true;
})()`);
await c.evaluate(`(() => {
  window.__panelStates = [];
  const p = () => document.querySelector('[role=tabpanel]');
  const rec = () => { const el = p(); window.__panelStates.push(!el ? 'sin-panel' : el.querySelector('.skeleton') ? 'carga' : el.querySelector('.blank') ? 'error' : el.querySelector('.account') ? 'datos' : 'otro'); };
  new MutationObserver(rec).observe(document.querySelector('.shell__page'), { subtree: true, childList: true });
  return true;
})()`);
const hb = await c.history();
await c.evaluate(`document.querySelectorAll('[role=tab]')[0].click(), true`);
await c.waitFor(`location.search === '?juego=cs2' && JSON.stringify([...document.querySelectorAll('[role=tab]')].map(t => t.textContent.trim())) === '["Counter-Strike 2"]' && !!document.querySelector('[role=tabpanel] .account')`, 10000);
const states = await c.evaluate('window.__panelStates');
const ha = await c.history();
ok('RF-19: 404 del resumen → repide, quita R6 y vuelve a CS2 con replace', JSON.stringify(await c.evaluate(tabsExpr)) === '["Counter-Strike 2"]' && (await c.evaluate('location.search')) === '?juego=cs2' && ha.urls.length === hb.urls.length, `estados del panel: ${[...new Set(states)].join(' → ')}`);
ok('RF-19: el panel nunca muestra error durante la comprobación', !states.includes('error'));

const errs1 = c.consoleErrors.filter((e) => !e.includes('React Router Future Flag'));
c.close();

/* ------------------------------------------------------------------ 2. 3G lenta: sin destello */
// La construcción con modo simulado (vite preview) con la red emulada en "3G lenta". El backend
// simulado responde en el navegador (350 ms, sin red); la red lenta afecta a la carga del código.
const s = await launch(9342, path.join(here, 'prof-b'));
await s.setWidth(1280);
await s.loginDemo(PREVIEW);
await s.send('Network.enable');
await s.send('Network.setCacheDisabled', { cacheDisabled: true });
await s.send('Network.emulateNetworkConditions', { offline: false, latency: 2000, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
await s.send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__seen = [];
  const watch = () => {
    const t = document.body ? document.body.innerText : '';
    for (const s of [${JSON.stringify(NO_GAMES)}, ${JSON.stringify(NOT_FOUND)}, 'Cargando los datos para proponer una sesión…']) {
      if (t.includes(s) && window.__seen.at(-1) !== s) window.__seen.push(s);
    }
  };
  new MutationObserver(watch).observe(document, { subtree: true, childList: true, characterData: true });
` });
for (const id of ['user-999999', 'abc', 'ME', 'USER-999999']) {
  const t0 = Date.now();
  await s.go(`${PREVIEW}/jugadores/${id}`);
  await s.waitFor(`document.body.innerText.includes(${JSON.stringify(NOT_FOUND)})`, 120000);
  await wait(1500);
  const seen = await s.evaluate('window.__seen');
  ok(`3G lenta, ${id}: "${NOT_FOUND}" sin un instante de "${NO_GAMES}"`, seen.includes(NOT_FOUND) && !seen.includes(NO_GAMES) && !!(await s.evaluate(`!![...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Ir a coincidencias' && a.getAttribute('href') === '/coincidencias')`)), `secuencia: ${seen.join(' → ')} (${Date.now() - t0} ms)`);
}
await s.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
const errs2 = s.consoleErrors.filter((e) => !e.includes('React Router Future Flag'));
s.close();

/* ------------------------------------------------------------------ 3. Sin sesión → login y vuelta */
const n = await launch(9343, path.join(here, 'prof-c'));
await n.setWidth(1280);
await n.go(`${DEV}/jugadores/user-2?juego=cs2`);
await n.waitFor(`location.pathname === '/login'`, 10000);
ok('sin sesión: la ficha lleva a login', (await n.evaluate('location.pathname')) === '/login');
await n.waitFor(`document.querySelector('.access__demo button')`);
await n.evaluate(`document.querySelector('.access__demo button').click(), true`);
await wait(300);
await n.evaluate(`document.querySelector('button[type=submit]').click(), true`);
await n.waitFor(`location.pathname === '/jugadores/user-2' && !!document.querySelector('[role=tabpanel] .account')`, 15000);
ok('tras login vuelve a la ficha, en la pestaña inicial (?juego=lol)', (await n.evaluate('location.pathname + location.search')) === '/jugadores/user-2?juego=lol', await n.evaluate('location.href'));
const errs3 = n.consoleErrors.filter((e) => !e.includes('React Router Future Flag'));
n.close();

const all = [...errs1, ...errs2, ...errs3];
// Ruido del servidor de desarrollo (cliente HMR de Vite al entrar en la caché de ida y vuelta), no de la app.
const hmr = all.filter((e) => e.includes("WebSocket connection to 'ws://localhost:5191"));
console.log(`avisos del cliente HMR de Vite (bfcache), excluidos: ${hmr.length}`);
const errors = all.filter((e) => !hmr.includes(e));
ok('sin errores de consola (salvo los avisos de React Router de siempre)', errors.length === 0, JSON.stringify(errors));
console.log(`\nRESUMEN: ${results.filter((r) => r.pass).length}/${results.length} OK`);
```

</details>

### 3.2 T7 — bloque de cruce: horas en común, nota de zonas y distancia de rango (2026-10-20)

RF-6, RF-8, RF-13, RF-17, RF-18, RF-22, RF-27, RNF-1, RNF-5. Archivos:
`features/players/components/SharedHoursBlock.tsx` (nuevo),
`features/players/components/RankDistanceBlock.tsx` (nuevo),
`features/players/pages/PlayerPage.tsx`, `features/players/pages/playerPage.css`.

**Método.** Igual que T6 (sección 3.1): Chrome `--headless=new` por CDP desde Node 24, perfil
nuevo, cuenta demo (`user-1`), `VITE_USE_MOCK_API=true npx vite --port 5191`. `cdp.mjs` es el
de 3.1 con un solo cambio: en `loginDemo`, `document.querySelector('button[type=submit]')?.click()`
(con `?.`). Variaciones de datos solo en la base simulada del navegador de captura
(`localStorage['tmu.mock-db.v3']`): zona de `user-2`, cuenta CS2 de la demo borrada, horas de
`user-3` = lunes 03:00 y 04:00, cuentas de `user-4` borradas. La comparación con coincidencias
lee, en `/coincidencias`, las tres primeras filas de LoL y la primera de R6 (distancia "Δ n pts",
Etiqueta junto a ella, total y tramos del cajón desplegado) y abre la ficha del mismo jugador en el
mismo juego (`id` por el nombre visible en la base simulada).

**Rojo (antes de los componentes; `node check.mjs ./out-red`).** Fallaron las cuatro
comparaciones con coincidencias (la ficha no tenía total, tramos ni distancia), la grilla (0
celdas), la carga de la distancia (`["sin"]`), la nota de zonas y el texto de RF-13; la
ejecución se cortó al pulsar el enlace inexistente (después se protegió con `?.`).

**Verde (`node check.mjs ./out`, 20/20):**

```
OK    lol, Fernanda Soto (user-9): horas en común y distancia iguales a coincidencias — coincidencias ["Δ 0 pts","8 horas",["Lun 19:00–21:00","Mié 19:00–22:00","Vie 20:00–22:00","Vie 23:00–00:00"],true] · ficha ["Δ 0 pts","8 horas en común",["Lun 19:00–21:00","Mié 19:00–22:00","Vie 20:00–22:00","Vie 23:00–00:00"],true]
OK    lol, Isidora Campos (user-2): horas en común y distancia iguales a coincidencias — coincidencias ["Δ 3 pts","7 horas",["Mar 21:00–00:00","Mié 22:00–23:00","Vie 21:00–22:00","Vie 23:00–00:00","Sáb 15:00–16:00"],true] · ficha ["Δ 3 pts","7 horas en común",["Mar 21:00–00:00","Mié 22:00–23:00","Vie 21:00–22:00","Vie 23:00–00:00","Sáb 15:00–16:00"],true]
OK    lol, Renata Bustos (user-3): horas en común y distancia iguales a coincidencias — coincidencias ["Δ 7 pts","14 horas",["Lun 21:00–23:00","Mar 22:00–00:00","Mié 21:00–00:00","Jue 19:00–20:00","Jue 21:00–00:00","Vie 21:00–00:00"],true] · ficha ["Δ 7 pts","14 horas en común",["Lun 21:00–23:00","Mar 22:00–00:00","Mié 21:00–00:00","Jue 19:00–20:00","Jue 21:00–00:00","Vie 21:00–00:00"],true]
OK    r6, Felipe Navarro (user-10): horas en común y distancia iguales a coincidencias — coincidencias ["Δ 3 pts","11 horas",["Mar 19:00–22:00","Mié 19:00–20:00","Mié 21:00–22:00","Jue 19:00–22:00","Vie 19:00–22:00"],true] · ficha ["Δ 3 pts","11 horas en común",["Mar 19:00–22:00","Mié 19:00–20:00","Mié 21:00–22:00","Jue 19:00–22:00","Vie 19:00–22:00"],true]
OK    al menos 2 jugadores semilla comparados — user-9, user-2, user-3, user-10
OK    grilla: celdas destacadas = bloques en común dentro de 12:00–01:00; marcadas = horas propias de la grilla — [7,7,41,41]
OK    grilla de solo lectura (celdas deshabilitadas)
OK    zonas iguales (semilla, America/Santiago): sin nota de RF-22
OK    cambiar de pestaña: la distancia pasa por carga y vuelve a dato — ["carga","dato"]
OK    zonas distintas: nota de RF-22 en un aviso — "Las horas se comparan tal como cada uno las marcó, sin convertir zonas horarias"
OK    CS2 sin cuenta propia: texto de RF-13 con enlace a Configuración — ["Vincula tu cuenta de CS2 para ver la distancia de rango","/configuracion"]
OK    el enlace lleva a Configuración
OK    sin bloques en común: "Sin horas en común esta semana." y total 0 — ["Sin horas en común esta semana.","0 horas en común"]
OK    jugador sin cuentas: sin distancia y con horas en común — [null,"16 horas en común"]
OK    360 px, user-2 lol: página sin desplazamiento horizontal — página 0 px; recuadro {"overflowX":"auto","client":278,"scroll":328}
OK    360 px, user-2 lol: recuadro de la grilla con overflow-x: auto
OK    360 px, sin cuentas: página sin desplazamiento horizontal — página 0 px; recuadro {"overflowX":"auto","client":278,"scroll":328}
OK    360 px, sin cuentas: recuadro de la grilla con overflow-x: auto
OK    360 px, nota de zonas y texto de RF-13: página sin desplazamiento horizontal — 0 px
OK    sin errores de consola (salvo los avisos de React Router de siempre) — []
RESUMEN: 20/20 OK
```

**360 px y la grilla (`node box2.mjs`).** La primera versión verde solo tenía `overflow-x: auto`
en el recuadro: la grilla (columnas `1fr`) se comprimía a 278 px y cabía (sin desplazamiento),
pero la captura mostró "2:00" en lugar de "12:00": la columna de horas de `HoursSheet` (36 px a
menos de 640 px) es más estrecha que el texto, que sobresale a la izquierda, y el recuadro con
`overflow-x: auto` lo recorta (en Configuración también sobresale, pero sin recorte). Corrección
solo en `playerPage.css`: `.player-grid .hours { min-width: 20rem }` (la grilla se desplaza
dentro del recuadro en vez de comprimirse) y `padding-left: var(--s2)` en el recuadro. Resultado:

```
{"box":[278,328],"page":0,"hourText":"12:00","hourTextLeft":45,"boxLeft":41}
tras desplazar el recuadro: [50,0,0]
```

(recuadro de 278 px con 328 px de contenido; la página, 0 px; "12:00" empieza dentro del
recuadro; al desplazar el recuadro 50 px la página no se mueve: `scrollX` 0.)

**No comprobado en pantalla (y por qué).**
- Errores de sección (RF-18): `Failure` con "Reintentar" para cada disponibilidad, para las
  cuentas propias y para el resumen en el lugar de la distancia. El backend simulado no produce
  5xx; revisión de código (abajo) y, con el servidor real, T10.
- "Sin datos" de la distancia (RF-17): el simulado siempre da rango vigente; cubierto por
  `distanceView` (T1, 1.1) y revisión de código.
- Carga de las disponibilidades con red lenta: el simulado responde en el navegador; se vio la
  carga de la distancia al cambiar de pestaña (arriba). Contraste y lector de pantalla: T10.

**Revisión de código.**
- `PlayerPage`: las consultas de disponibilidad del jugador, cuentas propias y disponibilidad
  propia ya montadas en T6 se usan ahora; `RankDistanceBlock` solo con `tab !== null` (RF-10,
  P16), con `distanceView({ gameId: tab, myAccounts: toLoadable(cuentas propias), theirAccount })`,
  donde `theirAccount` es `loading` durante RF-19 (`rechecking`) y, si no, la cuenta del resumen
  (`summary.value.account`) o su estado de carga/fallo. `SharedHoursBlock` siempre, con
  `zonesDiffer(userQuery.data.timezone, user.timezone)` (zona de la sesión desde `useAuth`, que
  `PlayerPage` pasa a `PlayerSheet`). "Proponer sesión" no se toca (T8).
- `SharedHoursBlock`: `sharedHours` (→ `intersectBlocks` + `groupBlocks`; P53), total con
  `pluralize(total, 'hora', 'horas')` + "en común", tramos con `formatRange` en `ficha__ranges`
  o `NO_SHARED_HOURS_TEXT` (P59); `notice` con `ZONES_DIFFER_NOTE` si las zonas difieren (no
  depende de las disponibilidades); `HoursSheet readOnly value={horas propias} compareWith={bloques
  en común}` con listas `TimeBlock[]` (P58) dentro de `.player-grid`; esqueleto mientras alguna
  disponibilidad carga y un `Failure` (sin cambios, P60) con "Reintentar" = `refetch()` de esa
  consulta por cada una que falla.
- `RankDistanceBlock`: `loading` → esqueleto; `failed` → `Failure` con el error y el
  `refetch()` de las cuentas propias o del resumen; `noOwnAccount` → el texto de
  `linkAccountForDistanceText(GAMES[g].shortName)` como enlace (`Link`) a `/configuracion`;
  `noData` → `NO_DATA_TEXT` (P62); `value` → "Δ n pts" + `DemoTag` si `simulated`.
- `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\('` en los cuatro archivos: sin resultados.
  `grep "Sin datos\|Sin horas en común\|Vincula tu cuenta\|sin convertir zonas"`: solo dos
  comentarios de `RankDistanceBlock.tsx` (líneas 25 y 26), ningún texto de interfaz.
  `grep -rnE "dangerouslySetInnerHTML|: any\b|as any|@ts-ignore|\.only\("` en `features/players`:
  sin resultados.
- `npm run typecheck`, `npm run lint` y `npm run build`: en verde.

Capturas (`specs/008-ficha-de-jugador/validation/t7/`, JPEG, 0,36 MB): `cruce-user2-1280.jpg`
(LoL, zonas iguales) y `cruce-user2-360-cs2.jpg` (CS2 sin cuenta propia, zonas distintas).

<details>
<summary>Comprobaciones (<code>check.mjs</code>, scratchpad, no versionado)</summary>

```js
// Comprobaciones en pantalla de la T7 de la spec 008 (bloque de cruce) en modo simulado con la
// cuenta demo. Uso: node check.mjs <outDir> [baseDev]
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { launch, wait } from './cdp.mjs';

const OUT = path.resolve(process.argv[2]);
const DEV = process.argv[3] ?? 'http://localhost:5191';
mkdirSync(OUT, { recursive: true });
const here = path.dirname(new URL(import.meta.url).pathname);
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'OK   ' : 'FALLA'} ${name}${detail ? ' — ' + detail : ''}`);
};
const KEY = 'tmu.mock-db.v3';
const NO_SHARED = 'Sin horas en común esta semana.';
const ZONES = 'Las horas se comparan tal como cada uno las marcó, sin convertir zonas horarias';
const hScroll = `document.documentElement.scrollWidth - document.documentElement.clientWidth`;
const hoursReady = `!!document.querySelector('.player-hours .player-grid')`;
const distReady = `(() => { const d = document.querySelector('.player-distance'); return !!d && !d.querySelector('[aria-busy=true]'); })()`;
const editDb = (body) => `(() => { const db = JSON.parse(localStorage.getItem('${KEY}')); ${body}; localStorage.setItem('${KEY}', JSON.stringify(db)); return true; })()`;

/** Lo que muestra la ficha en el bloque de cruce. */
async function readSheet(c) {
  return c.evaluate(`(() => {
    const h = document.querySelector('.player-hours');
    const d = document.querySelector('.player-distance');
    return {
      total: h?.querySelector('.player-hours__total')?.textContent.trim() ?? null,
      ranges: [...(h?.querySelectorAll('.ficha__ranges li') ?? [])].map((li) => li.textContent.trim()),
      empty: h?.querySelector('.player-hours__empty')?.textContent.trim() ?? null,
      notice: h?.querySelector('.notice')?.textContent.trim() ?? null,
      distance: d ? d.querySelector('.player-distance__value .num')?.textContent.trim() ?? d.innerText.trim() : null,
      demo: !!d?.querySelector('.player-distance__value')?.textContent.includes('Datos de demostración'),
      link: d?.querySelector('a') ? [d.querySelector('a').textContent.trim(), d.querySelector('a').getAttribute('href')] : null,
      shared: [...document.querySelectorAll('.player-grid .hours__cell[data-shared]')].length,
    };
  })()`);
}

const c = await launch(9351, path.join(here, 'prof-a'));
await c.setWidth(1280);
await c.loginDemo(DEV);

/* ------------------------------------------------ 1. Igual que la fila de coincidencias */
const users = await c.evaluate(`JSON.parse(localStorage.getItem('${KEY}')).users.map((u) => [u.id, u.displayName])`);
const idOf = Object.fromEntries(users.map(([id, name]) => [name, id]));
const compared = [];
for (const [gi, game] of [[0, 'lol'], [1, 'r6']]) {
  await c.go(`${DEV}/coincidencias`);
  await c.waitFor(`document.querySelectorAll('.entry').length > 0`);
  if (gi > 0) {
    await c.evaluate(`document.querySelectorAll('.tabs [role=tab], .tabs button')[${gi}].click(), true`);
    await wait(1500);
    await c.waitFor(`document.querySelectorAll('.entry').length > 0`);
  }
  // Abre los cajones y lee cada fila (nombre, distancia, total, tramos).
  await c.evaluate(`document.querySelectorAll('.entry__toggle').forEach((b) => b.click()), true`);
  await wait(900);
  const rows = await c.evaluate(`[...document.querySelectorAll('.entry')].slice(0, 3).map((e) => ({
    name: e.querySelector('.entry__who strong').textContent.trim(),
    distance: [...e.querySelectorAll('.entry__col .num')].map((n) => n.textContent.trim()).find((t) => t.startsWith('Δ')) ?? null,
    demo: !!e.querySelector('.entry__col .entry__demo'),
    total: e.querySelector('.entry__hours').textContent.trim(),
    ranges: [...e.querySelectorAll('.entry__overlap li')].map((li) => li.textContent.trim()),
    empty: e.querySelector('.entry__detail p.note')?.textContent.trim() ?? null,
  }))`);
  for (const row of rows.slice(0, game === 'lol' ? 3 : 1)) {
    const id = idOf[row.name];
    await c.go(`${DEV}/jugadores/${id}?juego=${game}`);
    await c.waitFor(`${hoursReady} && ${distReady}`);
    const s = await readSheet(c);
    const same =
      s.distance === row.distance &&
      s.demo === row.demo &&
      s.total === `${row.total} en común` &&
      JSON.stringify(s.ranges) === JSON.stringify(row.ranges) &&
      (row.ranges.length > 0 || s.empty === row.empty);
    ok(`${game}, ${row.name} (${id}): horas en común y distancia iguales a coincidencias`, same,
      `coincidencias ${JSON.stringify([row.distance, row.total, row.ranges, row.demo])} · ficha ${JSON.stringify([s.distance, s.total, s.ranges, s.demo])}`);
    compared.push(id);
  }
}
ok('al menos 2 jugadores semilla comparados', compared.length >= 2, compared.join(', '));

// La grilla destaca exactamente los bloques en común dentro de 12:00–01:00.
await c.go(`${DEV}/jugadores/user-2?juego=lol`);
await c.waitFor(`${hoursReady} && ${distReady}`);
const gridCheck = await c.evaluate(`(() => {
  const db = JSON.parse(localStorage.getItem('${KEY}'));
  const mine = new Set(db.availability['user-1']);
  const shared = db.availability['user-2'].filter((b) => mine.has(b));
  const grid = [12,13,14,15,16,17,18,19,20,21,22,23,0];
  const inGrid = shared.filter((b) => grid.includes(Number(b.split('-')[1])));
  return [inGrid.length, document.querySelectorAll('.player-grid .hours__cell[data-shared]').length, document.querySelectorAll('.player-grid .hours__cell[data-marked]').length, mine.size];
})()`);
ok('grilla: celdas destacadas = bloques en común dentro de 12:00–01:00; marcadas = horas propias de la grilla', gridCheck[0] === gridCheck[1], JSON.stringify(gridCheck));
ok('grilla de solo lectura (celdas deshabilitadas)', await c.evaluate(`[...document.querySelectorAll('.player-grid .hours__cell')].every((b) => b.disabled)`));
ok('zonas iguales (semilla, America/Santiago): sin nota de RF-22', (await readSheet(c)).notice === null);
console.log(await c.shot(path.join(OUT, 'cruce-user2-1280.png')));

/* ------------------------------------------------ 2. Carga de la distancia al cambiar de pestaña (RF-8) */
await c.evaluate(`(() => {
  window.__dist = [];
  const rec = () => { const d = document.querySelector('.player-distance'); const s = !d ? 'sin' : d.querySelector('[aria-busy=true]') ? 'carga' : 'dato'; if (window.__dist.at(-1) !== s) window.__dist.push(s); };
  new MutationObserver(rec).observe(document.querySelector('.shell__page'), { subtree: true, childList: true, characterData: true });
  return true;
})()`);
await c.evaluate(`document.querySelectorAll('[role=tab]')[1].click(), true`);
await c.waitFor(`location.search === '?juego=cs2' && ${distReady} && !!document.querySelector('[role=tabpanel] .account')`);
await wait(300);
ok('cambiar de pestaña: la distancia pasa por carga y vuelve a dato', JSON.stringify(await c.evaluate('window.__dist')).includes('"carga","dato"'), JSON.stringify(await c.evaluate('window.__dist')));

/* ------------------------------------------------ 3. Zonas distintas (RF-22) */
await c.evaluate(editDb(`db.users.find((u) => u.id === 'user-2').timezone = 'America/Sao_Paulo'`));
await c.go(`${DEV}/jugadores/user-2?juego=lol`);
await c.waitFor(hoursReady);
const zs = await readSheet(c);
ok('zonas distintas: nota de RF-22 en un aviso', zs.notice === ZONES, JSON.stringify(zs.notice));
await c.evaluate(editDb(`db.users.find((u) => u.id === 'user-2').timezone = 'America/Santiago'`));

/* ------------------------------------------------ 4. Juego sin cuenta propia (RF-13) */
await c.evaluate(editDb(`db.accounts = db.accounts.filter((a) => !(a.userId === 'user-1' && a.gameId === 'cs2'))`));
await c.go(`${DEV}/jugadores/user-2?juego=cs2`);
await c.waitFor(`${hoursReady} && ${distReady} && location.search === '?juego=cs2'`);
const nc = await readSheet(c);
ok('CS2 sin cuenta propia: texto de RF-13 con enlace a Configuración',
  !!nc.link && nc.link[0] === 'Vincula tu cuenta de CS2 para ver la distancia de rango' && nc.link[1] === '/configuracion' && !/Δ/.test(nc.distance ?? ''),
  JSON.stringify(nc.link));
await c.evaluate(`document.querySelector('.player-distance a')?.click(), true`);
await c.waitFor(`location.pathname === '/configuracion'`, 5000);
ok('el enlace lleva a Configuración', (await c.evaluate('location.pathname')) === '/configuracion');

/* ------------------------------------------------ 5. Sin bloques en común (RF-6, P59) */
await c.evaluate(editDb(`db.availability['user-3'] = ['0-3', '0-4']`));
await c.go(`${DEV}/jugadores/user-3?juego=lol`);
await c.waitFor(`${hoursReady} && ${distReady}`);
const ns = await readSheet(c);
ok('sin bloques en común: "Sin horas en común esta semana." y total 0', ns.empty === NO_SHARED && ns.ranges.length === 0 && ns.total === '0 horas en común' && ns.shared === 0, JSON.stringify([ns.empty, ns.total]));

/* ------------------------------------------------ 6. Jugador sin cuentas (RF-10) */
await c.evaluate(editDb(`db.accounts = db.accounts.filter((a) => a.userId !== 'user-4')`));
await c.go(`${DEV}/jugadores/user-4`);
await c.waitFor(hoursReady);
await wait(500);
const na = await readSheet(c);
ok('jugador sin cuentas: sin distancia y con horas en común', na.distance === null && na.total !== null, JSON.stringify([na.distance, na.total]));

/* ------------------------------------------------ 7. 360 px */
await c.setWidth(360);
for (const [url, label] of [['/jugadores/user-2?juego=lol', 'user-2 lol'], ['/jugadores/user-4', 'sin cuentas']]) {
  await c.go(`${DEV}${url}`);
  await c.waitFor(hoursReady);
  await wait(600);
  const box = await c.evaluate(`(() => { const g = document.querySelector('.player-grid'); const cs = getComputedStyle(g); return { overflowX: cs.overflowX, client: g.clientWidth, scroll: g.scrollWidth }; })()`);
  ok(`360 px, ${label}: página sin desplazamiento horizontal`, (await c.evaluate(hScroll)) <= 0, `página ${await c.evaluate(hScroll)} px; recuadro ${JSON.stringify(box)}`);
  ok(`360 px, ${label}: recuadro de la grilla con overflow-x: auto`, box.overflowX === 'auto');
}
// Zona larga y RF-13 a 360 px.
await c.evaluate(editDb(`db.users.find((u) => u.id === 'user-2').timezone = 'America/Argentina/Buenos_Aires'`));
await c.go(`${DEV}/jugadores/user-2?juego=cs2`);
await c.waitFor(`${hoursReady} && ${distReady}`);
await wait(600);
ok('360 px, nota de zonas y texto de RF-13: página sin desplazamiento horizontal', (await c.evaluate(hScroll)) <= 0, `${await c.evaluate(hScroll)} px`);
console.log(await c.shot(path.join(OUT, 'cruce-user2-360-cs2.png')));

const errs = c.consoleErrors.filter((e) => !e.includes('React Router Future Flag') && !e.includes("WebSocket connection to 'ws://localhost:5191"));
c.close();
ok('sin errores de consola (salvo los avisos de React Router de siempre)', errs.length === 0, JSON.stringify(errs));
console.log(`\nRESUMEN: ${results.filter((r) => r.pass).length}/${results.length} OK`);
```

</details>

<details>
<summary>Recuadro de la grilla a 360 px (<code>box2.mjs</code>, scratchpad, no versionado)</summary>

```js
import { launch, wait } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await launch(9363, new URL('./prof-f', import.meta.url).pathname);
await c.setWidth(360);
await c.loginDemo('http://localhost:5191');
await c.go('http://localhost:5191/jugadores/user-2?juego=lol');
await c.waitFor(`!!document.querySelector('.player-grid .hours__grid')`);
await wait(1500);
const r = await c.evaluate(`(() => { const g = document.querySelector('.player-grid'); const h = document.querySelector('.player-grid .hours__hour'); const gr = g.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(h); const tr = range.getBoundingClientRect(); g.scrollIntoView(); return { box: [g.clientWidth, g.scrollWidth], page: document.documentElement.scrollWidth - document.documentElement.clientWidth, hourText: h.textContent, hourTextLeft: Math.round(tr.left), boxLeft: Math.round(gr.left) }; })()`);
console.log(JSON.stringify(r));
await c.evaluate(`document.querySelector('.player-grid').scrollLeft = 200, true`);
await wait(200);
console.log('tras desplazar el recuadro:', JSON.stringify(await c.evaluate(`[document.querySelector('.player-grid').scrollLeft, window.scrollX, document.documentElement.scrollWidth - document.documentElement.clientWidth]`)));
const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
writeFileSync('out/grid-360.png', Buffer.from(data, 'base64'));
c.close();
```

</details>

### 3.3 T8 — "Proponer sesión" desde la ficha (2026-10-20)

RF-7, RF-10, RF-12, RF-21, RF-23, RNF-2. Archivos:
`features/players/components/ProposeSessionAction.tsx` (nuevo),
`features/players/pages/PlayerPage.tsx`; y, por el ajuste P64 (decisión del usuario
2026-10-20: "Arreglar usePlayerTab"), `features/players/usePlayerTab.ts`.

**Método.** Igual que T6 y T7 (secciones 3.1 y 3.2): Chrome `--headless=new` por CDP desde
Node 24, perfil nuevo por navegador, cuenta demo, `VITE_USE_MOCK_API=true npx vite --port 5191`.
`cdp.mjs` es el de 3.1 con `?.` en `loginDemo`, capturas JPEG y un `on(evento, fn)` para eventos
CDP. "3G lenta": `Network.emulateNetworkConditions` (2000 ms, 50 kB/s) con un observador que
anota cada texto de la nota de "Proponer sesión" desde el arranque del documento. Disponibilidad
propia lenta o fallida: el script intercepta con `Fetch.requestPaused` el módulo simulado que
sirve Vite (`services/mock/mockApi.ts`) y sustituye, solo en ese navegador, la línea de
`getAvailability` por una que espera `window.__ownDelay` ms y responde 500 sin cuerpo mientras
`window.__ownFail` es verdadero (el código no se toca). La propuesta esperada se calcula en el
script sin el código de la app (plan 3.1) y se contrasta además con `buildProposal` (007)
importado del servidor de desarrollo.

**Primer resultado, antes de P64 (`node check.mjs ./out`, 21/22):**

```
OK    jugador semilla con cruce proponible en su segunda pestaña — user-2 (Isidora Campos), cs2; esperado {cs2, día 1, 21:00, 3 h, "Sesión con Isidora Campos", 5, ""}
OK    cruce proponible: botón habilitado, sin aria-disabled ni motivo
      dirección en la agenda: /agenda?juego=lol
FALLA la agenda abre el formulario con juego, primer bloque proponible, duración, título, 5 cupos y notas vacías — formulario sin abrir
OK    la esperada coincide con buildProposal de la 007 — {"gameId":"cs2","day":1,"startHour":21,"durationHours":3,...}
OK    "Proponer sesión" deja una entrada nueva (push) en el historial — 2/3 → 3/4
OK    "Atrás" vuelve a la ficha en su pestaña — ["/jugadores/user-2?juego=cs2","Counter-Strike 2"]
OK    dos clics seguidos: una sola entrada nueva — 2/4 → 3/4
OK    doble clic del ratón: una sola entrada nueva
OK    motivo 2: CS2 sin cuenta propia, con enlace a Configuración — aria-disabled="true", sin disabled, nota `p.note` enlazada por aria-describedby, enlace /configuracion
OK    clic en el botón bloqueado: sin efecto — historial 4 → 4
OK    el botón bloqueado recibe el foco con Tab y su descripción es el motivo
OK    el enlace del motivo 2 lleva a Configuración
OK    motivo 3: "No has marcado tus horas" con enlace a Configuración
OK    motivo 5: "No tienen horas en común", sin enlace
OK    motivo 1: "Este jugador no ha vinculado ningún juego", sin enlace
OK    "3G lenta": se ve "Cargando los datos para proponer una sesión…" antes de habilitarse — ["Cargando los datos para proponer una sesión…","(sin nota)"]
OK    disponibilidad propia lenta, ficha ya cargada: "Cargando los datos para proponer una sesión…" y aria-disabled
OK    al llegar la disponibilidad propia, el botón se habilita
OK    disponibilidad propia bloqueada (500): "No se pudieron cargar los datos para proponer una sesión." y aria-disabled
OK    tras "Reintentar" de las horas, "Proponer sesión" se habilita
OK    el parche del módulo simulado se aplicó — 3 respuestas
OK    sin errores de consola (salvo avisos de React Router y los del 500 provocado) — []
RESUMEN: 21/22 OK
```

**Bloqueo (fuera de los archivos de T8).** La ficha navega bien: `history.pushState` recibe
`/agenda` con `usr.proposal` = `{gameId:"cs2",day:1,startHour:21,durationHours:3,title:"Sesión
con Isidora Campos",slots:5,notes:""}`. Justo después, el efecto de `usePlayerTab`
(`features/players/usePlayerTab.ts`, T4) hace `setSearchParams({ juego: 'lol' }, { replace:
true })` sobre `/agenda` (pila capturada: `replaceState` ← `react-router-dom` ←
`usePlayerTab.ts:14` ← `commitHookEffectListMount`), y la entrada queda en `/agenda?juego=lol`
con `usr: null`: cuando la agenda (diferida) se monta, `location.state` ya no tiene propuesta y
no abre el formulario. Causa: `AppLayout` envuelve la salida en `AnimatePresence mode="wait"`
con `key={location.pathname}`; la ficha que sale sigue montada durante la animación de salida
con `useParams` congelado pero `useSearchParams` ya leyendo la dirección nueva, sin `?juego=`,
así que `resolveTab` da `mustReplace` y corrige "la dirección" de la agenda. Desde coincidencias
no pasa (su página no tiene ese efecto). Efecto colateral del mismo defecto: cualquier salida de
la ficha deja `?juego=<primer juego>` en la dirección de destino: desde
`/jugadores/user-2?juego=cs2`, el enlace "Perfil" del menú llevó a `/perfil?juego=lol`
(comprobado con `dbg10.mjs`, scratchpad).

**Comprobación del diagnóstico (solo en el navegador, sin tocar el código).** Sustituyendo en el
módulo servido `if (!mustReplace) return;` por
`if (!mustReplace || !window.location.pathname.startsWith('/jugadores/')) return;`, "Proponer
sesión" abre la agenda en `/agenda` con el formulario: juego `cs2`, día `1` (martes), hora `21`,
duración `3`, título "Sesión con Isidora Campos", cupos `5`, notas vacías, igual que lo
esperado.

**Decisión y corrección (P64).** El usuario eligió "Arreglar usePlayerTab" (sin tocar
`AppLayout`). `usePlayerTab` calcula `onPlayerRoute = useMatch(ROUTES.player) !== null` (lee la
dirección vigente, no la congelada de la página saliente) y solo actúa si es verdadero: el
efecto de corrección hace `if (!onPlayerRoute || !mustReplace) return;` y `selectTab` hace
`if (!onPlayerRoute || tab === null || gameId === tab) return;` (más `onPlayerRoute` en las
dependencias de los dos). Nada más cambia: dentro de la ficha la ruta siempre coincide y el
comportamiento de T4/T6 es el mismo.

**Resultado tras P64 (`node check.mjs ./out`, 27/27).** Al script se añadieron la comprobación
de la dirección de la agenda y la regresión de salir de la ficha por el menú (sección "R"):

```
OK    jugador semilla con cruce proponible en su segunda pestaña — user-2 (Isidora Campos), cs2; esperado {cs2, día 1, 21:00, 3 h, "Sesión con Isidora Campos", 5, ""}
OK    cruce proponible: botón habilitado, sin aria-disabled ni motivo
OK    la dirección de la agenda queda /agenda sin ?juego= (P64) — /agenda
OK    la agenda abre el formulario con juego, primer bloque proponible, duración, título, 5 cupos y notas vacías — formulario {"gameId":"cs2","day":"1","startHour":"21","durationHours":"3","title":"Sesión con Isidora Campos","slots":"5","notes":""} · esperado igual
OK    la esperada coincide con buildProposal de la 007
OK    "Proponer sesión" deja una entrada nueva (push) en el historial — 2/3 → 3/4
OK    "Atrás" vuelve a la ficha en su pestaña — ["/jugadores/user-2?juego=cs2","Counter-Strike 2"]
OK    dos clics seguidos: una sola entrada nueva — 2/4 → 3/4
OK    doble clic del ratón: una sola entrada nueva — 2/4 → 3/4
OK    menú "Perfil" desde la ficha: /perfil sin ?juego= y una sola entrada nueva — /perfil · 4/5 → 5/6
OK    menú "Coincidencias" desde la ficha: /coincidencias sin ?juego= y una sola entrada nueva — /coincidencias · 6/7 → 7/8
OK    menú "Agenda" desde la ficha: /agenda sin ?juego= y una sola entrada nueva — /agenda · 8/9 → 9/10
OK    ficha corregida y salida a Perfil: /perfil sin ?juego= — /perfil
OK    motivo 2: CS2 sin cuenta propia, con enlace a Configuración
OK    clic en el botón bloqueado: sin efecto — 13 → 13
OK    el botón bloqueado recibe el foco con Tab y su descripción es el motivo — desde BUTTON.tabs__tab → DIV.player-panel → A → BUTTON.btn (12 pulsaciones)
OK    el enlace del motivo 2 lleva a Configuración
OK    motivo 3: "No has marcado tus horas" con enlace a Configuración
OK    motivo 5: "No tienen horas en común", sin enlace
OK    motivo 1: "Este jugador no ha vinculado ningún juego", sin enlace
OK    "3G lenta": se ve "Cargando los datos para proponer una sesión…" antes de habilitarse — ["Cargando los datos para proponer una sesión…","(sin nota)"]
OK    disponibilidad propia lenta, ficha ya cargada: "Cargando los datos para proponer una sesión…" y aria-disabled
OK    al llegar la disponibilidad propia, el botón se habilita
OK    disponibilidad propia bloqueada (500): "No se pudieron cargar los datos para proponer una sesión." y aria-disabled
OK    tras "Reintentar" de las horas, "Proponer sesión" se habilita
OK    el parche del módulo simulado se aplicó — 3 respuestas
OK    sin errores de consola (salvo avisos de React Router y los del 500 provocado) — []
RESUMEN: 27/27 OK
```

**Rojo antes del verde.** Con el mismo script y `usePlayerTab` sin la guarda (solo en el
servidor de desarrollo, restaurado después) fallan exactamente las 6 comprobaciones nuevas o
afectadas: agenda en `/agenda?juego=lol`, formulario sin abrir, y `/perfil?juego=lol`,
`/coincidencias?juego=lol`, `/agenda?juego=lol` y `/perfil?juego=lol` al salir por el menú
(21/27).

**Regresión de T6.** El `check.mjs` de T6 (sección 3.1) se repitió entero con la corrección
(servidor de desarrollo y una construcción simulada nueva servida con `vite preview`): 50/50.
Incluye los puntos que dependen de `usePlayerTab`: `?juego=xyz`, `?juego=r6` (juego sin
cuenta), `?juego=LOL` y `?juego=constructor` corrigen a `?juego=lol` con `replace`; cambiar de
pestaña por clic y por teclado no añade entradas; "Atrás" tras cambiar de pestaña sale de la
ficha; jugador sin cuentas queda sin `?juego=` (replace); RF-19 vuelve a CS2 con `replace`;
tras el login vuelve a `?juego=lol`.

**Revisión de código.**
- `ProposeSessionAction`: recibe `ProposeState`. `ready` → botón `btn btn--pen` sin
  `aria-disabled` y `navigate(ROUTES.schedule, { state: { proposal } })` protegido por la
  referencia `proposing`. Resto → `aria-disabled="true"` (no `disabled`), sin `onClick`,
  `aria-describedby` al `<p className="note">` con: `PROPOSE_LOADING_TEXT` (carga),
  `PROPOSE_FAILED_TEXT` (fallo), `PLAYER_NO_GAMES_TEXT` (motivo 1),
  `linkAccountToProposeText(GAMES[g].shortName)` como `Link` a `/configuracion` (motivo 2),
  `PROPOSAL_BLOCK_REASONS.noOwnHours` como `Link` (motivo 3) y `PROPOSAL_BLOCK_REASONS[reason]`
  (4 a 6). Rama defensiva: motivo 2 sin juego → texto de carga (no se da, plan 3.2).
- `PlayerPage`: `proposeState({ gameId: tab, displayName, theirAccounts: cuentas del jugador,
  myAccounts, myBlocks, theirBlocks })` con los mismos `toLoadable` que el bloque de cruce;
  `PlayerSheetLoading` usa `ProposeSessionAction` con `{ kind: 'loading' }` en lugar del botón
  provisional de T6. La ficha no toca la agenda.
- `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\('` en los dos archivos: sin resultados. Textos
  de interfaz nuevos: ninguno fuera de `copy.ts` (los únicos literales que aparecen son
  comentarios). `grep -rnE "dangerouslySetInnerHTML|: any\b|as any|@ts-ignore|\.only\("` en
  `features/players`: sin resultados.
- `usePlayerTab` (P64): la guarda `onPlayerRoute` está en el efecto y en `selectTab`; no hay
  otra escritura de `?juego=` en `features/players`.
- `npm run typecheck`, `npm run lint` y `npm run build`: en verde (repetidos tras P64).

**No comprobado y por qué.** El anuncio del lector de pantalla (nombre y descripción al recibir
el foco) se comprobó solo como `aria-describedby` que apunta a la nota del motivo; NVDA, en T10.
Los motivos 4 y 6 no se recorrieron en pantalla (misma rama de código que el 5; cubiertos por
`proposeState` en T1, 1.1).

Capturas (`specs/008-ficha-de-jugador/validation/t8/`, JPEG, de la pasada tras P64):
`agenda-propuesta-1280.jpg` (agenda con el formulario relleno), `motivo2-1280.jpg`,
`cargando-1280.jpg` (disponibilidad propia lenta) y `fallo-1280.jpg` (disponibilidad propia
con 500). Scripts `cdp.mjs` y `check.mjs` en el scratchpad (no versionados).

### 3.4 T9 — enlaces desde coincidencias y agenda, textos desde `copy.ts` y paso 14 de `users.rest` (2026-10-20)

RF-2, RF-6, RF-7, RF-15, RF-17, RF-20, RNF-2, RNF-3. Archivos:
`frontend/src/features/matches/components/MatchEntry.tsx`,
`frontend/src/features/sessions/components/SessionSlip.tsx`, `backend/requests/users.rest`.
`copy.ts` no se toca: antes de sustituir se comprobó que existen `NO_DATA_TEXT = 'Sin datos'`
(`copy.ts:13`, T2) y `NO_SHARED_HOURS_TEXT = 'Sin horas en común esta semana.'` (`copy.ts:76`, T6).

**Cambio.** `MatchEntry`: dentro del mismo `<strong>` (se conserva el peso 600 y el
`letter-spacing` de `.entry__who strong`), el nombre es
`<Link to={playerPath(candidate.user.id, candidate.gameId)}>`. `SessionSlip`: dentro del mismo
`<span className="session__name">`, `<Link to={playerPath(participant.id, session.gameId)}>`,
también para el participante propio (la ficha propia redirige a `/perfil`, T6). Texto del
enlace = nombre visible como texto. Sin CSS nuevo: color, subrayado y foco son los estilos de
enlace existentes de `styles/global.css` (`a`, `a:hover`, `:focus-visible`).

**Revisión del `git diff` de `MatchEntry.tsx` (P61, P62).** Las tres sustituciones son de
texto literal por constante, en el mismo elemento y con la misma clase:

```
-            <span className="note note--faint">Sin datos</span>
+            <span className="note note--faint">{NO_DATA_TEXT}</span>
-          <span className="note note--faint">Sin datos</span>
+          <span className="note note--faint">{NO_DATA_TEXT}</span>
-                <p className="note note--faint">Sin horas en común esta semana.</p>
+                <p className="note note--faint">{NO_SHARED_HOURS_TEXT}</p>
```

Import: `import { NO_DATA_TEXT, NO_SHARED_HOURS_TEXT, PROPOSAL_BLOCK_REASONS } from
'@/shared/utils/copy';`. El comentario "Defensivo (RF-14)" no cambia. El resto del diff de los
dos componentes son los dos enlaces y sus imports (`Link`, `playerPath`).

**grep.**

```
$ grep -rn "Sin horas en común esta semana" frontend/src
frontend/src/shared/utils/copy.ts:76:export const NO_SHARED_HOURS_TEXT = 'Sin horas en común esta semana.';
$ grep -n "Sin datos" frontend/src/features/matches/components/MatchEntry.tsx
(sin resultados)
$ grep -rn "Sin datos" frontend/src
frontend/src/features/players/components/RankDistanceBlock.tsx:26: * - RF-17: "Sin datos" desde `copy.ts` (P62).
frontend/src/features/profile/components/GameSummaryPanel.tsx:40:  // llegara una no se muestra ni se calcula ningún valor derivado: aparece "Sin datos".
frontend/src/features/profile/components/AccountRow.tsx:38:  // se muestra "Sin datos" y ningún valor derivado.
frontend/src/shared/utils/copy.ts:13:export const NO_DATA_TEXT = 'Sin datos';
frontend/src/domain/rankProgress.ts:9: * `null` si la cuenta no trae historial: la interfaz muestra "Sin datos" (RF-14, caso
```

Un solo resultado de código para cada texto, en `copy.ts`; el resto son comentarios.

**Método en pantalla.** Igual que T6 a T8: Chrome `--headless=new` por CDP desde Node 24 con
`cdp.mjs` (3.3), perfil nuevo por navegador, cuenta demo, `VITE_USE_MOCK_API=true npx vite
--port 5191`. Script `t9.mjs` en el scratchpad (no versionado): `node t9.mjs before|after
<carpeta>`. Capturas antes y después a 1280 y 360 px de coincidencias (pestaña inicial) y de
la agenda con la primera sesión del calendario abierta (la ficha de sesión solo aparece al
elegir una; la demo no está en ninguna sesión semilla). Las capturas "antes" se tomaron con
`MatchEntry.tsx` y `SessionSlip.tsx` devueltos temporalmente a `HEAD` (`git checkout` de esos
dos archivos; copia del cambio en el scratchpad y restaurada después, `git diff --stat`
comprobado). Comprobaciones (solo "after"): cada fila de las tres pestañas de coincidencias
(enlace dentro de `<strong>`, texto = nombre visible del usuario en la base simulada, `href`
`/jugadores/<id>?juego=<juego de la pestaña>` y el jugador tiene cuenta en ese juego); clic
real en un nombre; Tab desde el principio hasta el primer enlace de nombre (`:focus-visible` y
contorno); cajón de una fila sin horas en común si existe; en la agenda, cada una de las 9
sesiones del calendario: un enlace por participante, en orden, con `href`
`/jugadores/<id>?juego=<juego de la sesión>` (sesión identificada por título y participantes,
porque varias semilla comparten título); la demo se une a una sesión con cupo para tener el
nombre propio, clic en él → `/perfil`; clic en otro participante → su ficha en el juego de la
sesión; Tab hasta un enlace de participante. Avisos de consola filtrados: solo los "React
Router Future Flag Warning" de siempre.

**Resultado (`node t9.mjs after …/validation/after`, 15/15):**

```
OK    sin errores de consola (after, 1280 px; filtrados los avisos Future Flag)
OK    sin errores de consola (after, 360 px; filtrados los avisos Future Flag)
OK    coincidencias, pestaña League of Legends: 5 filas con enlace al jugador en ese juego — Fernanda Soto → /jugadores/user-9?juego=lol · Isidora Campos → /jugadores/user-2?juego=lol · Renata Bustos → /jugadores/user-3?juego=lol
OK    coincidencias, pestaña Rainbow Six Siege: 5 filas con enlace al jugador en ese juego — Felipe Navarro → /jugadores/user-10?juego=r6 · Antonia Herrera → /jugadores/user-7?juego=r6 · Milagros Quiroz → /jugadores/user-13?juego=r6
OK    coincidencias, pestaña Counter-Strike 2: 5 filas con enlace al jugador en ese juego — Milagros Quiroz → /jugadores/user-13?juego=cs2 · Cristóbal Lagos → /jugadores/user-5?juego=cs2 · Felipe Navarro → /jugadores/user-10?juego=cs2
OK    varias filas y varios juegos comprobados — 15 filas, juegos lol, r6, cs2
OK    clic en el nombre abre la ficha en el juego de la coincidencia — /jugadores/user-13?juego=cs2 · {"h1":"Milagros Quiroz","tab":"Counter-Strike 2"}
OK    coincidencias: el enlace del nombre se alcanza con Tab y tiene foco visible — {"presses":17,"text":"Fernanda Soto","visible":true,"outline":"solid 2px rgb(205, 242, 75)"}
OK    ninguna fila sin horas en común en el simulado (vale la revisión del diff)
OK    agenda: el nombre de cada participante enlaza a su ficha en el juego de la sesión — 33 participantes en 9 sesiones, juegos lol, r6, cs2
OK    agenda: hay un enlace al nombre propio — /jugadores/user-1?juego=lol
OK    el nombre propio lleva al perfil — /perfil
OK    agenda: clic en un participante abre su ficha en el juego de la sesión — /jugadores/user-4?juego=lol · Emilia Vargas
OK    agenda: el enlace del participante se alcanza con Tab y tiene foco visible — {"presses":121,"text":"Emilia Vargas","visible":true,"outline":"solid 2px rgb(205, 242, 75)"}
OK    sin errores de consola (comprobaciones; filtrados los avisos Future Flag)
```

(Pasada "before": 2/2, sin errores de consola.) Dos fallos de una pasada previa eran del script,
no de la app (sesiones identificadas solo por título, que se repite en la semilla; y 80
pulsaciones de Tab, insuficientes para cruzar la rejilla del calendario); se corrigió el script.

**Antes y después.** Mismas dimensiones de página en cada par (coincidencias 1280×1166 y
361×2259; agenda 1280×1268 y 360×1917). Revisadas a ojo las de 1280: lo único que cambia es el
nombre, que pasa al color de enlace con subrayado y conserva peso y tamaño; ni filas, ni
columnas, ni la ficha de sesión se desplazan. El ancho 361 de coincidencias a 360 px es igual
antes y después (no lo introduce T9). Cajón "Sin horas en común esta semana.": en el simulado
ninguna fila de coincidencias tiene 0 horas en común (el servicio no las devuelve), así que
vale la revisión del diff; "Sin datos" en coincidencias es defensivo y el simulado no lo
produce: también solo revisión del diff.

**Paso 14 de `users.rest` (P45).** Añadido tras el 13, con el mismo formato (`### n.`, `#
@name`, `X-CSRF-Token: {{loginD.response.headers.X-CSRF-Token}}`): variables `@emailD` /
`@passwordD` (datos de ejemplo), comentario que pide registrar antes a D con el paso 1 de
`auth.rest` y avisa de que su inicio de sesión sustituye la cookie, "### 14." inicio de sesión
de D (`# @name loginD`) y "### 14 (continuación)." `PATCH /api/users/me` con cuerpo
`{ "displayName": "Jugador\tD" }`. Revisado a mano: el archivo no contiene ningún tabulador real
(`grep -c $'\t'` → 0); `\t` está escrito como barra invertida + `t` dentro de la cadena JSON.
**Ejecutado** contra el servidor de desarrollo (`node src/index.ts` en `backend/`, `.env` local,
MongoDB local en 27017, base `teammatchup`), con `curl` y el cuerpo extraído literalmente del
archivo:

```
0. registro previo de D (paso 1 de auth.rest con los datos de D) → HTTP 201
14. POST /api/auth/login (D) → HTTP 200, X-CSRF-Token de 36 caracteres
14. PATCH /api/users/me, cuerpo {"displayName": "Jugador\tD"} → HTTP 200
{"id":"6ad8015d08addf070eae5e01","username":"JugadorDEjemplo","displayName":"Jugador\tD","avatarColor":"#6d5efc","bio":"","timezone":"America/Santiago","createdAt":"2026-10-21T00:03:42.000Z","email":"jugador.d.ejemplo@example.com"}
displayName (repr en Python): 'Jugador\tD'  → el tabulador interior se guarda tal cual
```

D queda creado en la base local de desarrollo para el registro de T10 (parte de interfaz con E:
"Proponer sesión" y el error del título, sección 4, "Fuera del orden"). `git diff --stat
backend/` → solo `backend/requests/users.rest | 28 ++++` (`git status --short backend/` → `M
backend/requests/users.rest`).

**Verificación estándar.** `cd frontend && npm run typecheck && npm run lint && npm run build`:
exit 0 los tres; sin errores de consola en el navegador (solo los avisos Future Flag de
siempre). Servidores (Vite, backend) y Chrome cerrados al terminar.

Capturas (JPEG, calidad 70): `validation/before/` y `validation/after/`
`t9-coincidencias-1280.jpg`, `t9-coincidencias-360.jpg`, `t9-agenda-1280.jpg`,
`t9-agenda-360.jpg`; solo en `after/`: `t9-coincidencias-foco-1280.jpg`,
`t9-agenda-propio-1280.jpg` y `t9-agenda-foco-1280.jpg`. En las dos de foco, la barra fija y el
enlace "Saltar al contenido" aparecen a media página por la captura de página completa tras
desplazar con Tab; no es un defecto de la página.

## 4. Registro de T10 (2026-10-20)

Tarea T10 (validación: revisiones de código y registro en el orden de P42). **En T10 no se
corrigió nada**: cada fallo queda anotado como defecto o como posible cambio de spec
(sección 4.8). Ningún archivo de `frontend/` ni de `backend/` cambió en esta tarea (`git
status --short` igual al del inicio; `git diff --stat backend/` → solo `requests/users.rest`,
de T9).

### 4.0 Entorno y método

- Fecha: 2026-10-20, de 21:11 a 21:41 (hora local, UTC−3). Rama `marselo`, commit de partida
  `d08b393` más los cambios sin versionar de T1–T9.
- **Base de datos (decisión del usuario 1):** la base `teammatchup` **no se tocó**. El
  servidor se arrancó con una base nueva y vacía, `teammatchup_val008`, cambiando solo el
  nombre por variable de entorno al lanzar el proceso, sin editar `backend/.env` ni código:
  `MONGODB_DBNAME=teammatchup_val008 node src/index.ts` en `backend/` (`config.ts` deja que
  `process.env` gane a `.env`). Antes de empezar, `listDatabases` daba `admin config local
  teammatchup teammatchup_test` (la de validación no existía); tras crear A, B y C,
  `teammatchup_val008` tenía `users 3`, `gameaccounts 5`, `playsessions 0`. **La base
  `teammatchup_val008` se deja en MongoDB** (no se borró); se puede eliminar cuando se quiera.
- Interfaz: `VITE_USE_MOCK_API=false VITE_PROXY_TARGET=http://localhost:3001 npx vite --port
  5192` (modo simulado desactivado, proxy al servidor real del puerto 3001 de `.env`). Modo
  simulado: `VITE_USE_MOCK_API=true VITE_PROXY_TARGET=http://localhost:3999 npx vite --port
  5193` (proxy a un puerto sin nada, para que cualquier petición a `/api` fallara).
- Navegador: Chrome headless por CDP desde Node 24.19.0, perfil nuevo por navegador, con el
  arnés `lib.mjs` (derivado de `cdp.mjs` de T6: varias pestañas por navegador, registro de
  red, bloqueo de URL con `Network.setBlockedURLs`, limitación con
  `Network.emulateNetworkConditions`, diálogos `confirm` aceptados, teclado con
  `Input.dispatchKeyEvent`). Scripts en el scratchpad, no versionados; su texto está en 4.9.
- **Datos (creados por la API real, `setup.mjs`, 21:11):** A, B y C registrados con `POST
  /api/users`; zona y biografía con `PATCH /api/users/me`; cuentas con `POST /api/accounts`;
  horas con `PUT /api/users/me/availability`. Identificadores de ejemplo del plan 004, 4.4,
  elegidos calculando antes el rango simulado de la lectura 0 con las funciones del servidor
  (`stepAt`, `normalizeStep`, `isVerified`):

  | Jugador | Zona | LoL | R6 | CS2 | Horas guardadas |
  | --- | --- | --- | --- | --- | --- |
  | A (Ana Val) | America/Argentina/Buenos_Aires | `jugador1#las` · Emerald II · 73 · verificada | `jugador3` · Platinum II · 66 · sin verificar | (parte 4) `76561190000000001` · Red · 83 · verificada | lun 15, mar 20-21-22, jue 03 |
  | B (Bruno Val), bio `<b>x</b>` | America/Argentina/Buenos_Aires | `jugador2#las` · Platinum I · 63 · sin verificar | `jugador1` · Emerald II · 80 · sin verificar | `76561190000000003` · Gold · 100 · verificada | mar 20-21-22, jue 03, vie 18 |
  | C (Carla Val) | America/Sao_Paulo | — | — | — | ninguna |

  Distancias A–B: **LoL 10**, **R6 14**, **CS2 17** (desde la parte 4). En común A–B:
  exactamente martes 20:00, 21:00, 22:00 y jueves 03:00. No hizo falta el respaldo de P37/P38
  (mismo identificador): `jugador1#las` y `jugador2#las` dan 10 ≤ 25. Nadie resincronizó.
  Salida de `setup.mjs`:

```
2026-10-21T00:11:08.664Z A POST /api/users 201 6ad8031c6f785278afeeb03c
2026-10-21T00:11:08.736Z A POST /api/auth/login 200
2026-10-21T00:11:08.754Z A PATCH /api/users/me {"timezone":"America/Argentina/Buenos_Aires"} 200
2026-10-21T00:11:08.774Z A POST /api/accounts lol jugador1#las 201 rango {"tier":"Emerald","division":"II","points":59,"normalized":73,"recordedAt":"2026-10-21T00:11:08.758Z"} verified true simulated true
2026-10-21T00:11:08.791Z A POST /api/accounts r6 jugador3 201 rango {"tier":"Platinum","division":"II","points":3353,"normalized":66,"recordedAt":"2026-10-21T00:11:08.778Z"} verified false simulated true
2026-10-21T00:11:08.797Z A PUT /api/users/me/availability ["1-20","1-21","1-22","3-3","0-15"] 200 ["1-20","1-21","1-22","3-3","0-15"]
2026-10-21T00:11:08.861Z B POST /api/users 201 6ad8031c6f785278afeeb04f
2026-10-21T00:11:08.918Z B POST /api/auth/login 200
2026-10-21T00:11:08.925Z B PATCH /api/users/me {"timezone":"America/Argentina/Buenos_Aires","bio":"<b>x</b>"} 200
2026-10-21T00:11:08.935Z B POST /api/accounts lol jugador2#las 201 rango {"tier":"Platinum","division":"I","points":50,"normalized":63,"recordedAt":"2026-10-21T00:11:08.927Z"} verified false simulated true
2026-10-21T00:11:08.944Z B POST /api/accounts r6 jugador1 201 rango {"tier":"Emerald","division":"II","points":3836,"normalized":80,"recordedAt":"2026-10-21T00:11:08.938Z"} verified false simulated true
2026-10-21T00:11:08.951Z B POST /api/accounts cs2 76561190000000003 201 rango {"tier":"Gold","points":31789,"normalized":100,"recordedAt":"2026-10-21T00:11:08.946Z"} verified true simulated true
2026-10-21T00:11:08.956Z B PUT /api/users/me/availability ["1-20","1-21","1-22","3-3","4-18"] 200 ["1-20","1-21","1-22","3-3","4-18"]
2026-10-21T00:11:09.018Z C POST /api/users 201 6ad8031d6f785278afeeb067
2026-10-21T00:11:09.076Z C POST /api/auth/login 200
2026-10-21T00:11:09.084Z C PATCH /api/users/me {"timezone":"America/Sao_Paulo"} 200
```

- **"Sin Internet":** no se pudo cortar Internet en esta máquina (el registro de npm responde y
  `npx -y lighthouse@12.8.2` se descargó a la caché de npx para la auditoría). En su lugar se
  comprobó que la interfaz no hace peticiones a dominios externos: en el título con tabulador
  (servidor real) y en el modo simulado, todos los destinos de red son `localhost:5192` /
  `localhost:5193` o URL `data:` (fuentes e imágenes en línea).
- Las líneas "FALLA" que aparecen en alguna salida y se marcan como "del script" son
  comprobaciones mal escritas (por ejemplo, texto en mayúsculas por CSS en `innerText`); en
  cada caso la salida muestra el contenido correcto y la comprobación se repitió corregida.

### 4.A Parte A — revisiones de código y comprobaciones con Node (plan 6.2)

**Comprobaciones con Node de T1, T2 y T3 sobre el código final** (mismos scripts y mismo
gancho pegados en 1.0–1.3; antes de ejecutarlos se verificó que cada línea de los
`check.mjs`, `hooks.mjs` y `register.mjs` del scratchpad está en este archivo: 0 líneas
distintas):

```
$ TMU_SRC=<repo>/frontend/src node --import ./register.mjs --test check.mjs          (T1)
ℹ tests 40 · ℹ pass 40 · ℹ fail 0
$ TMU_SRC=<repo>/frontend/src node --import ./register.mjs --test check.mjs          (T2)
ℹ tests 11 · ℹ pass 11 · ℹ fail 0
$ TMU_SRC=<repo>/frontend/src node --experimental-transform-types --import ./register.mjs --test check.mjs   (T3)
ℹ tests 16 · ℹ pass 16 · ℹ fail 0   (solo el aviso ExperimentalWarning de Transform Types)
```

**Búsquedas** (`NEW` = `frontend/src/features/players`, `domain/playerSheet.ts`,
`features/profile/components/GameSummaryPanel.tsx`, `services/mock/mockUserTarget.ts`,
`shared/utils/tabKeys.ts`; `playerPage.css` está dentro de `features/players/pages/`):

```
$ grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(" $NEW
(sin resultados)

$ grep -rnE "dangerouslySetInnerHTML|innerHTML" frontend/src
(sin resultados)

$ grep -rnE ": any\b|as any\b|@ts-ignore|@ts-expect-error|\.only\b" frontend/src
(sin resultados)

$ grep -rnE "Riot|Ubisoft|Valve|Steam|FACEIT|Leetify" frontend/src/features/players frontend/src/features/profile/components/GameSummaryPanel.tsx frontend/src/features/profile/components/AccountRow.tsx frontend/src/shared/components/RankScale.tsx
frontend/src/features/profile/components/AccountRow.tsx:21:  /** Antepone al identificador su etiqueta de formato ("Riot ID", "Ubisoft ID", "SteamID64"; spec 008, RF-4). */

$ grep -rniE "verificado" frontend/src/features/players frontend/src/features/profile/components/GameSummaryPanel.tsx frontend/src/features/profile/components/AccountRow.tsx frontend/src/shared/utils/copy.ts
(sin resultados)

$ grep -rn "Sin rango\|R6 sin rango" frontend/src
(sin resultados)

$ grep -rn "Sin horas en común esta semana" frontend/src
frontend/src/shared/utils/copy.ts:76:export const NO_SHARED_HOURS_TEXT = 'Sin horas en común esta semana.';

$ grep -rn "NO_SHARED_HOURS_TEXT" frontend/src
frontend/src/features/players/components/SharedHoursBlock.tsx:6:import { NO_SHARED_HOURS_TEXT, ZONES_DIFFER_NOTE } from '@/shared/utils/copy';
frontend/src/features/players/components/SharedHoursBlock.tsx:83:        <p className="note player-hours__empty">{NO_SHARED_HOURS_TEXT}</p>
frontend/src/features/matches/components/MatchEntry.tsx:19:import { NO_DATA_TEXT, NO_SHARED_HOURS_TEXT, PROPOSAL_BLOCK_REASONS } from '@/shared/utils/copy';
frontend/src/features/matches/components/MatchEntry.tsx:192:                <p className="note note--faint">{NO_SHARED_HOURS_TEXT}</p>
frontend/src/shared/utils/copy.ts:76:export const NO_SHARED_HOURS_TEXT = 'Sin horas en común esta semana.';

$ grep -rn "Sin datos" frontend/src
frontend/src/features/players/components/RankDistanceBlock.tsx:26: * - RF-17: "Sin datos" desde `copy.ts` (P62).
frontend/src/features/profile/components/GameSummaryPanel.tsx:40:  // llegara una no se muestra ni se calcula ningún valor derivado: aparece "Sin datos".
frontend/src/features/profile/components/AccountRow.tsx:38:  // se muestra "Sin datos" y ningún valor derivado.
frontend/src/shared/utils/copy.ts:13:export const NO_DATA_TEXT = 'Sin datos';
frontend/src/domain/rankProgress.ts:9: * `null` si la cuenta no trae historial: la interfaz muestra "Sin datos" (RF-14, caso

$ grep -rln "NO_DATA_TEXT" frontend/src | sort
frontend/src/domain/rankProgress.ts
frontend/src/features/matches/components/MatchEntry.tsx
frontend/src/features/players/components/RankDistanceBlock.tsx
frontend/src/features/profile/components/AccountRow.tsx
frontend/src/features/profile/components/GameSummaryPanel.tsx
frontend/src/shared/utils/copy.ts

$ grep -rn "fetch(" frontend/src
frontend/src/features/players/pages/PlayerPage.tsx:104:    return <Failure error={userQuery.error} onRetry={() => void userQuery.refetch()} />;
frontend/src/features/players/pages/PlayerPage.tsx:115:        onRetryAccounts={() => void accountsQuery.refetch()}
frontend/src/features/players/pages/PlayerPage.tsx:120:        onRetrySummary={() => void summaryQuery.refetch()}
frontend/src/features/players/pages/PlayerPage.tsx:145:              onRetryOwnAccounts={() => void ownAccountsQuery.refetch()}
frontend/src/features/players/pages/PlayerPage.tsx:147:              onRetrySummary={() => void summaryQuery.refetch()}
frontend/src/features/players/pages/PlayerPage.tsx:153:            onRetryMine={() => void ownHoursQuery.refetch()}
frontend/src/features/players/pages/PlayerPage.tsx:156:            onRetryTheirs={() => void theirHoursQuery.refetch()}
frontend/src/features/players/hooks.ts:16: * `refetch()` de "Reintentar" y el de RF-19.
frontend/src/features/players/hooks.ts:123: * - Con datos → `ready` (también durante un `refetch()`: RF-19 conserva las pestañas).
frontend/src/features/players/useSummaryRecheck.ts:18: *   Las pestañas no cambian mientras tanto (el `refetch()` conserva las cuentas previas).
frontend/src/features/matches/pages/MatchesPage.tsx:132:            <Failure error={matchesQuery.error} onRetry={() => matchesQuery.refetch()} />
frontend/src/features/sessions/pages/SchedulePage.tsx:184:          onRetry={() => accountsQuery.refetch()}
frontend/src/features/sessions/pages/SchedulePage.tsx:245:              <Failure error={sessionsQuery.error} onRetry={() => sessionsQuery.refetch()} />
frontend/src/features/profile/pages/SettingsPage.tsx:179:            <Failure error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
frontend/src/features/profile/pages/SettingsPage.tsx:250:          <Failure error={availabilityQuery.error} onRetry={() => availabilityQuery.refetch()} />
frontend/src/features/profile/pages/ProfilePage.tsx:113:          <Failure error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} />
frontend/src/features/profile/pages/ProfilePage.tsx:141:              <Failure error={summaryQuery.error} onRetry={() => summaryQuery.refetch()} />
frontend/src/services/http/httpClient.ts:57:    const response = await fetch(url, {

$ grep -nE "Date|from .react|fetch|useState|useEffect" frontend/src/domain/playerSheet.ts
(sin resultados)

$ grep -nE "^import" frontend/src/domain/playerSheet.ts
7:import { groupBlocks, intersectBlocks } from './availability';
8:import type { BlockRange } from './availability';
9:import { GAME_IDS } from './games';
10:import { rankDistance } from './matching';
11:import { blockReason, buildProposal } from './proposal';
12:import type { BlockReason, Proposal } from './proposal';
13:import type { GameId, TimeBlock } from './types';

$ grep -rnE "staleTime|refetchOnMount|refetchInterval|refetchOnWindowFocus|refetchOnReconnect|useQuery|useQueries" frontend/src/features/players
frontend/src/features/players/hooks.ts:2:import { useQuery } from '@tanstack/react-query';
frontend/src/features/players/hooks.ts:13: * RF-26: las 7 consultas usan una clave por visita, `staleTime: Infinity` y
frontend/src/features/players/hooks.ts:14: * `refetchOnMount: false`; ninguna se refresca sola (los globales de la 007 ya quitan
frontend/src/features/players/hooks.ts:24:  staleTime: Infinity,
frontend/src/features/players/hooks.ts:25:  refetchOnMount: false,
frontend/src/features/players/hooks.ts:42:  return useQuery({
frontend/src/features/players/hooks.ts:53:  return useQuery({
frontend/src/features/players/hooks.ts:64:  return useQuery({
frontend/src/features/players/hooks.ts:80:  return useQuery({
frontend/src/features/players/hooks.ts:94:  return useQuery({
frontend/src/features/players/hooks.ts:105:  return useQuery({

$ grep -rnE "refetchOnWindowFocus|refetchOnReconnect|retry|staleTime" frontend/src/app/providers
frontend/src/app/providers/queryClient.ts:8: * - `staleTime: 0`: los datos (cuentas de otros, coincidencias, sesiones) son
frontend/src/app/providers/queryClient.ts:16:      retry: false,
frontend/src/app/providers/queryClient.ts:17:      staleTime: 0,
frontend/src/app/providers/queryClient.ts:19:      refetchOnWindowFocus: false,
frontend/src/app/providers/queryClient.ts:20:      refetchOnReconnect: false,
```

Resultado de cada revisión:

| Revisión | Requisito | Resultado |
| --- | --- | --- |
| Colores escritos a mano (`#hex`, `rgb(`, `hsl(`) en los archivos nuevos y `playerPage.css` | RNF-1 | **OK**: sin resultados |
| `dangerouslySetInnerHTML` / `innerHTML` en `frontend/src` | RNF-3 | **OK**: sin resultados |
| `: any`, `as any`, `@ts-ignore`, `@ts-expect-error`, `.only` en `frontend/src` | RNF-4 | **OK**: sin resultados |
| `Riot\|Ubisoft\|Valve\|Steam\|FACEIT\|Leetify` en la ficha, `GameSummaryPanel`, `AccountRow`, `RankScale` | RF-16 | **OK**: un solo resultado, un comentario de `AccountRow.tsx:21` que cita las etiquetas "Riot ID", "Ubisoft ID", "SteamID64". En pantalla (4.1, 1.9 y M.7) ningún texto nombra esas fuentes salvo esas tres etiquetas |
| `verificado` | RF-16 | **OK**: sin resultados (las marcas son "Verificada" / "Sin verificar") |
| "Sin rango" / "R6 sin rango" | RF-17 | **OK**: sin resultados |
| Ningún valor derivado con rango o tasa ausentes | RF-17 | **OK**: `GameSummaryPanel.tsx`: `hasRank = currentRank != null && readNormalized(summary.account) !== null`; sin `hasRank` no se dibuja `RankScale` ni se llama a `rankGainSinceFirst` y se muestra `NO_DATA_TEXT`; primera lectura ausente → `NO_DATA_TEXT`; `winRate = readWinRate(summary)` y `null` → `NO_DATA_TEXT`. `AccountRow.tsx:68`: rango ausente → `NO_DATA_TEXT`. `playerSheet.ts:131-133`: `distanceView` → `noData` si cualquiera de los dos normalizados es `null` (`RankDistanceBlock` → `NO_DATA_TEXT`). Comprobado además con Node (T1: `readNormalized`/`readWinRate` con ausente, `null`, `'50'`, `NaN` → `null`; `distanceView` sin `currentRank` → `noData`; T2: `formatRankGain(null) === NO_DATA_TEXT`) |
| Opciones de las 6 consultas | RF-26, P63 | **OK**: `hooks.ts` tiene 6 `useQuery`, todas con `...SHEET_QUERY_OPTIONS` (`staleTime: Infinity`, `refetchOnMount: false`) y clave por visita; ningún `refetchInterval` ni `refetchOnWindowFocus`/`refetchOnReconnect: true` (los globales de `queryClient.ts` los ponen en `false` y `retry: false`). Claves tras `'them', id` y `'own'` (`queryKeys.ts`). Observación O-1: el comentario de `hooks.ts:13` todavía dice "las 7 consultas" |
| `playerSheet.ts` sin reimplementar ni `Date`/React/`fetch` | RNF-6 | **OK**: importa `groupBlocks`, `intersectBlocks` (`availability`), `rankDistance` (`matching`), `blockReason`, `buildProposal` (`proposal`) y `GAME_IDS`; sin `Date`, React, `fetch`, `useState` ni `useEffect` |
| Revisión del mock (`mockApi.ts:932-968`) | RF-11, RF-19, P50 | **OK**: `users.get`: formato → 400 `invalidId`, inexistente → 404 `userNotFound` ("usuario no encontrado"); `users.listAccounts`: formato → 400, inexistente → 200 con lista filtrada vacía (`[]`); `users.getGameSummary`: 400 id → 400 juego → 404 "usuario no encontrado" → 404 `noAccountForGame` ("el jugador no tiene una cuenta vinculada en este juego") → 200. Textos de la tabla `MESSAGES` (sin copias). Lo mismo comprueba T3 con Node (16/16) |
| `fetch(` solo en `httpClient.ts` | RNF-3 (plan 6.2) | **OK**: la única llamada es `services/http/httpClient.ts:57`; el resto de resultados son `refetch(` de React Query |
| "Sin horas en común esta semana" | RF-6, P61 | **OK**: un solo resultado, `copy.ts:76` (`NO_SHARED_HOURS_TEXT`), que importan `SharedHoursBlock.tsx` y `MatchEntry.tsx` |
| "Sin datos" | RF-17, P62 | **OK**: fuera de comentarios, un solo resultado, `copy.ts:13` (`NO_DATA_TEXT`). Comentarios: `RankDistanceBlock.tsx:26` (JSDoc `*`), `GameSummaryPanel.tsx:40` (`//`), `AccountRow.tsx:38` (`//`), `rankProgress.ts:9` (JSDoc `*`). Importan `NO_DATA_TEXT`: `rankProgress.ts`, `MatchEntry.tsx`, `RankDistanceBlock.tsx`, `AccountRow.tsx`, `GameSummaryPanel.tsx`; `RankScale.tsx` y `ProfilePage.tsx` no tienen el literal |
| Literales de interfaz de la ficha fuera de `copy.ts` (regla de `tasks.md`: "los textos literales de la ficha viven solo en `copy.ts`") | — | **Defecto D10-3** (menor): `PlayerGamesSection.tsx` "Juegos" y `label="Juegos del jugador"`; `PlayerPage.tsx` "Cruce con tu perfil" (×2, también en el esqueleto de carga); `RankDistanceBlock.tsx` "Distancia de rango"; `SharedHoursBlock.tsx` "Horas en común" y "en común" con `pluralize(…, 'hora', 'horas')`; `PlayerHeader.tsx` "se inscribió" (igual que el perfil). En `GameSummaryPanel.tsx`, "Posición en la escala del juego", "Últimas partidas" y "ganadas" vienen tal cual del perfil (T5 los movió sin cambiarlos). El plan 4.6 no los enumera entre los textos nuevos, por eso se anota también como posible ajuste del plan |

### 4.1 Recorrido sin el paso de CS2 (parte 1; 2026-10-20, 21:13–21:15)

`p1.mjs` (A en su navegador; B se suma con su propia sesión por la API, que equivale a otro
navegador). Primera pasada, completa (21:13–21:15):

```
[2026-10-20 21:13:45] INFO  ids — {"B":"6ad8031c6f785278afeeb04f"}
[2026-10-20 21:13:46] OK    1.1 B aparece en las coincidencias de LoL de A (filtros por defecto: 25 pts, 2 h) — {"text":"BV | Bruno Val | @Val008B · <b>x</b> | Platinum I · 50 LP | Δ 10 pts | Datos de demostración | 4 horas | Mar 20:00–23:00 | 56 | Aceptable | Datos de demostración | Proponer | Horas","href":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol"}
[2026-10-20 21:14:03] OK    1.2 abre la ficha en la pestaña LoL (RF-2, RF-20) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","tabs":["*League of Legends","Rainbow Six Siege","Counter-Strike 2"],"title":"Bruno Val · TeamMatchUp"}
[2026-10-20 21:14:03] OK    1.3 sin correo de B; biografía literal (RF-3, RNF-3) — {"head":"BV\nBruno Val\n\n@Val008B · America/Argentina/Buenos_Aires · se inscribió hace 3 minutos\n\n<b>x</b>","bioText":"<b>x</b>","bioChildren":0}
[2026-10-20 21:14:03] OK    1.4 pestañas en orden LoL, R6, CS2 — ["*League of Legends","Rainbow Six Siege","Counter-Strike 2"]
[2026-10-20 21:14:03] FALLA 1.5 panel LoL (RF-4, RF-16, RF-27) — League of Legends
[2026-10-20 21:14:03] FALLA 1.6 cruce LoL: distancia, 4 horas, tramos, grilla, sin nota de zonas (RF-6, RF-22, RF-27) — {"distance":"DISTANCIA DE RANGO\n\nΔ 10 pts\nDatos de demostración","hours":"HORAS EN COMÚN\n\n4 horas\nen común\n\nMar 20:00–23:00\nJue 03:00–04:00\nLUN\nMAR\nMIÉ\nJUE\nVIE\nSÁB\nDOM\n12:00\n13:00\n14:00\n15:00\n16:00\n17:00\n18:00\n19:00\n20:00\n21:00\n22:00\n23:00\n00:00\n01:00\nTus horas\nHoras en común","ranges":["Mar 20:00–23:00","Jue 03:00–04:00"],"sharedCells":["Martes 20:00, horario en común","Martes 21:00, horario en común","Martes 22:00, horario en común",null],"zonesNote":false,"propose":{"text":"Proponer sesión","ariaDisabled":null,"disabled":false,"reason":nul …
[2026-10-20 21:14:05] FALLA 1.7 R6 sin recargar (RF-4, RF-5, RF-6, RF-16, RF-27) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=r6","panel":"Rainbow Six Siege\n\nUbisoft ID · jugador1\n\nSIN VERIFICAR\nDatos de demostración\nRANGO VIGENTE\nEmerald II · 3836 MMR\nDatos de demostración\nREGIÓN\nLATAM\nÚLTIMA LECTURA\nhace 3 minutos\nPOSICIÓN EN LA ESCALA DEL JUEGO\n1 lectura registrada · Datos de demostración\nCOPPER\n▲ +0 pts desde la primera lectura\nCHAMPION\n\nPrimera lectura: Emerald II · 3836 MMR\n\nÚltimas partidas\n40% ganadas\nDatos de demostración\nRES.\tPARTIDA\tRANGO\n\nD\n\t\nValkyrie · 12 bajas\nhace 3 minutos · 27 min\t−16\n\nD\n\t\nSmoke · 3 bajas\nhace 40 minutos · 17 min …
[2026-10-20 21:14:07] OK    1.8 recargar con R6 mantiene R6 (RF-5) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=r6","tabs":["League of Legends","*Rainbow Six Siege","Counter-Strike 2"]}
[2026-10-20 21:14:08] FALLA 1.9 CS2: rango, escala Grey a Gold, partidas con la etiqueta, sin "Fuente" ni FACEIT/Steam/Valve (RF-16) — Counter-Strike 2
[2026-10-20 21:14:08] OK    1.10 CS2: RF-13 y motivo 2 (RF-12, RF-13) — {"distance":"DISTANCIA DE RANGO\n\nVincula tu cuenta de CS2 para ver la distancia de rango","propose":{"text":"Proponer sesión","ariaDisabled":"true","disabled":false,"reason":"Vincula tu cuenta de CS2 para proponer una sesión"}}
[2026-10-20 21:14:10] INFO  historial antes de proponer — {"currentIndex":3,"urls":["about:blank","/inicio","/coincidencias","/jugadores/6ad8031c6f785278afeeb04f?juego=lol"]}
[2026-10-20 21:14:26] OK    1.11 "Proponer sesión" abre el formulario (RF-7) — {"url":"/agenda","form":{"title":"Sesión con Bruno Val","game":"League of Legends [lol]","gameOptions":["lol","r6"],"day":"Martes [1]","hour":"20:00 [20]","duration":"3 [3]","slots":"5 [5]","notes":""}}
[2026-10-20 21:14:28] OK    1.12 A anota la sesión — [{"id":"6ad803e36f785278afeeb0d1","title":"Sesión con Bruno Val","gameId":"lol","day":1,"startHour":20,"duration":3,"maxPlayers":5}]
[2026-10-20 21:14:28] INFO  historial tras anotar — {"currentIndex":4,"urls":["about:blank","/inicio","/coincidencias","/jugadores/6ad8031c6f785278afeeb04f?juego=lol","/agenda"]}
[2026-10-20 21:14:45] OK    1.13 "Atrás" desde la agenda → ficha en LoL (RF-5) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","tabs":["*League of Legends","Rainbow Six Siege","Counter-Strike 2"]}
[2026-10-20 21:14:47] OK    1.14 segundo "Atrás" → coincidencias, sin pasar por CS2 ni R6 (RF-5, P13) — {"url":"/coincidencias","history":{"currentIndex":2,"urls":["about:blank","/inicio","/coincidencias","/jugadores/6ad8031c6f785278afeeb04f?juego=lol","/agenda"]}}
[2026-10-20 21:14:47] OK    1.15 B se suma a la sesión (POST /api/sessions/:id/join con la sesión de B) — {"status":200,"participants":["Ana Val","Bruno Val"]}
[2026-10-20 21:14:47] OK    1.16 la sesión muestra un enlace por participante (RF-2) — [["Ana Val","/jugadores/6ad8031c6f785278afeeb03c?juego=lol"],["Bruno Val","/jugadores/6ad8031c6f785278afeeb04f?juego=lol"]]
[2026-10-20 21:15:04] OK    1.17 desde la agenda se abre la ficha de B en LoL (RF-2) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","h1":"Bruno Val"}
[2026-10-20 21:15:06] OK    1.18 la propia ficha desde la sesión lleva al perfil (RF-15) — {"currentIndex":4,"urls":["about:blank","/inicio","/coincidencias","/agenda","/perfil"]}
[2026-10-20 21:15:07] OK    1.19 "Atrás" desde el perfil vuelve a la agenda (RF-15) — /agenda
[2026-10-20 21:15:07] OK    consola sin errores (filtrados los avisos Future Flag) — []
```

Las cuatro "FALLA" (1.5, 1.6, 1.7, 1.9) son del script: buscaban "Sin verificar", "Iron",
"Copper", "Grey" con mayúsculas y minúsculas, pero `innerText` devuelve el texto como se ve
(en mayúsculas por CSS), y en 1.6 el selector de la grilla incluía la muestra de la leyenda
(`null`). El contenido que muestran es el esperado. Los pasos de solo lectura (1.1 a 1.10,
que no cambian datos) se repitieron con las comprobaciones corregidas (`p1b.mjs`, 21:15):

```
[2026-10-20 21:16:13] INFO  ids — {"B":"6ad8031c6f785278afeeb04f"}
[2026-10-20 21:16:14] OK    1.1 B aparece en las coincidencias de LoL de A (filtros por defecto: 25 pts, 2 h) — {"text":"BV | Bruno Val | @Val008B · <b>x</b> | Platinum I · 50 LP | Δ 10 pts | Datos de demostración | 4 horas | Mar 20:00–23:00 | 56 | Aceptable | Datos de demostración | Proponer | Horas","href":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol"}
[2026-10-20 21:16:16] OK    1.2 abre la ficha en la pestaña LoL (RF-2, RF-20) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","tabs":["*League of Legends","Rainbow Six Siege","Counter-Strike 2"],"title":"Bruno Val · TeamMatchUp"}
[2026-10-20 21:16:16] OK    1.3 sin correo de B; biografía literal (RF-3, RNF-3) — {"head":"BV\nBruno Val\n\n@Val008B · America/Argentina/Buenos_Aires · se inscribió hace 5 minutos\n\n<b>x</b>","bioText":"<b>x</b>","bioChildren":0}
[2026-10-20 21:16:16] OK    1.4 pestañas en orden LoL, R6, CS2 — ["*League of Legends","Rainbow Six Siege","Counter-Strike 2"]
[2026-10-20 21:16:16] OK    1.5 panel LoL (RF-4, RF-16, RF-27) — League of Legends
[2026-10-20 21:16:16] OK    1.6 cruce LoL: distancia, 4 horas, tramos, grilla, sin nota de zonas (RF-6, RF-22, RF-27) — {"distance":"DISTANCIA DE RANGO\n\nΔ 10 pts\nDatos de demostración","hours":"HORAS EN COMÚN\n\n4 horas\nen común\n\nMar 20:00–23:00\nJue 03:00–04:00\nLUN\nMAR\nMIÉ\nJUE\nVIE\nSÁB\nDOM\n12:00\n13:00\n14:00\n15:00\n16:00\n17:00\n18:00\n19:00\n20:00\n21:00\n22:00\n23:00\n00:00\n01:00\nTus horas\nHoras en común","ranges":["Mar 20:00–23:00","Jue 03:00–04:00"],"sharedCells":["Martes 20:00, horario en común","Martes 21:00, horario en común","Martes 22:00, horario en común"],"zonesNote":false,"propose":{"text":"Proponer sesión","ariaDisabled":null,"disabled":false,"reason":null}}
[2026-10-20 21:16:17] OK    1.7 R6 sin recargar (RF-4, RF-5, RF-6, RF-16, RF-27) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=r6","panel":"Rainbow Six Siege\n\nUbisoft ID · jugador1\n\nSIN VERIFICAR\nDatos de demostración\nRANGO VIGENTE\nEmerald II · 3836 MMR\nDatos de demostración\nREGIÓN\nLATAM\nÚLTIMA LECTURA\nhace 5 minutos\nPOSICIÓN EN LA ESCALA DEL JUEGO\n1 lectura registrada · Datos de demostración\nCOPPER\n▲ +0 pts desde la primera lectura\nCHAMPION\n\nPrimera lectura: Emerald II · 3836 MMR\n\nÚltimas partidas\n40% ganadas\nDatos de demostración\nRES.\tPARTIDA\tRANGO\n\nD\n\t\nValkyrie · 12 bajas\nhace 5 minutos · 27 min\t−16\n\nD\n\t\nSmoke · 3 bajas\nhace 42 minutos · 17 min …
[2026-10-20 21:16:19] OK    1.8 recargar con R6 mantiene R6 (RF-5) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=r6","tabs":["League of Legends","*Rainbow Six Siege","Counter-Strike 2"]}
[2026-10-20 21:16:20] OK    1.9 CS2: rango, escala Grey a Gold, partidas con la etiqueta, sin "Fuente" ni FACEIT/Steam/Valve (RF-16) — Counter-Strike 2
[2026-10-20 21:16:20] OK    1.10 CS2: RF-13 y motivo 2 (RF-12, RF-13) — {"distance":"DISTANCIA DE RANGO\n\nVincula tu cuenta de CS2 para ver la distancia de rango","propose":{"text":"Proponer sesión","ariaDisabled":"true","disabled":false,"reason":"Vincula tu cuenta de CS2 para proponer una sesión"}}
[2026-10-20 21:16:20] OK    consola sin errores (filtrados los avisos Future Flag) — []
```

Resultado por paso (todos **OK**):
- RF-2, RF-20: desde la fila de B en las coincidencias de LoL de A (filtros por defecto: 25
  pts, 2 h; la fila muestra "Δ 10 pts", "4 horas"), la ficha se abre en
  `/jugadores/<B>?juego=lol`, pestaña LoL; título del documento "Bruno Val · TeamMatchUp".
- RF-3, RNF-3: sin correo de B; la biografía se ve literal `<b>x</b>` (sin elementos hijos).
- RF-4, RF-16, RF-27 (LoL): pestañas LoL, R6, CS2; "Riot ID · jugador2#las", "Sin verificar"
  (correcto: `jugador2#las` no es verificado) con la Etiqueta, "Platinum I · 50 LP" con la
  Etiqueta, escala Iron–Challenger, "▲ +0 pts desde la primera lectura", "1 lectura
  registrada · Datos de demostración", partidas con su variación (−25) y la Etiqueta; sin
  campo "Fuente".
- RF-6, RF-22, RF-27: "Δ 10 pts" con la Etiqueta (igual que la fila), "4 horas en común",
  tramos "Mar 20:00–23:00" y "Jue 03:00–04:00", la grilla destaca solo martes 20, 21 y 22, sin
  nota de zonas.
- R6 sin recargar (una sola petición nueva, `GET /api/users/<B>/games/r6`): "Ubisoft ID ·
  jugador1", "Emerald II · 3836 MMR", escala Copper–Champion, historial, partidas, "40%
  ganadas", Etiqueta, "Δ 14 pts" con la Etiqueta. Recargar mantiene R6 (RF-5).
- CS2: "SteamID64 · 76561190000000003", "Verificada", "Gold · 31789 CS Rating", escala
  Grey–Gold, partidas "Nuke · 13-8"…, sin "Fuente" ni FACEIT/Steam/Valve; distancia "Vincula tu
  cuenta de CS2 para ver la distancia de rango" y "Proponer sesión" con `aria-disabled` y
  "Vincula tu cuenta de CS2 para proponer una sesión" (RF-12, RF-13).
- RF-7: en LoL, "Proponer sesión" abre el formulario de la agenda con LoL, Martes, 20:00, 3,
  "Sesión con Bruno Val", 5 cupos y notas vacías; A la anota (sesión `6ad803e3…`, lol, día 1,
  20:00, 3 h, 5 cupos).
- RF-5, P13: "Atrás" desde la agenda → ficha en LoL; segundo "Atrás" → coincidencias (el
  historial no tiene entradas de R6 ni CS2: `/inicio, /coincidencias, /jugadores/<B>?juego=lol,
  /agenda`).
- RF-2, RF-15: B se suma (200, participantes "Ana Val", "Bruno Val"); en la agenda la sesión
  tiene un enlace por participante; el de B abre su ficha en LoL; el propio lleva a `/perfil` y
  "Atrás" vuelve a la agenda.
- Consola sin errores (solo los avisos "React Router Future Flag" de siempre, filtrados).

Capturas: `validation/t10/t10-p1-coincidencias-lol.jpg`, `t10-p1-ficha-b-lol-1280.jpg`,
`t10-p1-ficha-b-r6-1280.jpg`, `t10-p1-ficha-b-cs2-1280.jpg`, `t10-p1-agenda-form-1280.jpg`,
`t10-p1-agenda-sesion-1280.jpg`.

### 4.2 Estados (parte 2; 2026-10-20, 21:18–21:19)

`p2.mjs` (A con LoL y R6, sin CS2). "3G lenta" = el preajuste de DevTools (2000 ms de
latencia, unos 50 KB/s en los dos sentidos).

```
[2026-10-20 21:18:11] INFO  2.1a 3G lenta, abrir la ficha de B: estados de carga por sección (RF-8, RF-23) — ["+0.0s {\"page\":\"otro\",\"juegos\":\"—\",\"panel\":\"—\",\"distancia\":\"—\",\"horas\":\"—\",\"proponer\":\"—\"}"]
[2026-10-20 21:18:23] INFO  2.1b 3G lenta, cambiar a R6: solo el panel del juego y la distancia cargan (RF-8) — ["+0.0s {\"page\":\"ficha\",\"juegos\":\"listo\",\"panel\":\"cargando\",\"distancia\":\"cargando\",\"horas\":\"listo\",\"proponer\":\"habilitado\"}","+2.1s {\"page\":\"ficha\",\"juegos\":\"listo\",\"panel\":\"listo\",\"distancia\":\"listo\",\"horas\":\"listo\",\"proponer\":\"habilitado\"}"]
[2026-10-20 21:18:24] OK    2.2 bloqueada GET /api/users/me/availability: error con "Reintentar" en horas y RF-23 en Proponer (RF-8, RF-18, RF-23) — {"horas":"No se pudieron cargar los datos\nNo se pudo conectar con el servidor. Inténtalo de nuevo.\nReintentar","proponer":{"text":"Proponer sesión","ariaDisabled":"true","disabled":false,"reason":"No se pudieron cargar los datos para proponer una sesión."},"distancia":"DISTANCIA DE RANGO\n\nΔ 10 pts\nDatos de demostración"}
[2026-10-20 21:18:26] OK    2.3a bloqueada GET /api/accounts?user=me (no la de B): error con "Reintentar" en la distancia y RF-23 (RF-8, RF-18, RF-23; P19) — {"distancia":"No se pudieron cargar los datos\nNo se pudo conectar con el servidor. Inténtalo de nuevo.\nReintentar","proponer":{"text":"Proponer sesión","ariaDisabled":"true","disabled":false,"reason":"No se pudieron cargar los datos para proponer una sesión."},"pestañas":["*League of Legends","Rainbow Six Siege","Counter-Strike 2"],"peticionesDeCuentas":["/api/accounts?user=6ad8031c6f785278afeeb04f","/api/accounts?user=me"]}
[2026-10-20 21:18:27] OK    2.3b desbloquear y "Reintentar": se ve la distancia — {"distancia":"DISTANCIA DE RANGO\n\nΔ 10 pts\nDatos de demostración","proponer":{"text":"Proponer sesión","ariaDisabled":null,"disabled":false,"reason":null}}
[2026-10-20 21:18:28] OK    2.4 ficha de C (RF-10, RF-12, RF-22; RF-6, P59) — {"url":"/jugadores/6ad8031d6f785278afeeb067","juegos":"Este jugador no ha vinculado ningún juego","horas":"HORAS EN COMÚN\n\nLas horas se comparan tal como cada uno las marcó, sin convertir zonas horarias\n\n0 horas\nen común\n\nSin horas en común esta semana.\n\nLUN\nMAR\nMIÉ\nJUE\nVIE\nSÁB\nDOM\n12:00\n13:00\n14:00\n15:00\n16:00\n17:00\n18:00\n19:00\n20:00\n21:00\n22:00\n23:00\n00:00\n01:00\nTus horas\nHoras en común","nota":"Las horas se comparan tal como cada uno las marcó, sin convertir zonas horarias","distancia":null,"proponer":{"text":"Proponer sesión","ariaDisabled":"true","disabled":false,"reason":"Este j …
[2026-10-20 21:18:28] OK    2.5 /jugadores/ffffffffffffffffffffffff → "Este jugador no existe" (RF-9, RF-15; P43) — Este jugador no existe / Ir a coincidencias
[2026-10-20 21:18:29] OK    2.5 /jugadores/abc → "Este jugador no existe" (RF-9, RF-15; P43) — Este jugador no existe / Ir a coincidencias
[2026-10-20 21:18:30] OK    2.5 /jugadores/ME → "Este jugador no existe" (RF-9, RF-15; P43) — Este jugador no existe / Ir a coincidencias
[2026-10-20 21:18:31] FALLA 2.6 /jugadores/me → perfil (RF-15; P35, P43) — ["/jugadores/ME","/inicio","/perfil"]
[2026-10-20 21:18:32] FALLA 2.6 /jugadores/6AD8031C6F785278AFEEB03C → perfil (RF-15; P35, P43) — ["/perfil","/inicio","/perfil"]
[2026-10-20 21:18:34] OK    2.7a sesión cerrada + /jugadores/B?juego=r6 → login (RF-1) — /login
[2026-10-20 21:18:35] OK    2.7b al entrar vuelve a la ficha en LoL (RF-1, RF-20) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","tabs":["*League of Legends","Rainbow Six Siege","Counter-Strike 2"]}
[2026-10-20 21:18:36] OK    2.8a cookie "token" borrada + elegir R6 → login con el aviso (RF-1; 007 RF-7; P44) — {"cookiesAntes":["token"],"cookiesDespués":[],"peticiones":["GET /api/users/6ad8031c6f785278afeeb04f/games/r6"],"url":"/login","aviso":"Tu sesión expiró. Vuelve a entrar."}
[2026-10-20 21:18:38] OK    2.8b al entrar vuelve a la ficha en LoL (RF-1, RF-20) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","tabs":["*League of Legends","Rainbow Six Siege","Counter-Strike 2"]}
[2026-10-20 21:18:40] OK    2.9a cerrar sesión en otra pestaña lleva la ficha (R6) a login en < 5 s con el aviso (RF-1; 007 RF-24) — {"ms":102,"url":"/login","aviso":"Se cerró o cambió la sesión en otra pestaña."}
[2026-10-20 21:18:41] OK    2.9b al entrar vuelve a la ficha en LoL (RF-1, RF-20) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","tabs":["*League of Legends","Rainbow Six Siege","Counter-Strike 2"]}
[2026-10-20 21:18:44] OK    2.10 ?juego=xyz → pestaña LoL, dirección corregida; "Atrás" → página anterior (RF-20, P14) — {"ficha":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","historial":["/coincidencias","/jugadores/6ad8031c6f785278afeeb04f?juego=lol"],"trasAtrás":"/coincidencias"}
[2026-10-20 21:18:50] OK    2.11 B: /jugadores/A?juego=cs2 → pestaña LoL, dirección corregida; "Atrás" → página anterior (RF-20, P14) — {"ficha":"/jugadores/6ad8031c6f785278afeeb03c?juego=lol","pestañas":["*League of Legends","Rainbow Six Siege"],"historial":["/agenda","/jugadores/6ad8031c6f785278afeeb03c?juego=lol"],"trasAtrás":"/agenda"}
[2026-10-20 21:18:50] INFO  2.12a B borra su disponibilidad — PUT [] → 200
[2026-10-20 21:18:51] OK    2.12a motivo "Este jugador no ha marcado horas" (RF-12) — {"text":"Proponer sesión","ariaDisabled":"true","disabled":false,"reason":"Este jugador no ha marcado horas"}
[2026-10-20 21:18:51] INFO  2.12b B vuelve a guardar la del recorrido; A borra la suya — B PUT → 200; A PUT [] → 200
[2026-10-20 21:18:52] OK    2.12b motivo "No has marcado tus horas" (RF-12) — {"text":"Proponer sesión","ariaDisabled":"true","disabled":false,"reason":"No has marcado tus horas"}
[2026-10-20 21:18:52] INFO  2.12c A guarda solo el jueves 03:00 — PUT ["3-3"] → 200
[2026-10-20 21:18:53] OK    2.12c motivo "Sus horas en común quedan fuera del horario de la agenda (12:00 a 01:00)" (RF-12) — {"proponer":{"text":"Proponer sesión","ariaDisabled":"true","disabled":false,"reason":"Sus horas en común quedan fuera del horario de la agenda (12:00 a 01:00)"},"tramos":["Jue 03:00–04:00"]}
[2026-10-20 21:18:53] INFO  2.12d A vuelve a guardar la del recorrido — PUT → 200
[2026-10-20 21:18:54] OK    2.12d tramos "Mar 20:00–23:00" y "Jue 03:00–04:00" y "Proponer sesión" habilitado (P42) — {"tramos":["Mar 20:00–23:00","Jue 03:00–04:00"],"proponer":{"text":"Proponer sesión","ariaDisabled":null,"disabled":false,"reason":null}}
[2026-10-20 21:18:54] INFO  consola (filtrados los avisos Future Flag) — []
```

2.1a no registró los estados de la ficha (midió solo 9 s, menos de lo que tardó con 3G
lenta en cargar el módulo de la página) y 2.6 marcó "FALLA" porque la comprobación miraba todo el historial,
incluida la entrada `/jugadores/ME` del paso 2.5 (lo que muestra la salida es correcto: tras
`/inicio` solo hay `/perfil`). Se repitieron en `p2a.mjs` (21:19):

```
[2026-10-20 21:19:29] INFO  2.1a (repetido) 3G lenta, abrir la ficha de B desde coincidencias: estados por sección (RF-8, RF-23) — ["+0.0s /jugadores/6ad8031c6f785278afeeb04f {\"page\":\"otro\",\"juegos\":\"—\",\"panel\":\"—\",\"distancia\":\"—\",\"horas\":\"—\",\"proponer\":\"—\"}","+10.8s /jugadores/6ad8031c6f785278afeeb04f {\"page\":\"todo-cargando\",\"juegos\":\"cargando\",\"panel\":\"—\",\"distancia\":\"—\",\"horas\":\"—\",\"proponer\":\"bloqueado: Cargando los datos para proponer una sesión…\"}","+12.8s /jugadores/6ad8031c6f785278afeeb04f {\"page\":\"ficha\",\"juegos\":\"cargando\",\"panel\":\"—\",\"distancia\":\"—\",\"horas\":\"listo\",\"proponer\":\"bloqueado: Cargando los datos para …
[2026-10-20 21:19:29] INFO  peticiones — ["GET /api/users/6ad8031c6f785278afeeb04f","GET /api/accounts?user=6ad8031c6f785278afeeb04f","GET /api/users/6ad8031c6f785278afeeb04f/availability","GET /api/accounts?user=me","GET /api/users/me/availability","GET /api/users/6ad8031c6f785278afeeb04f/games/lol"]
[2026-10-20 21:19:32] OK    2.6 /jugadores/me → perfil, sin entrada de la ficha en el historial; "Atrás" → /inicio (RF-15; P35, P43) — {"historialDesdeInicio":["/inicio","/perfil"],"trasAtrás":"/inicio"}
[2026-10-20 21:19:34] OK    2.6 /jugadores/6AD8031C6F785278AFEEB03C → perfil, sin entrada de la ficha en el historial; "Atrás" → /inicio (RF-15; P35, P43) — {"historialDesdeInicio":["/inicio","/perfil"],"trasAtrás":"/inicio"}
```

Resultado por paso (todos **OK**):
- RF-8, RF-23 (3G lenta): al abrir la ficha desde coincidencias, primero el "Cargando…" de la
  ruta diferida (la 007; en desarrollo Vite sirve el módulo de la página sin empaquetar, unos
  10,8 s con 3G lenta), después todas las secciones con su esqueleto y "Proponer sesión"
  deshabilitado con "Cargando los datos para proponer una sesión…", después el encabezado y
  las horas y, al final, el panel del juego y la distancia (los últimos en llegar, el resumen
  se pide cuando hay cuentas). Al cambiar a R6 solo el panel del juego y la distancia muestran
  su carga (2,1 s); juegos, horas y "Proponer sesión" siguen listos (proponer no depende del
  resumen). Capturas `t10-p2-3g-carga-1/2/3-1280.jpg`, `t10-p2-3g-lista-1280.jpg`.
- Bloqueada solo `GET /api/users/me/availability`: la sección de horas muestra "No se pudieron
  cargar los datos / No se pudo conectar con el servidor. Inténtalo de nuevo. / Reintentar" y
  "Proponer sesión" muestra "No se pudieron cargar los datos para proponer una sesión."; la
  distancia sigue visible (RF-8, RF-18, RF-23).
- Bloqueada solo `GET /api/accounts?user=me` (sí se pidió `?user=<B>`): la distancia muestra el
  error con "Reintentar" y "Proponer sesión" el texto de fallo; las pestañas siguen; al
  desbloquear y pulsar "Reintentar" se ve "Δ 10 pts" y "Proponer sesión" se habilita (P19, P44).
- Ficha de C: "Este jugador no ha vinculado ningún juego" en lugar de pestañas, "0 horas en
  común" con "Sin horas en común esta semana.", la nota "Las horas se comparan tal como cada uno
  las marcó, sin convertir zonas horarias" (Sao_Paulo frente a Buenos_Aires), sin distancia y
  "Proponer sesión" deshabilitado con "Este jugador no ha vinculado ningún juego" (RF-6, RF-10,
  RF-12, RF-22; P15, P44, P59).
- `ffffffffffffffffffffffff` (formato válido, inexistente), `abc` y `ME` → "Este jugador no
  existe" con "Ir a coincidencias" (RF-9, RF-15; P43).
- `me` y el identificador propio en mayúsculas → `/perfil`, sin entrada de la ficha en el
  historial; "Atrás" → `/inicio` (RF-15; P35, P43).
- Sesión cerrada (botón "Cerrar sesión") + `/jugadores/<B>?juego=r6` → login; al entrar, la
  ficha en `?juego=lol` (RF-1, RF-20).
- Ficha recién recargada en LoL, cookie `token` borrada (`Network.deleteCookies`; antes
  `["token"]`, después `[]`) y elegir R6 (única petición `GET …/games/r6`) → login con "Tu
  sesión expiró. Vuelve a entrar."; al entrar, ficha en LoL (RF-1, RF-20; 007 RF-7; P44).
- Ficha en R6 en una pestaña y "Cerrar sesión" en otra pestaña del mismo navegador → la primera
  pasa a login en 102 ms con "Se cerró o cambió la sesión en otra pestaña."; al entrar, ficha
  en LoL (RF-1, RF-20; 007 RF-24; P44).
- `?juego=xyz` → pestaña LoL y dirección `?juego=lol` (reemplazada); "Atrás" → `/coincidencias`.
  B abre `/jugadores/<A>?juego=cs2` (A sin CS2) → pestañas LoL y R6, LoL elegida, dirección
  `?juego=lol`; "Atrás" → `/agenda` (RF-20, P14).
- Motivos de disponibilidad, recargando la ficha de B en LoL tras cada cambio (RF-26; cambios
  de horas con `PUT /api/users/me/availability` con la sesión de cada uno): B `[]` → "Este
  jugador no ha marcado horas"; B restaurada y A `[]` → "No has marcado tus horas"; A solo
  `3-3` → "Sus horas en común quedan fuera del horario de la agenda (12:00 a 01:00)" con el
  tramo "Jue 03:00–04:00"; A restaurada (`1-20, 1-21, 1-22, 3-3, 0-15`) → tramos "Mar
  20:00–23:00" y "Jue 03:00–04:00" y "Proponer sesión" habilitado (RF-12, P42).

Capturas: `t10-p2-bloqueo-horas-1280.jpg`, `t10-p2-bloqueo-cuentas-1280.jpg`,
`t10-p2-ficha-c-1280.jpg`, `t10-p2-no-existe-1280.jpg`, `t10-p2-cookie-login-1280.jpg`,
`t10-p2-motivo-fuera-agenda-1280.jpg`.

### Entre 2 y 3: latencia de 40 s (RF-24), servidor apagado (RF-18), teclado y NVDA (RNF-2), 360 px y contraste (RNF-5) (2026-10-20, 21:21–21:33)

**Latencia de 40 s y servidor apagado** (`p23a.mjs`, 21:21; A con LoL y la disponibilidad del
recorrido). Para que la latencia afectara solo a `/api`, el módulo de la ficha se cargó antes
en el mismo documento (navegación interna) y la limitación (`latency: 40000`) se activó justo
antes de pulsar el nombre de B en coincidencias. Para RF-18 se mandó `SIGTERM` al proceso del
servidor y después se volvió a arrancar con la misma base (`teammatchup_val008`).

```
[2026-10-20 21:21:35] INFO  RF-24 latencia de 40 s al abrir la ficha de B: estados en el tiempo — ["+0.0s /jugadores/6ad8031c6f785278afeeb04f {\"page\":\"otro\",\"juegos\":\"—\",\"panel\":\"—\",\"distancia\":\"—\",\"horas\":\"—\",\"proponer\":\"—\"} ","+0.3s /jugadores/6ad8031c6f785278afeeb04f {\"page\":\"todo-cargando\",\"juegos\":\"cargando\",\"panel\":\"—\",\"distancia\":\"—\",\"horas\":\"—\",\"proponer\":\"bloqueado: Cargando los datos para proponer una sesión…\"} ","+30.5s /jugadores/6ad8031c6f785278afeeb04f {\"page\":\"otro\",\"juegos\":\"—\",\"panel\":\"—\",\"distancia\":\"—\",\"horas\":\"—\",\"proponer\":\"—\"} No se pudieron cargar los datos / No se pudo conectar con el servidor. In …
[2026-10-20 21:21:35] OK    RF-24 a los 30 s: "No se pudo conectar con el servidor. Inténtalo de nuevo." con "Reintentar", sin login — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","main":"No se pudieron cargar los datos / No se pudo conectar con el servidor. Inténtalo de nuevo. / Reintentar"}
[2026-10-20 21:21:42] OK    RF-24 respuesta tardía descartada: la ficha sigue en el error tras los 40 s — t=42.6s
[2026-10-20 21:21:44] OK    RF-18 servidor apagado (SIGTERM al proceso del backend) — pid 40093
[2026-10-20 21:21:45] OK    RF-18 elegir R6 con el servidor apagado: error en la sección con "Reintentar", resto visible, sin login — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=r6","panel":"No se pudieron cargar los datos\nNo se pudo conectar con el servidor. Inténtalo de nuevo.\nReintentar","distancia":"DISTANCIA DE RANGO\nNo se pudieron cargar los datos\nNo se pudo conectar con el servidor. Inténtalo de nuevo.\nReintentar","encabezado":"Bruno Val","tramos":["Mar 20:00–23:00","Jue 03:00–04:00"],"ms":638,"peticiones":["GET /api/users/6ad8031c6f785278afeeb04f/games/r6"]}
[2026-10-20 21:21:46] INFO  RF-18 servidor encendido de nuevo (misma base teammatchup_val008) — pid 43481
[2026-10-20 21:21:47] OK    RF-18 "Reintentar" carga la sección — {"panel":"Rainbow Six Siege\n\nUbisoft ID · jugador1\n\nSIN VERIFICAR\nDatos de demostración\nRANGO VIGENTE\nEmerald II · 3836 MMR\nDatos ","distancia":"DISTANCIA DE RANGO\n\nΔ 14 pts\nDatos de demostración"}
[2026-10-20 21:21:47] INFO  consola — []
```

- RF-24 **OK**: todas las secciones con su estado de carga y "Cargando los datos para proponer
  una sesión…" desde +0,3 s; a los 30,5 s, "No se pudieron cargar los datos / No se pudo
  conectar con el servidor. Inténtalo de nuevo. / Reintentar" en toda la ficha (el usuario no
  llegó), sin llevar a login; a los 42,6 s la respuesta tardía ya habría llegado y la ficha
  sigue en el error. Capturas `t10-p23-latencia-carga-1280.jpg`, `t10-p23-latencia-30s-1280.jpg`.
- RF-18 **OK**: con la ficha de B en LoL y el servidor apagado, elegir R6 (no abierta antes)
  muestra en el panel "No se pudo conectar con el servidor. Inténtalo de nuevo." con
  "Reintentar" (y la distancia, que depende del mismo resumen, también su error con
  "Reintentar"); encabezado, pestañas, horas y tramos siguen visibles; sin login. Con el
  servidor encendido, "Reintentar" del panel carga R6 y la distancia "Δ 14 pts". Captura
  `t10-p23-servidor-apagado-1280.jpg`.

**Teclado** (`p23b.mjs`, 21:22). Solo con teclado (Tab, Enter, flechas, Inicio, Fin,
Espacio), anotando el foco en cada parada:

```
[2026-10-20 21:22:24] OK    RNF-2 coincidencias: Tab hasta el nombre de B, con foco visible — {"presses":16,"tag":"A","role":null,"text":"Bruno Val","sel":null,"dis":null,"visible":true,"outline":"solid 2px","inMain":true}
[2026-10-20 21:22:25] OK    RNF-2 Enter abre la ficha de B — /jugadores/6ad8031c6f785278afeeb04f?juego=lol
[2026-10-20 21:22:25] OK    RNF-2 Tab llega a la pestaña elegida (LoL), una sola parada en la lista de pestañas (tabIndex −1 en las demás) — [{"tag":"BUTTON","role":"tab","text":"League of Legends","sel":"true","dis":null,"visible":true,"outline":"solid 2px","inMain":true}]
[2026-10-20 21:22:30] OK    RNF-2 flechas, Inicio y Fin recorren las pestañas (activación automática, foco visible) — [{"tecla":"ArrowRight","foco":"Rainbow Six Siege","seleccionada":"true","focoVisible":true,"url":"juego=r6"},{"tecla":"ArrowRight","foco":"Counter-Strike 2","seleccionada":"true","focoVisible":true,"url":"juego=cs2"},{"tecla":"ArrowRight","foco":"League of Legends","seleccionada":"true","focoVisible":true,"url":"juego=lol"},{"tecla":"ArrowLeft","foco":"Counter-Strike 2","seleccionada":"true","focoVisible":true,"url":"juego=cs2"},{"tecla":"Home","foco":"League of Legends","seleccionada":"true","focoVisible":true,"url":"juego=lol"},{"tecla":"End","foco":"Counter-Strike 2","sele …
[2026-10-20 21:22:30] OK    RNF-2 Tab llega a "Proponer sesión" deshabilitado (aria-disabled) y se ve el foco; cada parada intermedia con foco visible — [{"tag":"DIV","role":"tabpanel","text":"Counter-Strike 2SteamID64 · 765611900000","sel":null,"dis":null,"visible":true,"outline":"solid 2px","inMain":true},{"tag":"A","role":null,"text":"Vincula tu cuenta de CS2 para ver la dis","sel":null,"dis":null,"visible":true,"outline":"solid 2px","inMain":true},{"tag":"BUTTON","role":null,"text":"Proponer sesión","sel":null,"dis":"true","visible":true,"outline":"solid 2px","inMain":true}]
[2026-10-20 21:22:31] OK    RNF-2 árbol de accesibilidad: nombre, descripción (motivo) y estado deshabilitado del botón — {"role":"button","name":"Proponer sesión","description":"Vincula tu cuenta de CS2 para proponer una sesión","properties":{"disabled":true,"invalid":"false","focusable":true,"focused":true,"describedby":":rt:"}}
[2026-10-20 21:22:32] OK    RNF-2 Enter y Espacio sobre el botón deshabilitado no navegan — /jugadores/6ad8031c6f785278afeeb04f?juego=cs2
[2026-10-20 21:22:32] INFO  RNF-2 árbol de accesibilidad: lista de pestañas y panel — {"tablist":"Juegos del jugador","tabs":["League of Legends","Rainbow Six Siege","Counter-Strike 2 (seleccionada)"],"tabpanel":["Counter-Strike 2"]}
[2026-10-20 21:22:41] OK    RNF-2 agenda: Tab hasta la sesión, Enter, Tab hasta el nombre de B con foco visible — {"sesion":{"presses":112,"text":"Sesión con Bruno Val, Martes 20:00, 2 de","visible":true},"enlace":{"presses":2,"tag":"A","role":null,"text":"Bruno Val","sel":null,"dis":null,"visible":true,"outline":"solid 2px","inMain":true}}
[2026-10-20 21:22:42] OK    RNF-2 Enter abre la ficha de B desde la agenda — /jugadores/6ad8031c6f785278afeeb04f?juego=lol
```

- RNF-2 **OK (teclado)**: desde coincidencias, 16 Tab hasta "Bruno Val" con foco visible
  (`:focus-visible`, contorno sólido de 2 px) y Enter abre la ficha; en la ficha una sola
  parada en la lista de pestañas (la elegida); → ← Inicio Fin recorren las pestañas con
  activación automática, foco visible y la dirección al día (`r6`, `cs2`, `lol`, `cs2`, `lol`,
  `cs2`); desde la pestaña, Tab pasa por el panel (`tabIndex 0`), el enlace "Vincula tu
  cuenta de CS2…" y "Proponer sesión" con `aria-disabled="true"`, que **recibe el foco** con
  foco visible; Enter y Espacio sobre él no navegan. Desde la agenda: Tab hasta la sesión,
  Enter, 2 Tab hasta "Bruno Val" con foco visible, Enter abre la ficha en LoL.
- Árbol de accesibilidad de Chrome (lo que recibe un lector de pantalla; no sustituye a NVDA):
  el botón tiene rol `button`, nombre "Proponer sesión", **descripción "Vincula tu cuenta de
  CS2 para proponer una sesión"** (por `aria-describedby`), `disabled: true`, `focusable:
  true`; la lista de pestañas se llama "Juegos del jugador" y el panel "Counter-Strike 2".
  Capturas `t10-p23-teclado-pestanas-1280.jpg`, `t10-p23-teclado-proponer-cs2-1280.jpg`.
- **NVDA: PENDIENTE (usuario).** Pasos en 4.8.

**360 px** (`p23c.mjs`, 21:23–21:27, y `pg.mjs`, 21:40). `Emulation.setDeviceMetricsOverride`
a 360 px, en cada estado y en los dos temas donde aplica:

```
[2026-10-20 21:23:31] OK    360 px dark · ficha B, LoL: sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:23:34] OK    360 px dark · ficha B, R6: sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:23:37] OK    360 px dark · ficha B, CS2 (motivo 2 y RF-13): sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:23:39] OK    360 px dark · ficha C (vacío, nota de zonas, sin horas, motivo 1): sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:23:42] OK    360 px dark · no existe (/jugadores/abc): sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:23:45] OK    360 px dark · errores (horas y cuentas propias bloqueadas; RF-23 fallo): sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:23:47] OK    360 px dark · error de toda la ficha (usuario bloqueado): sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:23:51] OK    360 px dark · cargando (RF-23, latencia 60 s): sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:26:54] OK    360 px light · ficha B, LoL: sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:27:04] OK    360 px light · errores (horas y cuentas propias bloqueadas; RF-23 fallo): sin desplazamiento horizontal — {"scrollWidth":360,"clientWidth":360,"bodyScroll":360}
[2026-10-20 21:27:11] INFO  360 px /perfil (referencia, no es de la 008) — {"scrollWidth":522,"clientWidth":360,"bodyScroll":522}
[2026-10-20 21:27:13] INFO  360 px /coincidencias (referencia, no es de la 008) — {"scrollWidth":361,"clientWidth":360,"bodyScroll":361}
[2026-10-20 21:40:24] OK    360 px: la página no se desplaza y la grilla se desplaza dentro de su recuadro (RNF-5) — {"gridScrollWidth":328,"gridClientWidth":278,"overflowX":"auto","pageScrollWidth":360}
```

- RNF-5 (360 px) **OK**: ficha de B en LoL, R6 y CS2, ficha de C, "no existe", errores de
  sección, error de toda la ficha y carga: `scrollWidth` 360 = `clientWidth` 360. La grilla de
  horas se desplaza dentro de su propio recuadro (`overflow-x: auto`, 328 > 278 px). Referencia,
  no de la 008 (hallazgo previo (a)): a 360 px `/perfil` mide 522 px y `/coincidencias` 361 px.
  Capturas `t10-p23-360-*.jpg`.

**Contraste medido por CDP** (`contrast.mjs`, `p23d.mjs`, 21:30–21:31). Para cada texto
visible de `main`, la barra y el pie: color calculado y `CSS.getBackgroundColors` (el mismo
cálculo de fondos que usa el selector de color de DevTools; con degradados, el peor caso
entre sus paradas); si no lo puede calcular (fondos con capas), se toma una captura del
recuadro del elemento con el texto transparente y se usa el peor caso entre el píxel de fondo
más oscuro y el más claro ("por muestreo"; conservador). Umbral 4,5:1 (3:1 si ≥ 24 px, o ≥
18,66 px y peso ≥ 700). Estados: ficha de B en LoL, R6 y CS2 (motivo 2 y RF-13), ficha de C
(vacío, nota de zonas, sin horas, motivo 1), "no existe", errores de sección (horas y cuentas
propias bloqueadas, texto de fallo de RF-23), error de toda la ficha, carga (texto de carga de
RF-23, latencia 60 s) y, como referencia, el perfil de A; en los dos temas (`tmu.theme`).

```
[2026-10-20 21:30:30] FALLA contraste dark · ficha B, LoL: 79 textos (11 por muestreo), 1 por debajo del umbral, 0 indeterminados — {"fallos":["4.22:1 (≥4.5) «hace N · 39 min» .note note--faint"],"indeterminados":[]}
[2026-10-20 21:30:34] FALLA contraste dark · ficha B, R6: 95 textos (19 por muestreo), 5 por debajo del umbral, 0 indeterminados — {"fallos":["4.22:1 (≥4.5) «hace N · 27 min» .note note--faint","4.22:1 (≥4.5) «hace N · 17 min» .note note--faint","4.22:1 (≥4.5) «hace N · 34 min» .note note--faint","4.22:1 (≥4.5) «hace N · 37 min» .note note--faint"],"indeterminados":[]}
[2026-10-20 21:30:38] FALLA contraste dark · ficha B, CS2 (motivo 2 y RF-13): 91 textos (16 por muestreo), 5 por debajo del umbral, 0 indeterminados — {"fallos":["4.22:1 (≥4.5) «hace N · 38 min» .note note--faint","4.22:1 (≥4.5) «hace N · 39 min» .note note--faint","4.22:1 (≥4.5) «hace N · 42 min» .note note--faint","4.22:1 (≥4.5) «hace N · 40 min» .note note--faint","1.74:1 (≥4.5) «Proponer sesión» .btn btn--pen"],"indeterminados":[]}
[2026-10-20 21:30:40] FALLA contraste dark · ficha C (vacío, nota de zonas, sin horas, motivo 1): 44 textos (4 por muestreo), 1 por debajo del umbral, 0 indeterminados — {"fallos":["1.74:1 (≥4.5) «Proponer sesión» .btn btn--pen"],"indeterminados":[]}
[2026-10-20 21:30:42] OK    contraste dark · no existe (/jugadores/abc): 11 textos (0 por muestreo), 0 por debajo del umbral, 0 indeterminados — {"fallos":[],"indeterminados":[]}
[2026-10-20 21:30:45] FALLA contraste dark · errores (horas y cuentas propias bloqueadas; RF-23 fallo): 57 textos (9 por muestreo), 2 por debajo del umbral, 0 indeterminados — {"fallos":["4.22:1 (≥4.5) «hace N · 39 min» .note note--faint","1.74:1 (≥4.5) «Proponer sesión» .btn btn--pen"],"indeterminados":[]}
[2026-10-20 21:30:46] OK    contraste dark · error de toda la ficha (usuario bloqueado): 12 textos (1 por muestreo), 0 por debajo del umbral, 0 indeterminados — {"fallos":[],"indeterminados":[]}
[2026-10-20 21:30:48] FALLA contraste dark · cargando (RF-23, latencia 60 s): 12 textos (0 por muestreo), 1 por debajo del umbral, 0 indeterminados — {"fallos":["1.74:1 (≥4.5) «Proponer sesión» .btn btn--pen"],"indeterminados":[]}
[2026-10-20 21:30:52] FALLA contraste dark · perfil de A (referencia: componentes compartidos, 007): 65 textos (13 por muestreo), 7 por debajo del umbral, 0 indeterminados — {"fallos":["4.48:1 (≥4.5) «Juegos vinculados» .label","4.48:1 (≥4.5) «Cuentas verificadas» .label","3.98:1 (≥4.5) «/ 2» .ficha__of","4.48:1 (≥4.5) «Horas declaradas» .label","4.48:1 (≥4.5) «h/sem» .ficha__of","4.22:1 (≥4.5) «hace N · 44 min» .note note--faint","4.22:1 (≥4.5) «hace N · 41 min» .note note--faint"],"indeterminados":[]}
[2026-10-20 21:30:55] FALLA contraste light · ficha B, LoL: 79 textos (11 por muestreo), 5 por debajo del umbral, 0 indeterminados — {"fallos":["2.57:1 (≥4.5) «League of Legends» .sheet-title","3.91:1 (≥4.5) «Sin verificar» .stamp stamp--warn","2.41:1 (≥4.5) «Platinum I · 50 LP» .num","4.45:1 (≥4.5) «▲ +0 pts desde la primera lectura» .rank-scale__delta num","4.14:1 (≥4.5) «D» .ledger__result"],"indeterminados":[]}
[2026-10-20 21:31:00] FALLA contraste light · ficha B, R6: 95 textos (19 por muestreo), 11 por debajo del umbral, 0 indeterminados — {"fallos":["2.87:1 (≥4.5) «Rainbow Six Siege» .sheet-title","3.91:1 (≥4.5) «Sin verificar» .stamp stamp--warn","2.7:1 (≥4.5) «Emerald II · 3836 MMR» .num","4.45:1 (≥4.5) «▲ +0 pts desde la primera lectura» .rank-scale__delta num","4.14:1 (≥4.5) «D» .ledger__result","3.74:1 (≥4.5) «V» .ledger__result","4.28:1 (≥4.5) «+33» .ledger__delta","4.28:1 (≥4.5) «+24» .ledger__delta"],"indeterminados":[]}
[2026-10-20 21:31:04] FALLA contraste light · ficha B, CS2 (motivo 2 y RF-13): 91 textos (16 por muestreo), 10 por debajo del umbral, 0 indeterminados — {"fallos":["2.97:1 (≥4.5) «Counter-Strike 2» .sheet-title","2.79:1 (≥4.5) «Gold · 31789 CS Rating» .num","4.45:1 (≥4.5) «▲ +0 pts desde la primera lectura» .rank-scale__delta num","3.74:1 (≥4.5) «V» .ledger__result","4.28:1 (≥4.5) «+253» .ledger__delta","4.14:1 (≥4.5) «D» .ledger__result","4.28:1 (≥4.5) «+272» .ledger__delta","2.61:1 (≥4.5) «Proponer sesión» .btn btn--pen"],"indeterminados":[]}
[2026-10-20 21:31:06] FALLA contraste light · ficha C (vacío, nota de zonas, sin horas, motivo 1): 44 textos (4 por muestreo), 1 por debajo del umbral, 0 indeterminados — {"fallos":["2.61:1 (≥4.5) «Proponer sesión» .btn btn--pen"],"indeterminados":[]}
[2026-10-20 21:31:08] OK    contraste light · no existe (/jugadores/abc): 11 textos (0 por muestreo), 0 por debajo del umbral, 0 indeterminados — {"fallos":[],"indeterminados":[]}
[2026-10-20 21:31:11] FALLA contraste light · errores (horas y cuentas propias bloqueadas; RF-23 fallo): 57 textos (9 por muestreo), 6 por debajo del umbral, 0 indeterminados — {"fallos":["2.57:1 (≥4.5) «League of Legends» .sheet-title","3.91:1 (≥4.5) «Sin verificar» .stamp stamp--warn","2.41:1 (≥4.5) «Platinum I · 50 LP» .num","4.45:1 (≥4.5) «▲ +0 pts desde la primera lectura» .rank-scale__delta num","4.14:1 (≥4.5) «D» .ledger__result","2.61:1 (≥4.5) «Proponer sesión» .btn btn--pen"],"indeterminados":[]}
[2026-10-20 21:31:12] OK    contraste light · error de toda la ficha (usuario bloqueado): 12 textos (1 por muestreo), 0 por debajo del umbral, 0 indeterminados — {"fallos":[],"indeterminados":[]}
[2026-10-20 21:31:14] FALLA contraste light · cargando (RF-23, latencia 60 s): 12 textos (0 por muestreo), 1 por debajo del umbral, 0 indeterminados — {"fallos":["2.61:1 (≥4.5) «Proponer sesión» .btn btn--pen"],"indeterminados":[]}
[2026-10-20 21:31:18] FALLA contraste light · perfil de A (referencia: componentes compartidos, 007): 65 textos (13 por muestreo), 6 por debajo del umbral, 0 indeterminados — {"fallos":["2.57:1 (≥4.5) «League of Legends» .sheet-title","2.41:1 (≥4.5) «Emerald II · 59 LP» .num","4.45:1 (≥4.5) «▲ +0 pts desde la primera lectura» .rank-scale__delta num","4.14:1 (≥4.5) «D» .ledger__result","3.74:1 (≥4.5) «V» .ledger__result","4.28:1 (≥4.5) «+17» .ledger__delta"],"indeterminados":[]}
```

Textos que pedía medir la Pregunta 8 (P60) y los de los demás estados (mínimo de todos los
estados):

| Texto | Oscuro | Claro | Resultado |
| --- | --- | --- | --- |
| `DemoTag` (`note note--faint`), en el panel, la distancia y el pie | 4,61:1 | 4,56:1 | OK |
| `DemoTag` de la barra (`dock__demo`) | 4,96:1 | 5,08:1 | OK |
| Mensaje de `Failure` (`note note--faint`), "No se pudo conectar con el servidor. Inténtalo de nuevo." | 4,61:1 | 4,56:1 | OK |
| Título de `Failure` "No se pudieron cargar los datos" | 7,36:1 | 7,23:1 | OK |
| `Blank` "Este jugador no existe" / "Este jugador no ha vinculado ningún juego" (título; la ficha no usa la descripción de `Blank`) | 7,36:1 | 7,23:1 | OK |
| Motivos de bloqueo y textos de RF-23 (`note`) | 7,36:1 | 8,11:1 | OK |
| Nota de zonas (`notice`) | 7,36:1 | 8,11:1 | OK |
| "Sin horas en común esta semana." (`note`) | ≥ 7,36:1 | ≥ 8,11:1 | OK |

Por debajo del umbral (detalle en la salida):
- **Tema claro** (defecto D10-1): nombre del juego del panel en su color (`.sheet-title`, 19 px,
  peso 600: LoL 2,57, R6 2,87, CS2 2,97), rango vigente en el color del juego (`.num`: 2,41 a
  2,79), sello "Sin verificar" 3,91, "▲ +0 pts desde la primera lectura" 4,45, resultado de
  partida "D" 4,14 y "V" 3,74, variación positiva de la partida ("+33", "+253"…) 4,28. Los
  mismos valores aparecen en el **perfil** de A (componentes de la 007 que la ficha reutiliza:
  `AccountRow`, `RankScale`, tabla de partidas de `GameSummaryPanel`).
- **Tema oscuro** (defecto D10-2): la línea "hace N · M min" de cada partida (`note
  note--faint` sobre el fondo de la fila) 4,22:1 por muestreo; también en el perfil.
- "Proponer sesión" deshabilitado (`aria-disabled`, atenuado): 1,74:1 oscuro y 2,61:1 claro.
  WCAG 1.4.3 exime los componentes inactivos, pero RNF-5 dice "todo texto de la ficha":
  posible cambio de spec C10-1.
- El perfil, en oscuro, tiene además etiquetas de totales a 4,48:1 (no es de la 008).

**Lighthouse 12.8.2** (`lh.mjs`, 21:32–21:33; `npx -y lighthouse@12.8.2 <url> --port=<Chrome
de A> --only-categories=accessibility --preset=desktop --disable-storage-reset`), sobre la
ficha de B en LoL y en CS2 y la ficha de C, en los dos temas:

```
[2026-10-20 21:32:09] OK    Lighthouse dark · ficha-b-lol: accesibilidad 91; color-contrast sin fallos — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","auditoríasFallidas":["aria-required-children","aria-required-parent"],"contraste":[]}
[2026-10-20 21:32:20] OK    Lighthouse dark · ficha-b-cs2: accesibilidad 91; color-contrast sin fallos — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=cs2","auditoríasFallidas":["aria-required-children","aria-required-parent"],"contraste":[]}
[2026-10-20 21:32:31] OK    Lighthouse dark · ficha-c: accesibilidad 89; color-contrast sin fallos — {"url":"/jugadores/6ad8031d6f785278afeeb067","auditoríasFallidas":["aria-required-children","aria-required-parent"],"contraste":[]}
[2026-10-20 21:32:41] OK    Lighthouse light · ficha-b-lol: accesibilidad 91; color-contrast sin fallos — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","auditoríasFallidas":["aria-required-children","aria-required-parent"],"contraste":[]}
[2026-10-20 21:32:52] OK    Lighthouse light · ficha-b-cs2: accesibilidad 91; color-contrast sin fallos — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=cs2","auditoríasFallidas":["aria-required-children","aria-required-parent"],"contraste":[]}
[2026-10-20 21:33:03] OK    Lighthouse light · ficha-c: accesibilidad 89; color-contrast sin fallos — {"url":"/jugadores/6ad8031d6f785278afeeb067","auditoríasFallidas":["aria-required-children","aria-required-parent"],"contraste":[]}
```

- Contraste: **la auditoría `color-contrast` no da ningún fallo** en ninguno de los seis casos.
  No coincide con la medición anterior: Lighthouse (axe) deja como "incompletos", sin
  fallarlos, los textos sobre fondos con degradado, que es el caso de las tarjetas de la ficha
  (`CSS.getBackgroundColors` devuelve dos paradas, p. ej. `rgb(250, 251, 252) | rgb(255, 255,
  255)`). La captura de página completa de Lighthouse (`t10-lighthouse-claro-ficha-b-lol.jpg`)
  confirma que auditó la ficha cargada en el tema claro.
- Otras auditorías fallidas (observación O-3, no de contraste): `aria-required-children` y
  `aria-required-parent` en las filas `div.hours__row[role=row]` de la grilla de horas
  (`HoursSheet`, componente de la 007 que la ficha reutiliza). Puntuación de accesibilidad 91
  (ficha de B) y 89 (ficha de C).

### 4.3 Agenda (parte 3; 2026-10-20, 21:34–21:35)

`p3.mjs` (A todavía con LoL):

```
[2026-10-20 21:34:30] OK    3.1a "Proponer sesión" abre el formulario — {"title":"Sesión con Bruno Val","game":"League of Legends [lol]","gameOptions":["lol","r6"],"day":"Martes [1]","hour":"20:00 [20]","duration":"3 [3]","slots":"5 [5]","notes":""}
[2026-10-20 21:34:32] OK    3.1b recargar la agenda la muestra sin formulario (RF-21; 007 RF-30) — {"form":false,"alerts":[],"state":null}
[2026-10-20 21:34:35] OK    3.2 "Atrás" vuelve a la ficha y "Adelante" a la agenda sin reabrir el formulario (RF-21) — {"atrás":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","adelante":"/agenda","form":false,"alerts":[],"state":null}
[2026-10-20 21:34:48] OK    3.3 con 3G lenta, "Proponer sesión" abre el formulario con la lista de juegos cargada y LoL elegido (RF-21; 007 RF-30) — {"ms":11150,"form":{"title":"Sesión con Bruno Val","game":"League of Legends [lol]","gameOptions":["lol","r6"],"day":"Martes [1]","hour":"20:00 [20]","duration":"3 [3]","slots":"5 [5]","notes":""},"peticiones":["GET /api/accounts?user=me","GET /api/users/me/availability","GET /api/sessions?game=all"]}
[2026-10-20 21:34:52] OK    3.4 bloqueadas las cuentas de A, la agenda muestra el error y no abre el formulario (RF-21; 007 RF-30) — {"form":false,"alerts":["No se pudieron cargar los datos / No se pudo conectar con el servidor. Inténtalo de nuevo. / Reintentar","No estás en ninguna sesión / Haz clic en un bloque de la semana para publicar la tuya, o abre una existente y súmate."],"state":null,"peticiones":["GET /api/accounts?user=me","GET /api/users/me/availability","GET /api/sessions?game=all"]}
[2026-10-20 21:34:53] FALLA 3.4b ninguno de esos formularios se anotó — sesiones en la base: 0
[2026-10-20 21:34:57] OK    3.5a A desvincula su cuenta de LoL en otra pestaña (Configuración, "Desvincular", confirmación aceptada) — {"fila":"League of Legends / jugador1#las / VERIFICADA / Datos de demostración / RANGO VIGENTE / Em","cuentasDeA":["r6"]}
[2026-10-20 21:35:00] FALLA 3.5b "Proponer sesión": la agenda no abre el formulario y se muestra como abierta directamente (RF-21; P33) — {"url":"/agenda","form":false,"alerts":["No estás en ninguna sesión / Haz clic en un bloque de la semana para publicar la tuya, o abre una existente y súmate."],"state":null}
[2026-10-20 21:35:02] OK    3.5c al volver a la ficha y recargarla: RF-13 en la distancia y motivo 2, sin "Reintentar" (RF-6, RF-13, RF-21; P33) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","distancia":"DISTANCIA DE RANGO\n\nVincula tu cuenta de LoL para ver la distancia de rango","proponer":{"text":"Proponer sesión","ariaDisabled":"true","disabled":false,"reason":"Vincula tu cuenta de LoL para proponer una sesión"}}
[2026-10-20 21:35:03] INFO  consola — []
```

- 3.1 **OK**: tras abrir el formulario desde la ficha de B en LoL, recargar la agenda la muestra
  sin formulario (`history.state.usr` vacío).
- 3.2 **OK**: "Atrás" vuelve a la ficha en LoL y "Adelante" a la agenda sin reabrir el
  formulario.
- 3.3 **OK**: con 3G lenta, "Proponer sesión" abre el formulario (11,2 s) con la lista de juegos
  ya cargada (`lol`, `r6`) y LoL elegido.
- 3.4 **OK**: con `GET /api/accounts?user=me` bloqueada, la agenda muestra "No se pudieron
  cargar los datos / No se pudo conectar con el servidor. Inténtalo de nuevo. / Reintentar" y no
  abre el formulario. Ningún formulario de la parte 3 se anotó.
- **Incidente I-1 (del script, no de la aplicación):** 3.4b marcó "FALLA" porque había 0
  sesiones en la base. En 3.3 el script cerró el formulario con `clickText('.slip button,
  button', 'Cancelar')`, que toma el primer botón del documento cuyo texto contiene
  "Cancelar": era "Cancelar sesión" de la sesión del recorrido en "Mis sesiones" (detrás del
  formulario, ver `t10-p3-3g-formulario-1280.jpg`); el `click()` por JavaScript no pasa por la
  capa del formulario y el `confirm` lo aceptó el arnés. Así se canceló (`DELETE`) la sesión de
  LoL que A había anotado en 1.12. La aplicación hizo lo que se le pidió. Consecuencia: la parte
  4 no puede observar que "la desvinculación de LoL no afectó a la sesión de LoL ya creada"
  (ver 4.4). Los pasos siguientes cierran el formulario con el "Cancelar" del pie del propio
  formulario.
- 3.5 **OK**: con la ficha de B abierta en LoL, A desvincula su cuenta de LoL en **otra
  pestaña** (Configuración → "Desvincular" de `jugador1#las`, confirmación aceptada; cuentas de
  A: `["r6"]`) y pulsa "Proponer sesión": la agenda no abre el formulario, sin error y sin
  estado de navegación; se ve como abierta directamente. La "FALLA" de 3.5b es del script:
  contó como alerta el `Blank` "No estás en ninguna sesión", que es el estado normal de la
  agenda vacía (por I-1). Al volver a la ficha y recargarla: "Vincula tu cuenta de LoL para ver
  la distancia de rango" y motivo 2 "Vincula tu cuenta de LoL para proponer una sesión", sin
  ningún "Reintentar" (RF-6, RF-13, RF-21; P33). A no vuelve a vincular LoL.

Capturas: `t10-p3-3g-formulario-1280.jpg`, `t10-p3-cuentas-bloqueadas-1280.jpg`,
`t10-p3-agenda-sin-lol-1280.jpg`, `t10-p3-ficha-sin-lol-1280.jpg`.

### 4.4 Paso final de CS2 (parte 4; 2026-10-20, 21:36)

`p4.mjs`. A vincula CS2 por la API con su sesión (`76561190000000001`, Red, 83, verificada);
cuentas de A: R6 y CS2; disponibilidad del recorrido restaurada.

```
[2026-10-20 21:36:16] OK    4.1 A vincula CS2 76561190000000001 (POST /api/accounts con la sesión de A) — {"status":201,"rango":{"tier":"Red","points":28063,"normalized":83,"recordedAt":"2026-10-21T00:36:16.141Z"},"verified":true,"simulated":true}
[2026-10-20 21:36:16] INFO  4.1 cuentas de A — ["r6 jugador3","cs2 76561190000000001"]
[2026-10-20 21:36:16] INFO  4.1 disponibilidad de A — ["1-20","1-21","1-22","3-3","0-15"]
[2026-10-20 21:36:22] OK    4.2 B aparece en las coincidencias de CS2 de A — BV | Bruno Val | @Val008B · <b>x</b> | Gold · 31789 CS Rating | Δ 17 pts | Datos de demostración | 4 horas | Mar 20:00–23:00 | 40 | Aceptable | Datos de demostración | Proponer | Horas
[2026-10-20 21:36:24] OK    4.3 ficha de B en CS2: rango, escala Grey a Gold con CS Rating, partidas "<mapa> · a-b" con variación, distancia con la etiqueta igual a la fila (RF-4, RF-6, RF-27) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=cs2","panel":"Counter-Strike 2 | SteamID64 · 76561190000000003 | VERIFICADA | Datos de demostración | RANGO VIGENTE | Gold · 31789 CS Rating | Datos de demostración | REGIÓN | South America | ÚLTIMA LECTURA | hace 25 minutos | POSICIÓN EN LA ESCALA DEL JUEGO | 1 lectura registrada · Datos de demostración | GREY | ▲ +0 pts desde la primera lectura | GOLD | Primera lectura: Gold · 31789 CS Rating | Últimas partidas | 50% ganadas | Datos de demostración  …
[2026-10-20 21:36:24] OK    4.4 "Proponer sesión" ya no muestra el motivo 2 — {"text":"Proponer sesión","ariaDisabled":null,"disabled":false,"reason":null}
[2026-10-20 21:36:26] OK    4.5 abre el formulario con CS2, martes, 20:00 y 3 horas (RF-7, RF-12; P31) — {"title":"Sesión con Bruno Val","game":"Counter-Strike 2 [cs2]","gameOptions":["r6","cs2"],"day":"Martes [1]","hour":"20:00 [20]","duration":"3 [3]","slots":"5 [5]","notes":""}
[2026-10-20 21:36:27] OK    4.5 formulario cerrado sin anotar — sesiones en la base: 0
```

- **OK**: B aparece en las coincidencias de CS2 de A ("Gold · 31789 CS Rating", "Δ 17 pts",
  Etiqueta, "4 horas"); su ficha en CS2 muestra el rango, la escala Grey–Gold con CS Rating, las
  partidas con el formato `<mapa> · <a favor>-<en contra>` ("Nuke · 13-8", "Ancient · 8-13"…)
  y su variación, la distancia "Δ 17 pts" con la Etiqueta, igual que la fila; "Proponer sesión"
  ya no muestra el motivo 2 y abre el formulario con CS2, Martes, 20:00 y 3 horas (RF-4, RF-6,
  RF-7, RF-12, RF-27; P31). El formulario se cerró sin anotar.
- **No comprobado en la interfaz (I-1):** "la desvinculación de LoL no afectó a la sesión de
  LoL ya creada (spec 006, RF-27)": la sesión ya no existía por el incidente de 3.3. Revisión de
  código en su lugar: desvincular una cuenta (`accountWrites.ts`, `controllers/accounts.ts`) no
  toca `PlaySession`; el único borrado de sesiones fuera de cancelar es el de eliminar el usuario
  (`controllers/users.ts:235`, `PlaySession.deleteMany({ host })`). Queda pendiente repetirlo si
  el usuario lo pide (ver 4.8).

Capturas: `t10-p4-coincidencias-cs2-1280.jpg`, `t10-p4-ficha-b-cs2-1280.jpg`,
`t10-p4-agenda-form-cs2-1280.jpg`.

### 4.5 Pestaña que desaparece (parte 5; RF-19, RF-26; 2026-10-20, 21:37)

Se hizo en el mismo script que la parte 6 (`p56.mjs`), en orden; salida y resultado en 4.6.

### 4.6 Eliminación de B (parte 6; último paso; 2026-10-20, 21:37)

`p56.mjs` (partes 5 y 6 en el mismo script, en orden):

```
[2026-10-20 21:37:09] OK    5.1 A: ficha de B en CS2 (sin elegir R6) — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=cs2","tabs":["League of Legends","Rainbow Six Siege","*Counter-Strike 2"]}
[2026-10-20 21:37:14] OK    5.2 B desvincula R6 en otro navegador (Configuración, "Desvincular", confirmación aceptada) — {"fila":"Rainbow Six Siege / jugador1 / SIN VERIFICAR / Datos de demostración / RANGO VIG"}
[2026-10-20 21:37:19] OK    5.3 volver el foco (y "online") a la ventana de A: ninguna petición en la red y ningún cambio (RF-26) — {"peticiones":[],"sinCambios":true}
[2026-10-20 21:37:23] OK    5.4 elegir R6: carga de la sección de juegos mientras pide usuario y cuentas; R6 desaparece y pasa a LoL, también en la dirección (RF-8, RF-19; P47) — {"estados":["+0.03s /jugadores/6ad8031c6f785278afeeb04f?juego=r6 {\"page\":\"ficha\",\"juegos\":\"listo\",\"panel\":\"cargando\",\"distancia\":\"cargando\",\"horas\":\"listo\",\"proponer\":\"habilitado\"} tabs=[\"League of Legends\",\"*Rainbow Six Siege\",\"Counter-Strike 2\"]","+0.08s /jugadores/6ad8031c6f785278afeeb04f?juego=r6 {\"page\":\"ficha\",\"juegos\":\"listo\",\"panel\":\"cargando\",\"distancia\":\"listo\",\"horas\":\"listo\",\"proponer\":\"bloqueado: Vincula tu cuenta de LoL para proponer una sesión\"} ta …
[2026-10-20 21:37:23] INFO  5.5 historial: la corrección reemplaza la entrada — ["/inicio","/coincidencias","/jugadores/6ad8031c6f785278afeeb04f?juego=lol"]
[2026-10-20 21:37:24] OK    6.1 A recarga la ficha de B en LoL — {"url":"/jugadores/6ad8031c6f785278afeeb04f?juego=lol","tabs":["*League of Legends","Counter-Strike 2"]}
[2026-10-20 21:37:25] OK    6.2 B elimina su cuenta en otro cliente (DELETE /api/users/me con la sesión de B; la interfaz no tiene esa acción) — {"status":204}
[2026-10-20 21:37:25] OK    6.3 A elige CS2: "Este jugador no existe" en lugar de toda la ficha, no "Este jugador no ha vinculado ningún juego" (RF-9, RF-19; P32) — {"main":"Este jugador no existe / Ir a coincidencias","peticiones":["GET /api/users/6ad8031c6f785278afeeb04f/games/cs2","GET /api/users/6ad8031c6f785278afeeb04f","GET /api/accounts?user=6ad8031c6f785278afeeb04f"],"url":"/jugadores/6ad8031c6f785278afeeb04f"}
[2026-10-20 21:37:26] INFO  consola — []
```

- Parte 5 **OK**: A abre la ficha de B en CS2 desde sus coincidencias de CS2, sin elegir R6. B,
  en **su propio navegador** (otro Chrome, otro perfil), desvincula R6 en Configuración. Volver
  el foco a la ventana de A (`Page.bringToFront` y los eventos `focus`, `visibilitychange` y
  `online`): **ninguna petición** en la red en 5 s y ningún cambio en la ficha (RF-26). Al
  elegir R6: la sección del juego muestra su carga, se piden `GET …/games/r6` (404), `GET
  /api/users/<B>` y `GET /api/accounts?user=<B>`, la pestaña R6 desaparece y la ficha pasa a
  LoL, también en la dirección (`?juego=lol`, entrada reemplazada); como A ya no tiene LoL, LoL
  muestra RF-13 y el motivo 2 (esperado; P42) (RF-8, RF-19; P47). Captura
  `t10-p5-r6-desaparece-1280.jpg`.
- Parte 6 **OK**: A recarga la ficha de B en LoL (CS2 no vista desde la recarga); B elimina su
  cuenta (`DELETE /api/users/me` con su sesión → 204; la interfaz no tiene esa acción, así que
  se hizo por la API, en otro cliente); A elige CS2: se piden el resumen de CS2, el usuario y
  las cuentas, y la ficha muestra "Este jugador no existe" con "Ir a coincidencias" en lugar de
  toda la ficha, no "Este jugador no ha vinculado ningún juego" (RF-9, RF-19; P32). Captura
  `t10-p6-b-eliminado-1280.jpg`.

### Fuera del orden

#### Título con tabulador (RF-7; P34, P40, P45, P46; 2026-10-20, 21:38)

`pt.mjs`. D (`jugador.d.ejemplo@example.com`, los datos de `users.rest`) y E, propios de esta
comprobación, registrados en `teammatchup_val008` (paso 1 de `auth.rest` con sus datos); los
dos vinculan LoL (`Jugador3#LAS` y `jugador4#las`) y guardan miércoles 18:00 y 19:00. Paso 14
de `users.rest`: inicio de sesión de D y `PATCH /api/users/me` con el cuerpo **copiado
literalmente del archivo** (`{ "displayName": "Jugador\tD" }`, con `\t` escrito como barra
invertida y `t`).

```
[2026-10-20 21:38:01] OK    T.0 registro de D (paso 1 de auth.rest con sus datos) — {"status":201,"id":"6ad80968fac66229857ee997"}
[2026-10-20 21:38:01] OK    T.0 registro de E (paso 1 de auth.rest con sus datos) — {"status":201,"id":"6ad80969fac66229857ee99b"}
[2026-10-20 21:38:01] OK    T.0 D vincula lol Jugador3#LAS — {"status":201,"rango":40}
[2026-10-20 21:38:01] OK    T.0 D guarda miércoles 18:00 y 19:00 — ["2-18","2-19"]
[2026-10-20 21:38:01] OK    T.0 E vincula lol jugador4#las — {"status":201,"rango":43}
[2026-10-20 21:38:01] OK    T.0 E guarda miércoles 18:00 y 19:00 — ["2-18","2-19"]
[2026-10-20 21:38:01] OK    T.1 paso 14: POST /api/auth/login (D) → PATCH /api/users/me — {"login":200,"cuerpoEnviado":"{\n  \"displayName\": \"Jugador\\tD\"\n}","status":200,"respuesta":{"id":"6ad80968fac66229857ee997","username":"JugadorDEjemplo","displayName":"Jugador\tD","avatarColor":"#6d5efc","bio":"","timezone":"America/Santiago","createdAt":"2026-10-21T00:38:00.989Z","email":"jugador.d.ejemplo@example.com"},"displayNameJSON":"\"Jugador\\tD\""}
[2026-10-20 21:38:05] OK    T.2 E abre la ficha de D: nombre con el tabulador como texto — {"h1":"\"Jugador\\tD\"","title":"\"Jugador D · TeamMatchUp\"","tramos":["Mié 18:00–20:00"],"proponer":{"text":"Proponer sesión","ariaDisabled":null,"disabled":false,"reason":null}}
[2026-10-20 21:38:06] OK    T.3 "Proponer sesión" abre el formulario con "Sesión con Jugador\tD" — {"titulo":"\"Sesión con Jugador\\tD\"","juego":"League of Legends [lol]","dia":"Miércoles [2]","hora":"18:00 [18]","duracion":"2 [2]"}
[2026-10-20 21:38:08] OK    T.4 al anotar, el formulario muestra el error del título y no se anota nada — {"errores":["El título debe tener entre 3 y 60 caracteres."],"peticionesPOST":1,"cuál":"mensaje del servidor (007 RF-9)","sesionesConEseTítulo":0}
[2026-10-20 21:38:10] OK    T.5 tras corregir el título ("Sesión con Jugador D"), la sesión se anota — [{"title":"Sesión con Jugador D","gameId":"lol","day":2,"startHour":18}]
[2026-10-20 21:38:10] FALLA peticiones de la interfaz: solo a localhost (sin dominios externos) — ["localhost:5192",""]
```

- Petición: `POST /api/auth/login` (D) → 200; `PATCH /api/users/me` → **200**, `"displayName":
  "Jugador\tD"` (con el tabulador).
- Interfaz: E abre la ficha de D: el `h1` es `"Jugador\tD"` (texto; el título de la pestaña
  del navegador lo muestra como "Jugador D · TeamMatchUp" porque el navegador colapsa espacios
  en `document.title`); tramo "Mié 18:00–20:00". "Proponer sesión" abre el formulario con
  "Sesión con Jugador\tD", LoL, Miércoles, 18:00, 2 horas.
- Al anotar: **mensaje del servidor** "El título debe tener entre 3 y 60 caracteres." (hubo un
  `POST /api/sessions`; el formulario no aplica las reglas de DP6-33 antes de enviar); no se
  anotó nada.
- Tras corregir el título a "Sesión con Jugador D": la sesión se anota (lol, miércoles 18:00).
- La "FALLA" de la última línea es del script: el destino vacío `""` son URL `data:`; todas las
  demás peticiones fueron a `localhost:5192`. Captura `t10-pt-titulo-error-1280.jpg`.

#### Etiqueta de datos simulados con el servidor real (RF-27)

En el recorrido (4.1, 1.5 a 1.9) y en 4.4: la Etiqueta «Datos de demostración» aparece junto a
la marca de verificada, junto al rango vigente, junto al historial ("1 lectura registrada ·
Datos de demostración", que encabeza escala, primera lectura y diferencia), junto a "Últimas
partidas" y junto a "Δ n pts", en los tres juegos; el aviso global sigue en la barra y en el pie
(captura `t10-p1-ficha-b-lol-1280.jpg`). Ningún texto nombra Riot, Ubisoft, Valve, Steam,
FACEIT ni Leetify salvo las etiquetas "Riot ID", "Ubisoft ID" y "SteamID64", y no aparece
"verificado". **OK.**

#### Modo simulado con la cuenta demo (RF-11, RF-15, RF-16, RF-27; P43, P48, P49; 2026-10-20, 21:38–21:40)

`pm.mjs` y `pm2.mjs`, interfaz en modo simulado (`localhost:5193`), cuenta demo (`user-1`).

```
[2026-10-20 21:38:51] INFO  M.0 cuenta demo — {"id":"user-1","usuarios":16,"cuentas":25}
[2026-10-20 21:38:55] OK    M.1 lol: ficha de Fernanda Soto desde coincidencias — rango, historial, partidas, marca y Etiqueta (también en la distancia) (RF-16, RF-27) — {"url":"/jugadores/user-9?juego=lol","etiquetasEnElPanel":4,"distancia":"DISTANCIA DE RANGO\n\nΔ 0 pts\nDatos de demostración","panel":"League of Legends | Riot ID · Ignxcia#099 | VERIFICADA | Datos de demostración | RANGO VIGENTE | Emerald II · 27 LP | Datos de demostración | REGIÓN | LAN | ÚLTIMA LECTURA | hace 10 horas | POSICIÓN EN LA ESCALA DEL JUEGO | 1 lectura registrada · Datos de demostración | IRON | ▲ +0 pts desde la primera lectura | CHALLENGER | Primera lectura: Emerald II · 27 LP | Últimas partidas | 67% ganada …
[2026-10-20 21:39:00] OK    M.1 r6: ficha de Felipe Navarro desde coincidencias — rango, historial, partidas, marca y Etiqueta (también en la distancia) (RF-16, RF-27) — {"url":"/jugadores/user-10?juego=r6","etiquetasEnElPanel":4,"distancia":"DISTANCIA DE RANGO\n\nΔ 3 pts\nDatos de demostración","panel":"Rainbow Six Siege | Ubisoft ID · rifle_cl_14 | VERIFICADA | Datos de demostración | RANGO VIGENTE | Emerald I · 3961 MMR | Datos de demostración | REGIÓN | LATAM | ÚLTIMA LECTURA | hace 16 horas | POSICIÓN EN LA ESCALA DEL JUEGO | 1 lectura registrada · Datos de demostración | COPPER | ▲ +0 pts desde la primera lectura | CHAMPION | Primera lectura: Emerald I · 3961 MMR | Últimas partidas | 1 …
[2026-10-20 21:39:04] OK    M.1 cs2: ficha de Milagros Quiroz desde coincidencias — rango, historial, partidas, marca y Etiqueta (también en la distancia) (RF-16, RF-27) — {"url":"/jugadores/user-13?juego=cs2","etiquetasEnElPanel":4,"distancia":"DISTANCIA DE RANGO\n\nΔ 0 pts\nDatos de demostración","panel":"Counter-Strike 2 | SteamID64 · 76561198000000481 | VERIFICADA | Datos de demostración | RANGO VIGENTE | Red · 25761 CS Rating | Datos de demostración | REGIÓN | South America | ÚLTIMA LECTURA | hace 6 horas | POSICIÓN EN LA ESCALA DEL JUEGO | 1 lectura registrada · Datos de demostración | GREY | ▲ +0 pts desde la primera lectura | GOLD | Primera lectura: Red · 25761 CS Rating | Últimas pa …
[2026-10-20 21:39:08] OK    M.2 lol: hay cuentas "Verificada" y "Sin verificar" entre las semilla, con la Etiqueta junto a la marca (RF-16, RF-27) — {"true":{"jugador":"Isidora Campos","handle":"Nocturna#038","marca":"Verificada","junto":"VERIFICADA | Datos de demostración"},"false":{"jugador":"Renata Bustos","handle":"ZorroAzul#107","marca":"Sin verificar","junto":"SIN VERIFICAR | Datos de demostración"}}
[2026-10-20 21:39:11] OK    M.2 r6: hay cuentas "Verificada" y "Sin verificar" entre las semilla, con la Etiqueta junto a la marca (RF-16, RF-27) — {"true":{"jugador":"Antonia Herrera","handle":"pau.exe_104","marca":"Verificada","junto":"VERIFICADA | Datos de demostración"},"false":{"jugador":"Catalina Leiva","handle":"jugador3","marca":"Sin verificar","junto":"SIN VERIFICAR | Datos de demostración"}}
[2026-10-20 21:39:15] OK    M.2 cs2: hay cuentas "Verificada" y "Sin verificar" entre las semilla, con la Etiqueta junto a la marca (RF-16, RF-27) — {"true":{"jugador":"Felipe Navarro","handle":"76561198000000111","marca":"Verificada","junto":"VERIFICADA | Datos de demostración"},"false":{"jugador":"Isidora Campos","handle":"76561198000000851","marca":"Sin verificar","junto":"SIN VERIFICAR | Datos de demostración"}}
[2026-10-20 21:39:16] OK    M.3 /jugadores/user-999999 → "Este jugador no existe" (RF-9, RF-15; P43) — Este jugador no existe / Ir a coincidencias
[2026-10-20 21:39:17] OK    M.3 /jugadores/abc → "Este jugador no existe" (RF-9, RF-15; P43) — Este jugador no existe / Ir a coincidencias
[2026-10-20 21:39:18] FALLA M.3 /jugadores/ME → "Este jugador no existe" (RF-9, RF-15; P43) — Cruce con tu perfil / Proponer sesión / Cargando los datos para proponer una sesión…
[2026-10-20 21:39:21] FALLA M.4 /jugadores/user-1 → perfil; "Atrás" no vuelve a la ficha (RF-15; P43) — {"historial":["http://localhost:5193/inicio","http://localhost:5193/perfil"],"trasAtrás":"/inicio"}
[2026-10-20 21:39:23] FALLA M.4 /jugadores/USER-1 → perfil; "Atrás" no vuelve a la ficha (RF-15; P43) — {"historial":["http://localhost:5193/inicio","http://localhost:5193/perfil"],"trasAtrás":"/inicio"}
[2026-10-20 21:39:26] FALLA M.4 /jugadores/me → perfil; "Atrás" no vuelve a la ficha (RF-15; P43) — {"historial":["http://localhost:5193/inicio","http://localhost:5193/perfil"],"trasAtrás":"/inicio"}
[2026-10-20 21:39:30] FALLA M.5 /jugadores/USER-2 abre la ficha de Isidora Campos con los mismos datos que user-2 (RF-11; P49) — {"h1":"Isidora Campos","igual":false,"url":"/jugadores/USER-2?juego=lol"}
[2026-10-20 21:39:30] OK    M.6 la pestaña de red no muestra peticiones al servidor (RF-11, RF-16, RF-27) — {"peticionesApi":0,"totalPeticiones":2417,"destinos":["localhost:5193","data:"]}
[2026-10-20 21:39:30] OK    M.7 ningún nombre de fuente ni "verificado"; aviso global en barra y pie (RF-16, RF-27) — ok
[2026-10-20 21:39:30] INFO  consola — []
```

M.3 (`ME`), M.4 y M.5 marcaron "FALLA" por el script: M.3 leyó el texto mientras la página
anterior todavía salía (transición), M.4 comparaba el historial con la dirección del otro
puerto (los valores mostrados son los correctos: `/inicio`, `/perfil`, "Atrás" → `/inicio`) y
M.5 tomó la instantánea durante la animación de entrada. Repetidos con esperas correctas y
comparación campo a campo (`pm2.mjs`):

```
[2026-10-20 21:39:52] OK    M.3 /jugadores/ME → "Este jugador no existe" (RF-9, RF-15; P43) — Este jugador no existe / Ir a coincidencias
[2026-10-20 21:39:54] OK    M.3 /jugadores/user-999999 → "Este jugador no existe" (RF-9, RF-15; P43) — Este jugador no existe / Ir a coincidencias
[2026-10-20 21:39:57] OK    M.3 /jugadores/abc → "Este jugador no existe" (RF-9, RF-15; P43) — Este jugador no existe / Ir a coincidencias
[2026-10-20 21:39:59] OK    M.4 /jugadores/user-1 → perfil; "Atrás" no vuelve a la ficha (RF-15; P43) — {"historial":["/inicio","/perfil"],"trasAtrás":"/inicio"}
[2026-10-20 21:40:02] OK    M.4 /jugadores/USER-1 → perfil; "Atrás" no vuelve a la ficha (RF-15; P43) — {"historial":["/inicio","/perfil"],"trasAtrás":"/inicio"}
[2026-10-20 21:40:05] OK    M.4 /jugadores/me → perfil; "Atrás" no vuelve a la ficha (RF-15; P43) — {"historial":["/inicio","/perfil"],"trasAtrás":"/inicio"}
[2026-10-20 21:40:10] OK    M.5 /jugadores/USER-2 abre la ficha de user-2 con los mismos datos (RF-11; P49) — {"h1":"Isidora Campos","url":"/jugadores/USER-2?juego=lol"}
[2026-10-20 21:40:10] OK    M.6 peticiones a /api/ — 0
```

- **OK**: desde coincidencias, la ficha de un jugador semilla en cada juego (Fernanda Soto en
  LoL, Felipe Navarro en R6, Milagros Quiroz en CS2) muestra rango, historial, partidas y la
  marca, con la Etiqueta (4 en el panel) y junto a "Δ n pts". En cada juego hay fichas semilla
  "Verificada" y "Sin verificar" con la Etiqueta junto a la marca (LoL: Isidora Campos /
  Renata Bustos; R6: Antonia Herrera / Catalina Leiva; CS2: Felipe Navarro / Isidora Campos).
- `user-999999`, `abc` y `ME` → "Este jugador no existe". `user-1`, `USER-1` y `me` → `/perfil`
  y "Atrás" no vuelve a la ficha. `/jugadores/USER-2` abre la ficha de Isidora Campos con los
  mismos datos que `user-2` (todos los campos iguales salvo la dirección).
- **Red:** 0 peticiones a `/api` en 2417 peticiones; destinos solo `localhost:5193` y `data:`.
- Sin nombres de fuentes ni "verificado"; aviso global en la barra y en el pie.
- RF-19 en modo simulado: por revisión del mock (4.A) y por T3 con Node (16/16).

### 4.7 Criterios de finalización de la spec (estado al cerrar T10)

| Casilla de "Criterios de finalización" | Estado | Evidencia |
| --- | --- | --- |
| Construcción, comprobación de tipos y lint en verde | **Evidencia** | `npm run typecheck`, `npm run lint`, `npm run build`: exit 0 los tres (build "✓ built in 1.24s"), 2026-10-20 21:40. Recordatorio (e): `typecheck` no comprueba tipos (`tsconfig.json` con `"files": []`); `build` sí y está en verde |
| Orden del registro (P42) | **Evidencia, con incidente I-1** | 4.1 → 4.2 → entre 2 y 3 → 4.3 → 4.4 → 4.5 → 4.6, una sola base (`teammatchup_val008`), cada parte desde el estado de la anterior, con hora por paso. I-1: el script canceló la sesión del recorrido en 3.3 |
| Recorrido (parte 1 y paso final de CS2, parte 4) | **Evidencia; un punto no comprobado (I-1)** | 4.1 y 4.4, todos los pasos OK. Sin comprobar en la interfaz: que la desvinculación de LoL no afectó a la sesión de LoL (ya cancelada por I-1); solo revisión de código |
| Estados (parte 2) | **Evidencia** | 4.2 (y `p2a`), todos OK |
| Etiqueta de datos simulados (servidor real y modo simulado) | **Evidencia** | 4.1, 4.4, "Fuera del orden" (RF-27) y M.1, M.2, M.7 |
| Agenda (parte 3) | **Evidencia** | 4.3, 3.1 a 3.5 OK (las "FALLA" de 3.4b y 3.5b son del script, explicadas) |
| Pestaña que desaparece y eliminación de B (partes 5 y 6) | **Evidencia** | 4.5 y 4.6 OK |
| Título con tabulador (D y E) | **Evidencia** | "Fuera del orden": petición, respuesta 200, error del servidor, corrección y anotación |
| Revisión RF-17 ("Sin datos", sin "Sin rango") | **Evidencia** | 4.A (revisión de código y Node T1/T2) |
| Latencia de 40 s (RF-24) | **Evidencia** | "Entre 2 y 3", `p23a` |
| Sin colores escritos a mano (RNF-1) | **Evidencia** | 4.A |
| Servidor apagado y "Reintentar" (RF-18) | **Evidencia** | "Entre 2 y 3", `p23a` |
| Modo simulado con la cuenta demo | **Evidencia** | "Fuera del orden", `pm`/`pm2`; RF-19 simulado por revisión del mock y T3 |
| Revisión de las reglas puras (casos límite, motivos, pestaña) | **Evidencia** | 4.A: T1 40/40, T2 11/11, T3 16/16 sobre el código final (casos de 1.1–1.3) |
| Teclado y NVDA (RNF-2) | **Teclado: evidencia. NVDA: pendiente (usuario)** | "Entre 2 y 3", `p23b` (incluye el árbol de accesibilidad); pasos de NVDA en 4.8 |
| 360 px, Lighthouse en los dos temas y selector de color (RNF-5) | **Defecto abierto (D10-1, D10-2)** | 360 px OK; Lighthouse sin fallos de contraste en los dos temas; los textos de otros estados (motivos, RF-23, errores, vacíos, nota de zonas) ≥ 4,5:1. Pero la medición de todos los textos da valores por debajo de 4,5:1 (RNF-5: "todo texto de la ficha") en el tema claro (D10-1) y en el oscuro (D10-2); además C10-1 (botón deshabilitado) por decidir |

**Conclusión:** el registro de T10 está completo salvo NVDA (pendiente del usuario). Por la
decisión de la Pregunta 8 (P60) y la nota de T10, la spec 008 **no pasa a "implementada"**
mientras D10-1 y D10-2 (contraste, RNF-5) sigan abiertos.

### 4.8 Defectos, posibles cambios de spec, observaciones y pendientes

**Defectos** (ninguno se corrigió en T10):

- **D10-1 — Contraste en el tema claro (RNF-5).** Pasos: tema claro (`tmu.theme = light`),
  abrir la ficha de un jugador con cuentas (aquí B), en cualquier pestaña. Evidencia (CDP,
  4,5:1 exigido; `p23d`): título del juego en el color del juego 2,57 (LoL), 2,87 (R6), 2,97
  (CS2); rango vigente en el color del juego 2,41–2,79; sello "Sin verificar" 3,91; "▲ +0 pts
  desde la primera lectura" 4,45; resultado de partida "D" 4,14 y "V" 3,74; variación positiva
  de partida 4,28. Captura `t10-p23-claro-ficha-b-lol-1280.jpg`. Origen: componentes de la 007
  reutilizados (`AccountRow`, `RankScale`, tabla de partidas y título del panel de
  `GameSummaryPanel`, que T5 sacó del perfil sin cambiar su aspecto); el perfil da los mismos
  valores. Lighthouse no lo marca (axe deja "incompletos" los textos sobre degradados).
  Propuesta (P60): cambio aparte para toda la app (tokens del tema claro o colores de juego para
  texto), no dentro de la 008.
- **D10-2 — Contraste en el tema oscuro (RNF-5).** Pasos: tema oscuro, ficha de B en
  cualquier pestaña, "Últimas partidas". Evidencia: la línea "hace N · M min" de cada partida
  (`note note--faint`, `--ink-3` sobre el fondo de la fila) 4,22:1 por muestreo (peor caso).
  Mismo origen (tabla de partidas del perfil) y mismo valor en el perfil. Propuesta: el mismo
  cambio aparte.
- **D10-3 — Textos de la ficha fuera de `copy.ts` (regla de `tasks.md`; plan 4.6).** **Resuelto en T11 (2026-10-20; sección 5).** Ver 4.A:
  "Juegos", "Juegos del jugador", "Cruce con tu perfil" (×2), "Distancia de rango", "Horas en
  común", "en común"/"hora"/"horas", "se inscribió" en componentes de `features/players/`; y
  "Posición en la escala del juego", "Últimas partidas", "ganadas" en `GameSummaryPanel.tsx`
  (venían del perfil). Sin efecto en pantalla. Como el plan 4.6 no los enumera, se puede
  resolver moviéndolos a `copy.ts` o ajustando la regla del plan.

**Posible cambio de spec:**

- **C10-1 — Texto del botón deshabilitado.** "Proponer sesión" con `aria-disabled` (atenuado)
  queda en 1,74:1 (oscuro) y 2,61:1 (claro). WCAG 1.4.3 exime los componentes inactivos y
  Lighthouse no lo marca, pero RNF-5 dice "todo texto de la ficha". Decidir si RNF-5 exime los
  controles deshabilitados (el motivo, visible al lado, cumple: 7,36/8,11) o si es un defecto
  más.

**Observaciones** (no bloquean):

- O-1: el comentario de `features/players/hooks.ts:13` dice "las 7 consultas"; tras P63 son 6
  (el código tiene 6). **Resuelto en T11 (2026-10-20; sección 5): dice "las 6 consultas".**
- O-2: hallazgos previos ya anotados que siguen igual: (a) a 360 px `/perfil` (522 px) y
  `/coincidencias` (361 px) desbordan desde antes de la 008 (riel de `RankScale`); la ficha no,
  por `.player-panel { overflow-x: clip }`; (c) la diferencia de suavizado de 44 px en la
  captura perfil-1280 CS2 de T5; (d) si fallan las dos disponibilidades salen dos `Failure` con
  el mismo título (en T10 solo se bloqueó la propia, como pide la spec); (e) `npm run
  typecheck` no comprueba tipos.
- O-3: Lighthouse marca `aria-required-children` y `aria-required-parent` en las filas
  `role="row"` de la grilla de horas (`HoursSheet`, de la 007); no es de contraste ni de la
  ficha en sí, pero baja la puntuación a 89–91.
- O-4: "Sin Internet" no se pudo cortar; se comprobó que la interfaz solo pide a `localhost` y
  `data:`.

**Incidente:**

- I-1: ver 4.3. La sesión de LoL del recorrido la canceló el script en 3.3. Para comprobar en la
  interfaz que desvincular LoL no borra la sesión de LoL ya creada habría que repetir las partes
  1 a 4 sobre una base nueva (o hacer una comprobación aparte con otros dos jugadores).

**Pendiente para el usuario — NVDA (RNF-2):** en Windows con NVDA y Chrome, contra el servidor
real (o el modo simulado), con un jugador A que tenga LoL y R6 y sin CS2 y un jugador B con los
tres juegos (como en el recorrido):

1. Iniciar NVDA. En Chrome, entrar como A e ir a Coincidencias. Con Tab llegar al nombre de B en
   la pestaña League of Legends: NVDA debe leer "Bruno Val, enlace" (o el nombre que tenga B).
   Pulsar Enter.
2. En la ficha, con Tab llegar a las pestañas: NVDA debe anunciar la lista "Juegos del jugador"
   y "League of Legends, pestaña, seleccionada, 1 de 3".
3. Pulsar flecha derecha dos veces, flecha izquierda, Inicio y Fin: en cada paso NVDA anuncia la
   pestaña nueva como seleccionada (R6, CS2, R6, LoL, CS2) y el foco se ve.
4. Con CS2 elegida, Tab hasta "Proponer sesión": NVDA debe anunciar "Proponer sesión, botón,
   no disponible" y la descripción "Vincula tu cuenta de CS2 para proponer una sesión".
5. Para el texto de RF-23: limitar la red ("Slow 3G" en las herramientas de Chrome), recargar la
   ficha y, mientras carga, Tab hasta "Proponer sesión": NVDA debe leer "Cargando los datos para
   proponer una sesión…".
6. Ir a la Agenda, abrir una sesión con B, Tab hasta el nombre de B: NVDA lee el enlace; Enter
   abre la ficha.
7. Anotar en `validation.md` (sección 4, "Entre 2 y 3") la fecha, la versión de NVDA y de Chrome
   y lo que anunció en cada paso.

**Otros pendientes:** decidir C10-1; abrir el cambio aparte de contraste (D10-1, D10-2);
decidir D10-3; si se quiere, repetir el punto afectado por I-1. Al cerrar, actualizar
`MEMORY.md` (nota de T10 para el coordinador; T10 no lo actualiza por indicación del
coordinador). Base de validación `teammatchup_val008` en MongoDB local (se puede borrar).

### 4.9 Scripts (no versionados)

Todos en el scratchpad (`t10/b/`); se ejecutan con `node <script>.mjs` desde ese directorio,
con el servidor y Vite arrancados como en 4.0.

<details><summary><code>lib.mjs</code></summary>

```js
// Arnés de Chrome headless por CDP para la T10 (derivado de cdp.mjs de T6): varias pestañas por
// navegador, registro de red, bloqueo de URL, limitación de red, diálogos y teclado.
import { spawn } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const DEV = process.env.DEV ?? 'http://localhost:5192';
export const stamp = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).slice(0, 19);

async function connectPage(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const requests = [];
  const handlers = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      return;
    }
    for (const [m, fn] of handlers) if (m === msg.method) fn(msg.params);
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      consoleErrors.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(`exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
    } else if (msg.method === 'Network.requestWillBeSent') {
      requests.push({ t: Date.now(), method: msg.params.request.method, url: msg.params.request.url, type: msg.params.type });
    } else if (msg.method === 'Page.javascriptDialogOpening') {
      send('Page.handleJavaScriptDialog', { accept: true });
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  async function waitFor(expression, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try { if (await evaluate(`!!(${expression})`)) return true; } catch { /* navegando */ }
      await wait(100);
    }
    return false;
  }
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  async function setWidth(width, height = 900) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  }
  async function go(url) {
    await send('Page.navigate', { url });
    await waitFor(`document.readyState === 'complete'`, 120000);
  }
  async function reload() {
    await send('Page.reload', {});
    await wait(300);
    await waitFor(`document.readyState === 'complete'`, 120000);
  }
  async function back() { await evaluate('history.back(), true'); await wait(600); }
  async function forward() { await evaluate('history.forward(), true'); await wait(600); }
  async function history() {
    const { currentIndex, entries } = await send('Page.getNavigationHistory');
    return { currentIndex, urls: entries.map((e) => e.url.replace(DEV, '')) };
  }
  async function shot(file, full = true) {
    await evaluate(`(() => { for (const a of document.getAnimations()) { const t = a.effect?.getComputedTiming?.();
      if (t && t.iterations === Infinity) { a.pause(); a.currentTime = 0; } else { try { a.finish(); } catch {} } } return true; })()`);
    await wait(250);
    const { cssContentSize, cssLayoutViewport } = await send('Page.getLayoutMetrics');
    const clip = full ? { x: 0, y: 0, width: cssContentSize.width, height: Math.ceil(cssContentSize.height), scale: 1 }
      : { x: 0, y: 0, width: cssLayoutViewport.clientWidth, height: cssLayoutViewport.clientHeight, scale: 1 };
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60, captureBeyondViewport: full, clip });
    writeFileSync(file, Buffer.from(data, 'base64'));
    return path.basename(file);
  }
  async function key(k, code = k, vk = 0, modifiers = 0) {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, modifiers });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, modifiers });
    await wait(60);
  }
  const KEYS = { Tab: 9, Enter: 13, ArrowLeft: 37, ArrowRight: 39, Home: 36, End: 35, ' ': 32 };
  const press = (k, modifiers = 0) => key(k, k === ' ' ? 'Space' : k, KEYS[k] ?? 0, modifiers);
  async function type(text) { await send('Input.insertText', { text }); }
  async function fill(selector, text) {
    await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.select?.(); return true; })()`);
    await type(text);
  }
  async function login(email, password) {
    await go(`${DEV}/login`);
    await waitFor(`document.querySelector('input[type=email]')`);
    await fill('input[type=email]', email);
    await fill('input[type=password]', password);
    await evaluate(`document.querySelector('form.access button[type=submit]').click(), true`);
    await waitFor(`location.pathname !== '/login'`, 30000);
    await wait(500);
  }
  // Texto visible de la página (main), para comprobar presencia o ausencia de textos.
  const text = (sel = 'body') => evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? ''`);
  const clickText = (sel, t) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.textContent.trim().includes(${JSON.stringify(t)})); if (!el) return false; el.click(); return true; })()`);
  const url = () => evaluate('location.pathname + location.search');
  const apiRequests = (since = 0) => requests.filter((r) => r.t >= since && r.url.includes('/api/')).map((r) => `${r.method} ${r.url.replace(DEV, '')}`);
  function on(method, fn) { handlers.push([method, fn]); }
  async function block(patterns) { await send('Network.setBlockedURLs', { urls: patterns }); }
  async function throttle(latency, down = -1, up = -1) {
    await send('Network.emulateNetworkConditions', { offline: false, latency, downloadThroughput: down, uploadThroughput: up });
  }
  async function noThrottle() { await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
  async function bringToFront() { await send('Page.bringToFront'); await evaluate(`window.dispatchEvent(new Event('focus')), document.dispatchEvent(new Event('visibilitychange')), true`); }
  return { ws, send, evaluate, waitFor, setWidth, go, reload, back, forward, history, shot, key, press, type, fill, login, text, clickText, url,
    apiRequests, requests, consoleErrors, on, block, throttle, noThrottle, bringToFront };
}

export async function launch(port, profileDir, { keep = false } = {}) {
  if (!keep) rmSync(profileDir, { recursive: true, force: true });
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });
  let page;
  for (let i = 0; i < 160 && !page; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const p = list.find((t) => t.type === 'page');
      if (p) page = await connectPage(p.webSocketDebuggerUrl);
    } catch { /* arrancando */ }
    if (!page) await wait(250);
  }
  async function newTab() {
    const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    return connectPage(t.webSocketDebuggerUrl);
  }
  async function cookies() {
    const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const b = await connectPage(v.webSocketDebuggerUrl).catch(() => null);
    return b;
  }
  page.newTab = newTab;
  page.kill = () => { try { page.ws.close(); } catch {} chrome.kill(); };
  return page;
}
```

</details>

<details><summary><code>ficha.mjs</code></summary>

```js
// Lectura del estado visible de la ficha (para el registro).
export const FICHA = `(() => {
  const q = (s) => document.querySelector(s);
  const tabs = [...document.querySelectorAll('[role=tablist][aria-label="Juegos del jugador"] [role=tab]')].map((t) => (t.getAttribute('aria-selected') === 'true' ? '*' : '') + t.textContent.trim());
  const panel = q('[role=tabpanel]');
  const btn = [...document.querySelectorAll('.player-propose button')][0];
  const reasonId = btn?.getAttribute('aria-describedby');
  return {
    url: location.pathname + location.search,
    title: document.title,
    h1: q('h1')?.textContent ?? null,
    head: q('.player-head')?.innerText ?? null,
    bioText: q('.ficha__bio')?.textContent ?? null,
    bioChildren: q('.ficha__bio')?.children.length ?? null,
    tabs,
    panel: panel?.innerText ?? null,
    distance: q('.player-distance')?.innerText ?? null,
    hours: q('.player-hours')?.innerText.replace(/\\n(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)\\n[\\s\\S]*$/, '') ?? null,
    ranges: [...document.querySelectorAll('.ficha__ranges li')].map((l) => l.textContent),
    sharedCells: [...document.querySelectorAll('.player-grid .hours__cell[data-shared]')].map((c) => c.getAttribute('aria-label')),
    zonesNote: !!q('.player-hours .notice'),
    propose: btn ? { text: btn.textContent.trim(), ariaDisabled: btn.getAttribute('aria-disabled'), disabled: btn.disabled, reason: reasonId ? document.getElementById(reasonId)?.innerText : null } : null,
    busy: document.querySelectorAll('[aria-busy=true]').length,
    failures: [...document.querySelectorAll('main .blank')].map((f) => f.innerText.replace(/\\n+/g, ' / ')),
  };
})()`;
export const FORM = `(() => { const f = document.querySelector('#create-session-form'); if (!f) return null;
  const v = (id) => { const el = document.getElementById(id); if (!el) return null; return el.tagName === 'SELECT' ? el.options[el.selectedIndex]?.text + ' [' + el.value + ']' : el.value; };
  return { title: f.querySelector('input')?.value, game: v('session-game'), gameOptions: [...(document.getElementById('session-game')?.options ?? [])].map((o) => o.value), day: v('session-day'), hour: v('session-hour'), duration: v('session-duration'), slots: v('session-slots'), notes: v('session-notes') }; })()`;
```

</details>

<details><summary><code>common.mjs</code></summary>

```js
import { stamp } from './lib.mjs';
export const SH = '../shots';
export const log = (step, ok, detail) => console.log(`[${stamp()}] ${ok === null ? 'INFO ' : ok ? 'OK   ' : 'FALLA'} ${step}${detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
export const READY = `document.querySelector('[role=tabpanel]') && !document.querySelector('main [aria-busy=true]')`;
// Instantánea de qué secciones muestran su estado de carga (RF-8, RF-23).
export const SNAP = `(() => {
  const sec = [...document.querySelectorAll('main section.sheet')];
  const games = sec.find((s) => s.querySelector('h2')?.textContent.trim() === 'Juegos');
  const btn = document.querySelector('.player-propose button');
  const rid = btn?.getAttribute('aria-describedby');
  return JSON.stringify({
    page: !!document.querySelector('main .player-head') ? 'ficha' : (sec.length && sec.every((s) => s.getAttribute('aria-busy') === 'true' || s.querySelector('[aria-busy=true]')) ? 'todo-cargando' : 'otro'),
    juegos: games ? (games.querySelector(':scope > .sheet__body[aria-busy=true]') ? 'cargando' : 'listo') : (sec.length >= 2 && sec[1].getAttribute('aria-busy') === 'true' ? 'cargando' : '—'),
    panel: document.querySelector('[role=tabpanel] [aria-busy=true]') ? 'cargando' : (document.querySelector('[role=tabpanel]') ? 'listo' : '—'),
    distancia: document.querySelector('.player-distance [aria-busy=true]') ? 'cargando' : (document.querySelector('.player-distance') ? 'listo' : '—'),
    horas: document.querySelector('.player-hours [aria-busy=true]') ? 'cargando' : (document.querySelector('.player-hours') ? 'listo' : '—'),
    proponer: btn ? (btn.getAttribute('aria-disabled') === 'true' ? 'bloqueado: ' + (rid ? document.getElementById(rid)?.textContent : '') : 'habilitado') : '—',
  });
})()`;
export async function track(p, ms, every = 120) {
  const seen = []; const t0 = Date.now(); let last = '';
  while (Date.now() - t0 < ms) {
    let s; try { s = await p.evaluate(SNAP); } catch { s = 'navegando'; }
    if (s !== last) { seen.push(`+${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`); last = s; }
    await new Promise((r) => setTimeout(r, every));
  }
  return seen;
}
```

</details>

<details><summary><code>contrast.mjs</code></summary>

```js
// Contraste de cada texto visible de <main> (y de la Etiqueta en barra y pie) con CSS.getBackgroundColors,
// lo mismo que usa el selector de color de DevTools. Umbral WCAG AA: 4,5:1 (3:1 en texto grande).
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const parse = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; };
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
export async function measure(p, scope = 'main, .dock, footer') {
  await p.send('DOM.enable'); await p.send('CSS.enable');
  const n = await p.evaluate(`(() => { let i = 0; document.querySelectorAll('[data-cx]').forEach((e) => e.removeAttribute('data-cx'));
    for (const el of document.querySelectorAll(${JSON.stringify(scope.split(',').map((s) => s.trim() + ' *').join(', '))})) {
      const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      if (!own || !r.width || !r.height || s.visibility === 'hidden' || el.closest('[aria-hidden=true]')) continue;
      let op = 1; for (let a = el; a; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
      el.setAttribute('data-cx', JSON.stringify({ i: i++, text: [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join('').trim().slice(0, 60), cls: el.className?.baseVal ?? el.className, color: s.color, op }));
    } return i; })()`);
  const { root } = await p.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await p.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-cx]' });
  const rows = [];
  for (const id of nodeIds) {
    const { attributes } = await p.send('DOM.getAttributes', { nodeId: id });
    const info = JSON.parse(attributes[attributes.indexOf('data-cx') + 1]);
    const bg = await p.send('CSS.getBackgroundColors', { nodeId: id }).catch(() => ({}));
    const fg = parse(info.color);
    const size = parseFloat(bg.computedFontSize ?? '16'); const weight = Number(bg.computedFontWeight ?? 400);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (!bg.backgroundColors?.length) {
      // Fondo complejo (degradado o capas): se muestrea en una captura con el texto transparente,
      // y se toma el peor caso entre el píxel de fondo más oscuro y el más claro.
      const s = await sample(p, info.i);
      if (!s) { rows.push({ ...info, bg: 'indeterminado', ratio: null, need, pass: null }); continue; }
      const lg = large || (s.size >= 24 || (s.size >= 18.66 && s.weight >= 700)); const nd = lg ? 3 : 4.5;
      const r = Math.min(ratio(over([...fg.slice(0, 3), fg[3] * info.op], s.dark), s.dark), ratio(over([...fg.slice(0, 3), fg[3] * info.op], s.light), s.light));
      rows.push({ ...info, bg: `muestreo ${s.dark.join(',')} … ${s.light.join(',')}`, size: s.size, weight: s.weight, ratio: Math.round(r * 100) / 100, need: nd, pass: r >= nd, sampled: true });
      continue;
    }
    const rs = bg.backgroundColors.map((b) => { const bc = parse(b); const back = bc[3] < 1 ? over(bc, [0, 0, 0, 1]) : bc; return ratio(over([...fg.slice(0, 3), fg[3] * info.op], back), back); });
    const r = Math.min(...rs);
    rows.push({ ...info, bg: bg.backgroundColors.join(' | '), size, weight, ratio: Math.round(r * 100) / 100, need, pass: r >= need });
  }
  return { n, rows };
}

export async function sample(p, i) {
  const box = await p.evaluate(`(() => { const el = document.querySelector('[data-cx*=\\'"i":${i},\\']'); if (!el) return null;
    el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    el.dataset.cxPrev = el.style.color; el.style.setProperty('color', 'transparent', 'important'); el.style.setProperty('text-shadow', 'none', 'important');
    for (const c of el.querySelectorAll('*')) c.style.setProperty('visibility', 'hidden', 'important');
    return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height, size: parseFloat(s.fontSize), weight: Number(s.fontWeight) }; })()`);
  if (!box || box.w < 1) return null;
  await new Promise((r) => setTimeout(r, 80));
  const { data } = await p.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.max(1, Math.ceil(box.w)), height: Math.max(1, Math.ceil(box.h)), scale: 1 } });
  await p.evaluate(`(() => { const el = document.querySelector('[data-cx*=\\'"i":${i},\\']'); el.style.color = el.dataset.cxPrev; el.style.removeProperty('text-shadow');
    for (const c of el.querySelectorAll('*')) c.style.removeProperty('visibility'); return true; })()`);
  const px = await p.evaluate(`new Promise((res) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let lo = null, hi = null, l0 = 999, l1 = -1;
    for (let k = 0; k < d.length; k += 4) { const L = 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]; if (L < l0) { l0 = L; lo = [d[k], d[k + 1], d[k + 2], 1]; } if (L > l1) { l1 = L; hi = [d[k], d[k + 1], d[k + 2], 1]; } }
    res({ lo, hi }); }; img.src = 'data:image/png;base64,${data}'; })`);
  if (!px?.lo) return null;
  return { dark: px.lo, light: px.hi, size: box.size, weight: box.weight };
}
```

</details>

<details><summary><code>api.mjs</code></summary>

```js
// Cliente mínimo de la API real para preparar datos de la validación T10 (no versionado).
export const BASE = process.env.API ?? 'http://localhost:3001';
export const USERS = {
  A: { email: 'val008.a@example.com', username: 'Val008A', password: 'contrasena-val-a', displayName: 'Ana Val' },
  B: { email: 'val008.b@example.com', username: 'Val008B', password: 'contrasena-val-b', displayName: 'Bruno Val' },
  C: { email: 'val008.c@example.com', username: 'Val008C', password: 'contrasena-val-c', displayName: 'Carla Val' },
  D: { email: 'jugador.d.ejemplo@example.com', username: 'JugadorDEjemplo', password: 'contrasena-de-ejemplo-d', displayName: 'Jugador D' },
  E: { email: 'val008.e@example.com', username: 'Val008E', password: 'contrasena-val-e', displayName: 'Eva Val' },
};
export async function call(method, path, { body, session, raw } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session) { headers.Cookie = session.cookie; headers['X-CSRF-Token'] = session.csrf; }
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : (raw ?? JSON.stringify(body)) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, headers: res.headers };
}
export async function register(key) {
  const u = USERS[key];
  return call('POST', '/api/users', { body: { email: u.email, username: u.username, password: u.password, displayName: u.displayName } });
}
export async function login(key) {
  const u = USERS[key];
  const r = await call('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
  const cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  return { status: r.status, cookie, csrf: r.headers.get('x-csrf-token'), user: r.json };
}
```

</details>

<details><summary><code>setup.mjs</code></summary>

```js
// Preparación del registro (parte B): A, B y C por la API real, base teammatchup_val008 vacía.
import { call, register, login } from './api.mjs';
const log = (...a) => console.log(new Date().toISOString(), ...a);
const BA = 'America/Argentina/Buenos_Aires';
const plan = {
  A: { patch: { timezone: BA }, accounts: [['lol', 'jugador1#las', 'LAS'], ['r6', 'jugador3', 'LATAM']], blocks: ['1-20', '1-21', '1-22', '3-3', '0-15'] },
  B: { patch: { timezone: BA, bio: '<b>x</b>' }, accounts: [['lol', 'jugador2#las', 'LAS'], ['r6', 'jugador1', 'LATAM'], ['cs2', '76561190000000003', 'south america']], blocks: ['1-20', '1-21', '1-22', '3-3', '4-18'] },
  C: { patch: { timezone: 'America/Sao_Paulo' }, accounts: [], blocks: null },
};
for (const k of ['A', 'B', 'C']) {
  const r = await register(k); log(k, 'POST /api/users', r.status, r.json.id ?? JSON.stringify(r.json));
  const s = await login(k); log(k, 'POST /api/auth/login', s.status);
  const p = await call('PATCH', '/api/users/me', { body: plan[k].patch, session: s }); log(k, 'PATCH /api/users/me', JSON.stringify(plan[k].patch), p.status);
  for (const [gameId, handle, region] of plan[k].accounts) {
    const a = await call('POST', '/api/accounts', { body: { gameId, handle, region }, session: s });
    log(k, 'POST /api/accounts', gameId, handle, a.status, 'rango', JSON.stringify(a.json.currentRank), 'verified', a.json.verified, 'simulated', a.json.simulated);
  }
  if (plan[k].blocks) {
    const v = await call('PUT', '/api/users/me/availability', { body: { blocks: plan[k].blocks }, session: s });
    log(k, 'PUT /api/users/me/availability', JSON.stringify(plan[k].blocks), v.status, JSON.stringify(v.json));
  }
}
```

</details>

<details><summary><code>p1.mjs</code></summary>

```js
// Parte 1 del registro: recorrido sin el paso de CS2 (servidor real, base teammatchup_val008).
import { launch, wait, DEV, stamp } from './lib.mjs';
import { USERS, call, login as apiLogin } from './api.mjs';
import { FICHA, FORM } from './ficha.mjs';
const SH = '../shots';
const log = (step, ok, detail) => console.log(`[${stamp()}] ${ok === null ? 'INFO ' : ok ? 'OK   ' : 'FALLA'} ${step}${detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
const A = await launch(9511, './prof-A');
await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
const Bid = (await apiLogin('B')).user.id;
log('ids', null, { B: Bid });

// 1. Coincidencias de LoL de A: fila de B.
await A.go(`${DEV}/coincidencias`);
await A.waitFor(`document.querySelectorAll('.entry').length > 0`, 15000);
await wait(800);
const row = await A.evaluate(`(() => { const e = [...document.querySelectorAll('.entry')].find((x) => x.innerText.includes('Bruno Val')); return e ? { text: e.innerText.replace(/\\n+/g, ' | '), href: e.querySelector('.entry__who a')?.getAttribute('href') } : null; })()`);
log('1.1 B aparece en las coincidencias de LoL de A (filtros por defecto: 25 pts, 2 h)', !!row, row);
await A.shot(`${SH}/p1-coincidencias-lol.jpg`);
await A.evaluate(`[...document.querySelectorAll('.entry__who a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
await A.waitFor(`document.querySelector('[role=tabpanel]') && !document.querySelector('[role=tabpanel] [aria-busy=true]') && document.querySelector('.player-distance strong')`, 15000);
await wait(1200);
let f = await A.evaluate(FICHA);
log('1.2 abre la ficha en la pestaña LoL (RF-2, RF-20)', f.url === `/jugadores/${Bid}?juego=lol` && f.tabs[0] === '*League of Legends', { url: f.url, tabs: f.tabs, title: f.title });
const body = await A.text('main');
log('1.3 sin correo de B; biografía literal (RF-3, RNF-3)', !body.includes(USERS.B.email) && !body.includes('@example.com') && f.bioText === '<b>x</b>' && f.bioChildren === 0, { head: f.head, bioText: f.bioText, bioChildren: f.bioChildren });
log('1.4 pestañas en orden LoL, R6, CS2', JSON.stringify(f.tabs.map((t) => t.replace('*', ''))) === JSON.stringify(['League of Legends', 'Rainbow Six Siege', 'Counter-Strike 2']), f.tabs);
log('1.5 panel LoL (RF-4, RF-16, RF-27)', /Riot ID/.test(f.panel) && /jugador2#las/i.test(f.panel) && /Platinum I/.test(f.panel) && /Iron/.test(f.panel) && /Challenger/.test(f.panel) && /▲ \+0 pts desde la primera lectura/.test(f.panel) && /Sin verificar/.test(f.panel) && /Datos de demostración/.test(f.panel) && !/Fuente/.test(f.panel), f.panel);
log('1.6 cruce LoL: distancia, 4 horas, tramos, grilla, sin nota de zonas (RF-6, RF-22, RF-27)', /Δ 10 pts/.test(f.distance) && /Datos de demostración/.test(f.distance) && /4 horas en común/.test(f.hours) && JSON.stringify(f.ranges) === JSON.stringify(['Mar 20:00–23:00', 'Jue 03:00–04:00']) && f.sharedCells.every((c) => c.startsWith('Martes')) && f.sharedCells.length === 3 && !f.zonesNote, { distance: f.distance, hours: f.hours, ranges: f.ranges, sharedCells: f.sharedCells, zonesNote: f.zonesNote, propose: f.propose });
await A.shot(`${SH}/p1-ficha-b-lol-1280.jpg`);

// R6 sin recargar.
const before = Date.now();
await A.clickText('[role=tab]', 'Rainbow Six Siege');
await A.waitFor(`/Ubisoft ID/.test(document.querySelector('[role=tabpanel]')?.innerText) && /Δ/.test(document.querySelector('.player-distance')?.innerText)`, 15000);
await wait(1200);
f = await A.evaluate(FICHA);
log('1.7 R6 sin recargar (RF-4, RF-5, RF-6, RF-16, RF-27)', f.url.endsWith('?juego=r6') && /Ubisoft ID/.test(f.panel) && /jugador1/.test(f.panel) && /Emerald II/.test(f.panel) && /Copper/.test(f.panel) && /Champion/.test(f.panel) && /MMR/.test(f.panel) && /ganadas/.test(f.panel) && /Datos de demostración/.test(f.panel) && /Δ 14 pts/.test(f.distance) && /Datos de demostración/.test(f.distance), { url: f.url, panel: f.panel, distance: f.distance, requests: A.apiRequests(before) });
await A.shot(`${SH}/p1-ficha-b-r6-1280.jpg`);
await A.reload();
await A.waitFor(`/Ubisoft ID/.test(document.querySelector('[role=tabpanel]')?.innerText ?? '')`, 15000);
await wait(800);
f = await A.evaluate(FICHA);
log('1.8 recargar con R6 mantiene R6 (RF-5)', f.url.endsWith('?juego=r6') && f.tabs[1] === '*Rainbow Six Siege', { url: f.url, tabs: f.tabs });

// CS2.
await A.clickText('[role=tab]', 'Counter-Strike 2');
await A.waitFor(`/SteamID64/.test(document.querySelector('[role=tabpanel]')?.innerText ?? '') && /Vincula/.test(document.querySelector('.player-distance')?.innerText ?? '')`, 15000);
await wait(1200);
f = await A.evaluate(FICHA);
const all = await A.text('main');
log('1.9 CS2: rango, escala Grey a Gold, partidas con la etiqueta, sin "Fuente" ni FACEIT/Steam/Valve (RF-16)', /Gold/.test(f.panel) && /Grey/.test(f.panel) && /Datos de demostración/.test(f.panel) && !/Fuente/.test(all) && !/FACEIT|Steam(?!ID64)|Valve|Leetify|Riot(?! ID)|Ubisoft(?! ID)/.test(all) && /Verificada/.test(f.panel), f.panel);
log('1.10 CS2: RF-13 y motivo 2 (RF-12, RF-13)', f.distance.includes('Vincula tu cuenta de CS2 para ver la distancia de rango') && f.propose.ariaDisabled === 'true' && f.propose.reason === 'Vincula tu cuenta de CS2 para proponer una sesión', { distance: f.distance, propose: f.propose });
await A.shot(`${SH}/p1-ficha-b-cs2-1280.jpg`);

// LoL y "Proponer sesión".
await A.clickText('[role=tab]', 'League of Legends');
await A.waitFor(`/Riot ID/.test(document.querySelector('[role=tabpanel]')?.innerText ?? '') && document.querySelector('.player-propose button')?.getAttribute('aria-disabled') !== 'true'`, 15000);
await wait(800);
log('historial antes de proponer', null, await A.history());
await A.clickText('.player-propose button', 'Proponer sesión');
await A.waitFor(`document.querySelector('#create-session-form')`, 15000);
await wait(1200);
const form = await A.evaluate(FORM);
log('1.11 "Proponer sesión" abre el formulario (RF-7)', form && form.title === 'Sesión con Bruno Val' && /lol/.test(form.game) && /\[1\]/.test(form.day) && /\[20\]/.test(form.hour) && /\[3\]/.test(form.duration) && /5/.test(form.slots) && form.notes === '', { url: await A.url(), form });
await A.shot(`${SH}/p1-agenda-form-1280.jpg`);
await A.evaluate(`document.querySelector('button[form=create-session-form]').click(), true`);
await A.waitFor(`!document.querySelector('#create-session-form') || document.querySelector('.session')`, 15000);
await wait(1200);
const sessions = (await call('GET', '/api/sessions?game=all', { session: await apiLogin('A') })).json;
log('1.12 A anota la sesión', sessions.length === 1, sessions.map((s) => ({ id: s.id, title: s.title, gameId: s.gameId, day: s.day, startHour: s.startHour, duration: s.durationHours ?? s.duration, maxPlayers: s.maxPlayers ?? s.slots })));
log('historial tras anotar', null, await A.history());
await A.back();
await A.waitFor(`document.querySelector('[role=tabpanel]')`, 15000);
await wait(1000);
f = await A.evaluate(FICHA);
log('1.13 "Atrás" desde la agenda → ficha en LoL (RF-5)', f.url === `/jugadores/${Bid}?juego=lol` && f.tabs[0] === '*League of Legends', { url: f.url, tabs: f.tabs });
await A.back();
await wait(1000);
log('1.14 segundo "Atrás" → coincidencias, sin pasar por CS2 ni R6 (RF-5, P13)', (await A.url()).startsWith('/coincidencias'), { url: await A.url(), history: await A.history() });

// B se suma (con su sesión, en otro cliente: equivale a otro navegador).
const sB = await apiLogin('B');
const join = await call('POST', `/api/sessions/${sessions[0].id}/join`, { session: sB });
log('1.15 B se suma a la sesión (POST /api/sessions/:id/join con la sesión de B)', join.status === 200, { status: join.status, participants: join.json.participants?.map((p) => p.displayName) });

// A abre la ficha de B desde la agenda y su propia ficha desde la misma sesión.
await A.go(`${DEV}/agenda`);
await A.waitFor(`document.querySelectorAll('.week__session').length > 0`, 15000);
await A.evaluate(`document.querySelector('.week__session').click(), true`);
await A.waitFor(`document.querySelectorAll('.session__signatures a').length >= 2`, 8000);
const links = await A.evaluate(`[...document.querySelectorAll('.session__signatures a')].map((a) => [a.textContent, a.getAttribute('href')])`);
log('1.16 la sesión muestra un enlace por participante (RF-2)', links.length === 2, links);
await A.shot(`${SH}/p1-agenda-sesion-1280.jpg`);
await A.evaluate(`[...document.querySelectorAll('.session__signatures a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
await A.waitFor(`document.querySelector('[role=tabpanel]')`, 15000);
await wait(800);
f = await A.evaluate(FICHA);
log('1.17 desde la agenda se abre la ficha de B en LoL (RF-2)', f.url === `/jugadores/${Bid}?juego=lol` && f.h1 === 'Bruno Val', { url: f.url, h1: f.h1 });
await A.back();
await A.waitFor(`location.pathname === '/agenda'`, 8000);
await wait(600);
if (!(await A.evaluate(`document.querySelectorAll('.session__signatures a').length`))) {
  await A.evaluate(`document.querySelector('.week__session').click(), true`);
  await A.waitFor(`document.querySelectorAll('.session__signatures a').length >= 2`, 8000);
}
await A.evaluate(`[...document.querySelectorAll('.session__signatures a')].find((a) => a.textContent === 'Ana Val').click(), true`);
await A.waitFor(`location.pathname === '/perfil'`, 8000);
await wait(600);
const h = await A.history();
log('1.18 la propia ficha desde la sesión lleva al perfil (RF-15)', (await A.url()) === '/perfil' && !h.urls.some((u) => u.includes('/jugadores/' + 'x')), h);
await A.back();
await wait(800);
log('1.19 "Atrás" desde el perfil vuelve a la agenda (RF-15)', (await A.url()).startsWith('/agenda'), await A.url());
const errs = A.consoleErrors.filter((e) => !e.includes('React Router Future Flag'));
log('consola sin errores (filtrados los avisos Future Flag)', errs.length === 0, errs);
A.kill();
```

</details>

<details><summary><code>p1b.mjs</code></summary>

```js
// Parte 1 del registro: recorrido sin el paso de CS2 (servidor real, base teammatchup_val008).
import { launch, wait, DEV, stamp } from './lib.mjs';
import { USERS, call, login as apiLogin } from './api.mjs';
import { FICHA, FORM } from './ficha.mjs';
const SH = '../shots';
const log = (step, ok, detail) => console.log(`[${stamp()}] ${ok === null ? 'INFO ' : ok ? 'OK   ' : 'FALLA'} ${step}${detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
const A = await launch(9511, './prof-A');
await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
const Bid = (await apiLogin('B')).user.id;
log('ids', null, { B: Bid });

// 1. Coincidencias de LoL de A: fila de B.
await A.go(`${DEV}/coincidencias`);
await A.waitFor(`document.querySelectorAll('.entry').length > 0`, 15000);
await wait(800);
const row = await A.evaluate(`(() => { const e = [...document.querySelectorAll('.entry')].find((x) => x.innerText.includes('Bruno Val')); return e ? { text: e.innerText.replace(/\\n+/g, ' | '), href: e.querySelector('.entry__who a')?.getAttribute('href') } : null; })()`);
log('1.1 B aparece en las coincidencias de LoL de A (filtros por defecto: 25 pts, 2 h)', !!row, row);
await A.shot(`${SH}/p1b-coincidencias-lol.jpg`);
await A.evaluate(`[...document.querySelectorAll('.entry__who a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
await A.waitFor(`document.querySelector('[role=tabpanel]') && !document.querySelector('[role=tabpanel] [aria-busy=true]') && document.querySelector('.player-distance strong')`, 15000);
await wait(1200);
let f = await A.evaluate(FICHA);
log('1.2 abre la ficha en la pestaña LoL (RF-2, RF-20)', f.url === `/jugadores/${Bid}?juego=lol` && f.tabs[0] === '*League of Legends', { url: f.url, tabs: f.tabs, title: f.title });
const body = await A.text('main');
log('1.3 sin correo de B; biografía literal (RF-3, RNF-3)', !body.includes(USERS.B.email) && !body.includes('@example.com') && f.bioText === '<b>x</b>' && f.bioChildren === 0, { head: f.head, bioText: f.bioText, bioChildren: f.bioChildren });
log('1.4 pestañas en orden LoL, R6, CS2', JSON.stringify(f.tabs.map((t) => t.replace('*', ''))) === JSON.stringify(['League of Legends', 'Rainbow Six Siege', 'Counter-Strike 2']), f.tabs);
log('1.5 panel LoL (RF-4, RF-16, RF-27)', /Riot ID/.test(f.panel) && /jugador2#las/i.test(f.panel) && /Platinum I/.test(f.panel) && /Iron/i.test(f.panel) && /Challenger/i.test(f.panel) && /▲ \+0 pts desde la primera lectura/.test(f.panel) && /Sin verificar/i.test(f.panel) && /Datos de demostración/.test(f.panel) && !/Fuente/.test(f.panel), f.panel);
log('1.6 cruce LoL: distancia, 4 horas, tramos, grilla, sin nota de zonas (RF-6, RF-22, RF-27)', /Δ 10 pts/.test(f.distance) && /Datos de demostración/.test(f.distance) && /4 horas\s+en común/.test(f.hours) && JSON.stringify(f.ranges) === JSON.stringify(['Mar 20:00–23:00', 'Jue 03:00–04:00']) && f.sharedCells.every((c) => c.startsWith('Martes')) && f.sharedCells.length === 3 && !f.zonesNote, { distance: f.distance, hours: f.hours, ranges: f.ranges, sharedCells: f.sharedCells, zonesNote: f.zonesNote, propose: f.propose });
await A.shot(`${SH}/p1-ficha-b-lol-1280.jpg`);

// R6 sin recargar.
const before = Date.now();
await A.clickText('[role=tab]', 'Rainbow Six Siege');
await A.waitFor(`/Ubisoft ID/.test(document.querySelector('[role=tabpanel]')?.innerText) && /Δ/.test(document.querySelector('.player-distance')?.innerText)`, 15000);
await wait(1200);
f = await A.evaluate(FICHA);
log('1.7 R6 sin recargar (RF-4, RF-5, RF-6, RF-16, RF-27)', f.url.endsWith('?juego=r6') && /Ubisoft ID/.test(f.panel) && /jugador1/.test(f.panel) && /Emerald II/.test(f.panel) && /Copper/i.test(f.panel) && /Champion/i.test(f.panel) && /MMR/.test(f.panel) && /ganadas/.test(f.panel) && /Datos de demostración/.test(f.panel) && /Δ 14 pts/.test(f.distance) && /Datos de demostración/.test(f.distance), { url: f.url, panel: f.panel, distance: f.distance, requests: A.apiRequests(before) });
await A.shot(`${SH}/p1-ficha-b-r6-1280.jpg`);
await A.reload();
await A.waitFor(`/Ubisoft ID/.test(document.querySelector('[role=tabpanel]')?.innerText ?? '')`, 15000);
await wait(800);
f = await A.evaluate(FICHA);
log('1.8 recargar con R6 mantiene R6 (RF-5)', f.url.endsWith('?juego=r6') && f.tabs[1] === '*Rainbow Six Siege', { url: f.url, tabs: f.tabs });

// CS2.
await A.clickText('[role=tab]', 'Counter-Strike 2');
await A.waitFor(`/SteamID64/.test(document.querySelector('[role=tabpanel]')?.innerText ?? '') && /Vincula/.test(document.querySelector('.player-distance')?.innerText ?? '')`, 15000);
await wait(1200);
f = await A.evaluate(FICHA);
const all = await A.text('main');
log('1.9 CS2: rango, escala Grey a Gold, partidas con la etiqueta, sin "Fuente" ni FACEIT/Steam/Valve (RF-16)', /Gold/.test(f.panel) && /Grey/i.test(f.panel) && /Datos de demostración/.test(f.panel) && !/Fuente/.test(all) && !/FACEIT|Steam(?!ID64)|Valve|Leetify|Riot(?! ID)|Ubisoft(?! ID)/.test(all) && /Verificada/i.test(f.panel), f.panel);
log('1.10 CS2: RF-13 y motivo 2 (RF-12, RF-13)', f.distance.includes('Vincula tu cuenta de CS2 para ver la distancia de rango') && f.propose.ariaDisabled === 'true' && f.propose.reason === 'Vincula tu cuenta de CS2 para proponer una sesión', { distance: f.distance, propose: f.propose });
await A.shot(`${SH}/p1-ficha-b-cs2-1280.jpg`);

const errs = A.consoleErrors.filter((e) => !e.includes('React Router Future Flag'));
log('consola sin errores (filtrados los avisos Future Flag)', errs.length === 0, errs);
A.kill();
```

</details>

<details><summary><code>p2.mjs</code></summary>

```js
// Parte 2 del registro: Estados (A con LoL y R6, sin CS2).
import { launch, wait, DEV } from './lib.mjs';
import { USERS, call, login as apiLogin } from './api.mjs';
import { FICHA } from './ficha.mjs';
import { SH, log, READY, track } from './common.mjs';
const sA = await apiLogin('A'); const sB = await apiLogin('B'); const sC = await apiLogin('C');
const Aid = sA.user.id, Bid = sB.user.id, Cid = sC.user.id;
const FB = (g = '') => `${DEV}/jugadores/${Bid}${g ? '?juego=' + g : ''}`;
const A = await launch(9521, './prof-A2');
await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);

// 2.1 "3G lenta" (preajuste de DevTools: 2000 ms de latencia, ~50 KB/s).
await A.go(FB('lol')); await A.waitFor(READY, 20000);            // carga del módulo de la ficha sin limitar
await A.go(`${DEV}/coincidencias`); await A.waitFor(`document.querySelector('.entry__who a')`, 15000);
await A.throttle(2000, 50000, 50000);
await A.evaluate(`[...document.querySelectorAll('.entry__who a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
let seq = await track(A, 9000);
log('2.1a 3G lenta, abrir la ficha de B: estados de carga por sección (RF-8, RF-23)', null, seq);
await A.waitFor(READY, 30000);
await A.shot(`${SH}/p2-3g-lista-1280.jpg`, false);
await A.clickText('[role=tab]', 'Rainbow Six Siege');
seq = await track(A, 6000);
log('2.1b 3G lenta, cambiar a R6: solo el panel del juego y la distancia cargan (RF-8)', null, seq);
await A.noThrottle();

// 2.2 Bloqueo solo de la disponibilidad de A.
await A.block(['*/api/users/me/availability*']);
await A.go(FB('lol')); await A.waitFor(`document.querySelector('.player-hours .blank')`, 20000); await wait(600);
let f = await A.evaluate(FICHA);
const hoursFail = await A.evaluate(`document.querySelector('.player-hours .blank')?.innerText`);
log('2.2 bloqueada GET /api/users/me/availability: error con "Reintentar" en horas y RF-23 en Proponer (RF-8, RF-18, RF-23)', /Reintentar/.test(hoursFail) && f.propose.reason === 'No se pudieron cargar los datos para proponer una sesión.', { horas: hoursFail, proponer: f.propose, distancia: f.distance });
await A.shot(`${SH}/p2-bloqueo-horas-1280.jpg`);

// 2.3 Bloqueo solo de las cuentas propias de A.
await A.block(['*/api/accounts?user=me*']);
const t0 = Date.now();
await A.go(FB('lol')); await A.waitFor(`document.querySelector('.player-distance .blank')`, 20000); await wait(600);
f = await A.evaluate(FICHA);
const distFail = await A.evaluate(`document.querySelector('.player-distance .blank')?.innerText`);
const reqs = A.requests.filter((r) => r.t >= t0 && r.url.includes('/api/accounts')).map((r) => r.url.replace(DEV, ''));
log('2.3a bloqueada GET /api/accounts?user=me (no la de B): error con "Reintentar" en la distancia y RF-23 (RF-8, RF-18, RF-23; P19)', /Reintentar/.test(distFail) && f.propose.reason === 'No se pudieron cargar los datos para proponer una sesión.' && f.tabs.length === 3, { distancia: distFail, proponer: f.propose, pestañas: f.tabs, peticionesDeCuentas: reqs });
await A.shot(`${SH}/p2-bloqueo-cuentas-1280.jpg`);
await A.block([]);
await A.evaluate(`[...document.querySelectorAll('.player-distance button')].find((b) => b.textContent.includes('Reintentar')).click(), true`);
await A.waitFor(`/Δ/.test(document.querySelector('.player-distance')?.innerText ?? '')`, 15000); await wait(600);
f = await A.evaluate(FICHA);
log('2.3b desbloquear y "Reintentar": se ve la distancia', /Δ 10 pts/.test(f.distance), { distancia: f.distance, proponer: f.propose });

// 2.4 Ficha de C.
await A.go(`${DEV}/jugadores/${Cid}`); await A.waitFor(`document.querySelector('.player-head') && !document.querySelector('main [aria-busy=true]')`, 15000); await wait(800);
f = await A.evaluate(FICHA);
const main = await A.text('main');
log('2.4 ficha de C (RF-10, RF-12, RF-22; RF-6, P59)', f.tabs.length === 0 && main.includes('Este jugador no ha vinculado ningún juego') && /0 horas\s+en común/.test(f.hours) && f.hours.includes('Sin horas en común esta semana.') && f.zonesNote && f.distance === null && f.propose.ariaDisabled === 'true' && f.propose.reason === 'Este jugador no ha vinculado ningún juego', { url: f.url, juegos: main.split('Cruce con tu perfil')[0].split('Juegos')[1]?.trim(), horas: f.hours, nota: await A.evaluate(`document.querySelector('.player-hours .notice')?.textContent`), distancia: f.distance, proponer: f.propose });
await A.shot(`${SH}/p2-ficha-c-1280.jpg`);

// 2.5 Identificadores que no existen.
for (const raw of ['ffffffffffffffffffffffff', 'abc', 'ME']) {
  await A.go(`${DEV}/jugadores/${raw}`); await A.waitFor(`document.querySelector('main .blank') && !document.querySelector('main [aria-busy=true]')`, 15000); await wait(400);
  const t = await A.text('main');
  log(`2.5 /jugadores/${raw} → "Este jugador no existe" (RF-9, RF-15; P43)`, t.includes('Este jugador no existe') && t.includes('Ir a coincidencias'), t.replace(/\n+/g, ' / '));
}
await A.shot(`${SH}/p2-no-existe-1280.jpg`);
// 2.6 Referencia propia.
for (const raw of ['me', Aid.toUpperCase()]) {
  await A.go(`${DEV}/inicio`); await wait(500);
  await A.go(`${DEV}/jugadores/${raw}`); await A.waitFor(`location.pathname === '/perfil'`, 10000); await wait(500);
  const h = await A.history();
  log(`2.6 /jugadores/${raw} → perfil (RF-15; P35, P43)`, (await A.url()) === '/perfil' && !h.urls.some((u) => u.includes('/jugadores/')), h.urls.slice(-3));
}

// 2.7 Sesión cerrada: R6 en la dirección → login → ficha en LoL.
await A.evaluate(`document.querySelector('.dock__icon-btn[title="Cerrar sesión"]').click(), true`);
await A.waitFor(`location.pathname === '/login'`, 10000); await wait(500);
await A.go(FB('r6')); await A.waitFor(`location.pathname === '/login'`, 10000); await wait(500);
log('2.7a sesión cerrada + /jugadores/B?juego=r6 → login (RF-1)', (await A.url()).startsWith('/login'), await A.url());
await A.fill('input[type=email]', USERS.A.email); await A.fill('input[type=password]', USERS.A.password);
await A.evaluate(`document.querySelector('form.access button[type=submit]').click(), true`);
await A.waitFor(READY, 15000); await wait(800);
f = await A.evaluate(FICHA);
log('2.7b al entrar vuelve a la ficha en LoL (RF-1, RF-20)', f.url === `/jugadores/${Bid}?juego=lol` && f.tabs[0].startsWith('*'), { url: f.url, tabs: f.tabs });

// 2.8 Cookie borrada y pestaña R6 no vista desde la recarga.
await A.reload(); await A.waitFor(READY, 15000); await wait(600);
const ck = (await A.send('Network.getCookies', { urls: [DEV] })).cookies.map((c) => c.name);
await A.send('Network.deleteCookies', { name: 'token', url: DEV });
const ck2 = (await A.send('Network.getCookies', { urls: [DEV] })).cookies.map((c) => c.name);
const t1 = Date.now();
await A.clickText('[role=tab]', 'Rainbow Six Siege');
await A.waitFor(`location.pathname === '/login'`, 10000); await wait(600);
const notice = await A.evaluate(`document.querySelector('.notice')?.textContent ?? null`);
log('2.8a cookie "token" borrada + elegir R6 → login con el aviso (RF-1; 007 RF-7; P44)', (await A.url()).startsWith('/login') && notice === 'Tu sesión expiró. Vuelve a entrar.', { cookiesAntes: ck, cookiesDespués: ck2, peticiones: A.apiRequests(t1), url: await A.url(), aviso: notice });
await A.shot(`${SH}/p2-cookie-login-1280.jpg`, false);
await A.fill('input[type=email]', USERS.A.email); await A.fill('input[type=password]', USERS.A.password);
await A.evaluate(`document.querySelector('form.access button[type=submit]').click(), true`);
await A.waitFor(READY, 15000); await wait(800);
f = await A.evaluate(FICHA);
log('2.8b al entrar vuelve a la ficha en LoL (RF-1, RF-20)', f.url === `/jugadores/${Bid}?juego=lol`, { url: f.url, tabs: f.tabs });

// 2.9 Otra pestaña del mismo navegador cierra sesión.
await A.go(FB('r6')); await A.waitFor(READY, 15000); await wait(500);
const T2 = await A.newTab(); await T2.setWidth(1280);
await T2.go(`${DEV}/inicio`); await T2.waitFor(`document.querySelector('.dock__icon-btn[title="Cerrar sesión"]')`, 15000);
await T2.evaluate(`document.querySelector('.dock__icon-btn[title="Cerrar sesión"]').click(), true`);
const tLogout = Date.now();
await A.waitFor(`location.pathname === '/login'`, 10000);
const dt = Date.now() - tLogout;
await wait(300);
const n2 = await A.evaluate(`document.querySelector('.notice')?.textContent ?? null`);
log('2.9a cerrar sesión en otra pestaña lleva la ficha (R6) a login en < 5 s con el aviso (RF-1; 007 RF-24)', (await A.url()).startsWith('/login') && dt < 5000 && n2 === 'Se cerró o cambió la sesión en otra pestaña.', { ms: dt, url: await A.url(), aviso: n2 });
await A.fill('input[type=email]', USERS.A.email); await A.fill('input[type=password]', USERS.A.password);
await A.evaluate(`document.querySelector('form.access button[type=submit]').click(), true`);
await A.waitFor(READY, 15000); await wait(800);
f = await A.evaluate(FICHA);
log('2.9b al entrar vuelve a la ficha en LoL (RF-1, RF-20)', f.url === `/jugadores/${Bid}?juego=lol`, { url: f.url, tabs: f.tabs });
T2.ws.close();

// 2.10 Juego inventado en la dirección.
await A.go(`${DEV}/coincidencias`); await wait(800);
await A.go(FB('xyz')); await A.waitFor(READY, 15000); await wait(600);
f = await A.evaluate(FICHA);
const h10 = await A.history();
await A.back(); await wait(800);
log('2.10 ?juego=xyz → pestaña LoL, dirección corregida; "Atrás" → página anterior (RF-20, P14)', f.url === `/jugadores/${Bid}?juego=lol` && f.tabs[0].startsWith('*') && (await A.url()) === '/coincidencias', { ficha: f.url, historial: h10.urls.slice(-2), trasAtrás: await A.url() });

// 2.11 B abre la ficha de A con CS2 (A no tiene CS2).
const B = await launch(9522, './prof-B2'); await B.setWidth(1280);
await B.login(USERS.B.email, USERS.B.password);
await B.go(`${DEV}/agenda`); await wait(800);
await B.go(`${DEV}/jugadores/${Aid}?juego=cs2`); await B.waitFor(READY, 15000); await wait(600);
const fb = await B.evaluate(FICHA);
const h11 = await B.history();
await B.back(); await wait(800);
log('2.11 B: /jugadores/A?juego=cs2 → pestaña LoL, dirección corregida; "Atrás" → página anterior (RF-20, P14)', fb.url === `/jugadores/${Aid}?juego=lol` && fb.tabs.length === 2 && fb.tabs[0].startsWith('*') && (await B.url()) === '/agenda', { ficha: fb.url, pestañas: fb.tabs, historial: h11.urls.slice(-2), trasAtrás: await B.url() });
B.kill();

// 2.12 Motivos de disponibilidad, recargando la ficha de B en LoL tras cada cambio (RF-26).
const put = async (s, blocks) => (await call('PUT', '/api/users/me/availability', { body: { blocks }, session: s })).status;
const reasonAfterReload = async () => { await A.go(FB('lol')); await A.waitFor(READY, 15000); await wait(600); return A.evaluate(FICHA); };
log('2.12a B borra su disponibilidad', null, `PUT [] → ${await put(sB, [])}`);
f = await reasonAfterReload();
log('2.12a motivo "Este jugador no ha marcado horas" (RF-12)', f.propose.reason === 'Este jugador no ha marcado horas', f.propose);
log('2.12b B vuelve a guardar la del recorrido; A borra la suya', null, `B PUT → ${await put(sB, ['1-20', '1-21', '1-22', '3-3', '4-18'])}; A PUT [] → ${await put(sA, [])}`);
f = await reasonAfterReload();
log('2.12b motivo "No has marcado tus horas" (RF-12)', f.propose.reason === 'No has marcado tus horas', f.propose);
log('2.12c A guarda solo el jueves 03:00', null, `PUT ["3-3"] → ${await put(sA, ['3-3'])}`);
f = await reasonAfterReload();
log('2.12c motivo "Sus horas en común quedan fuera del horario de la agenda (12:00 a 01:00)" (RF-12)', f.propose.reason === 'Sus horas en común quedan fuera del horario de la agenda (12:00 a 01:00)' && JSON.stringify(f.ranges) === '["Jue 03:00–04:00"]', { proponer: f.propose, tramos: f.ranges });
await A.shot(`${SH}/p2-motivo-fuera-agenda-1280.jpg`);
log('2.12d A vuelve a guardar la del recorrido', null, `PUT → ${await put(sA, ['1-20', '1-21', '1-22', '3-3', '0-15'])}`);
f = await reasonAfterReload();
log('2.12d tramos "Mar 20:00–23:00" y "Jue 03:00–04:00" y "Proponer sesión" habilitado (P42)', JSON.stringify(f.ranges) === '["Mar 20:00–23:00","Jue 03:00–04:00"]' && f.propose.ariaDisabled === null, { tramos: f.ranges, proponer: f.propose });
const errs = A.consoleErrors.filter((e) => !e.includes('React Router Future Flag'));
log('consola (filtrados los avisos Future Flag)', null, errs);
A.kill();
```

</details>

<details><summary><code>p2a.mjs</code></summary>

```js
// Parte 2, repetición del punto 2.1a (3G lenta al abrir la ficha) y del 2.6 (referencia propia).
import { launch, wait, DEV } from './lib.mjs';
import { USERS, login as apiLogin } from './api.mjs';
import { SH, log, READY, SNAP } from './common.mjs';
const sA = await apiLogin('A'); const sB = await apiLogin('B');
const Aid = sA.user.id, Bid = sB.user.id;
const A = await launch(9523, './prof-A2a');
await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
await A.go(`${DEV}/jugadores/${Bid}?juego=lol`); await A.waitFor(READY, 20000);
await A.go(`${DEV}/coincidencias`); await A.waitFor(`document.querySelector('.entry__who a')`, 15000); await wait(500);
await A.throttle(2000, 50000, 50000);
const t0 = Date.now();
await A.evaluate(`[...document.querySelectorAll('.entry__who a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
const seen = []; let last = ''; let shots = 0;
while (Date.now() - t0 < 20000) {
  let s; try { s = (await A.evaluate('location.pathname')) + ' ' + (await A.evaluate(SNAP)); } catch { s = 'navegando'; }
  if (s !== last) { seen.push(`+${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`); last = s;
    if (s.includes('/jugadores/') && shots < 3) { await A.shot(`${SH}/p2-3g-carga-${++shots}-1280.jpg`, false); } }
  if (s.includes('"proponer":"habilitado"')) break;
  await wait(100);
}
log('2.1a (repetido) 3G lenta, abrir la ficha de B desde coincidencias: estados por sección (RF-8, RF-23)', null, seen);
log('peticiones', null, A.apiRequests(t0));
await A.noThrottle();
for (const raw of ['me', Aid.toUpperCase()]) {
  await A.go(`${DEV}/inicio`); await wait(500);
  const before = (await A.history()).currentIndex;
  await A.go(`${DEV}/jugadores/${raw}`); await A.waitFor(`location.pathname === '/perfil'`, 10000); await wait(500);
  const h = await A.history();
  const after = h.urls.slice(before);
  await A.back(); await wait(600);
  log(`2.6 /jugadores/${raw} → perfil, sin entrada de la ficha en el historial; "Atrás" → /inicio (RF-15; P35, P43)`, after.join() === '/inicio,/perfil' && (await A.url()) === '/inicio', { historialDesdeInicio: after, trasAtrás: await A.url() });
}
A.kill();
```

</details>

<details><summary><code>p23a.mjs</code></summary>

```js
// Entre las partes 2 y 3: latencia de 40 s (RF-24) y servidor apagado + "Reintentar" (RF-18).
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, openSync } from 'node:fs';
import { launch, wait, DEV } from './lib.mjs';
import { USERS, login as apiLogin } from './api.mjs';
import { FICHA } from './ficha.mjs';
import { SH, log, READY, SNAP } from './common.mjs';
const Bid = (await apiLogin('B')).user.id;
const A = await launch(9531, './prof-A3');
await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
// Módulo de la ficha cargado en el documento (navegación interna), para que la latencia afecte solo a /api.
await A.go(`${DEV}/coincidencias`); await A.waitFor(`document.querySelector('.entry__who a')`, 15000);
await A.evaluate(`[...document.querySelectorAll('.entry__who a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
await A.waitFor(READY, 15000); await wait(500);
await A.evaluate(`document.querySelector('a[href="/coincidencias"]').click(), true`);
await A.waitFor(`document.querySelector('.entry__who a')`, 15000); await wait(500);

// RF-24: latencia personalizada de 40 000 ms.
await A.throttle(40000);
const t0 = Date.now();
await A.evaluate(`[...document.querySelectorAll('.entry__who a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
const seen = []; let last = '';
while (Date.now() - t0 < 36000) {
  const s = (await A.evaluate('location.pathname')) + ' ' + (await A.evaluate(SNAP)) + ' ' + (await A.evaluate(`[...document.querySelectorAll('main .blank')].map((b) => b.innerText.replace(/\\n+/g, ' / ')).join(' | ')`));
  if (s !== last) { seen.push(`+${((Date.now() - t0) / 1000).toFixed(1)}s ${s}`); last = s; if (seen.length === 2) await A.shot(`${SH}/p23-latencia-carga-1280.jpg`, false); }
  await wait(250);
}
log('RF-24 latencia de 40 s al abrir la ficha de B: estados en el tiempo', null, seen);
const t = await A.text('main');
log('RF-24 a los 30 s: "No se pudo conectar con el servidor. Inténtalo de nuevo." con "Reintentar", sin login', t.includes('No se pudo conectar con el servidor. Inténtalo de nuevo.') && t.includes('Reintentar') && (await A.url()).startsWith('/jugadores/'), { url: await A.url(), main: t.replace(/\n+/g, ' / ') });
await A.shot(`${SH}/p23-latencia-30s-1280.jpg`, false);
await A.noThrottle();
await wait(6000); // la respuesta tardía (40 s) llega y se descarta (007 RF-20)
log('RF-24 respuesta tardía descartada: la ficha sigue en el error tras los 40 s', (await A.text('main')).includes('No se pudo conectar con el servidor'), `t=${((Date.now() - t0) / 1000).toFixed(1)}s`);

// RF-18: servidor apagado y pestaña no abierta antes.
await A.go(`${DEV}/jugadores/${Bid}?juego=lol`); await A.waitFor(READY, 15000); await wait(500);
const S = '/private/tmp/claude-501/-Users-cony-Developer-universidad-apps-web-TeamMatchUp-Activo/e3127d5e-5cea-4a06-9455-7911f937bba6/scratchpad/t10';
const pid = Number(readFileSync(`${S}/backend.pid`, 'utf8'));
process.kill(pid, 'SIGTERM'); await wait(1500);
let down = false; try { await fetch('http://localhost:3001/api/auth/me'); } catch { down = true; }
log('RF-18 servidor apagado (SIGTERM al proceso del backend)', down, `pid ${pid}`);
const t1 = Date.now();
await A.clickText('[role=tab]', 'Rainbow Six Siege');
await A.waitFor(`document.querySelector('[role=tabpanel] .blank')`, 35000); await wait(500);
let f = await A.evaluate(FICHA);
const panelFail = await A.evaluate(`document.querySelector('[role=tabpanel] .blank')?.innerText`);
log('RF-18 elegir R6 con el servidor apagado: error en la sección con "Reintentar", resto visible, sin login', panelFail.includes('No se pudo conectar con el servidor. Inténtalo de nuevo.') && /Reintentar/.test(panelFail) && f.h1 === 'Bruno Val' && f.ranges.length === 2 && (await A.url()).startsWith('/jugadores/'), { url: f.url, panel: panelFail, distancia: f.distance, encabezado: f.h1, tramos: f.ranges, ms: Date.now() - t1, peticiones: A.apiRequests(t1) });
await A.shot(`${SH}/p23-servidor-apagado-1280.jpg`);
const out = openSync(`${S}/backend.log`, 'a');
const child = spawn('node', ['src/index.ts'], { cwd: '/Users/cony/Developer/universidad/apps-web/TeamMatchUp-Activo/backend', env: { ...process.env, MONGODB_DBNAME: 'teammatchup_val008' }, detached: true, stdio: ['ignore', out, out] });
child.unref(); writeFileSync(`${S}/backend.pid`, String(child.pid));
for (let i = 0; i < 40; i++) { try { await fetch('http://localhost:3001/api/auth/me'); break; } catch { await wait(250); } }
log('RF-18 servidor encendido de nuevo (misma base teammatchup_val008)', null, `pid ${child.pid}`);
await A.evaluate(`[...document.querySelectorAll('[role=tabpanel] button')].find((b) => b.textContent.includes('Reintentar')).click(), true`);
await A.waitFor(`/Ubisoft ID/.test(document.querySelector('[role=tabpanel]')?.innerText ?? '')`, 15000); await wait(600);
f = await A.evaluate(FICHA);
log('RF-18 "Reintentar" carga la sección', /Ubisoft ID/.test(f.panel) && /Δ 14 pts/.test(f.distance), { panel: f.panel.slice(0, 120), distancia: f.distance });
log('consola', null, A.consoleErrors.filter((e) => !e.includes('React Router Future Flag')).slice(0, 6));
A.kill();
```

</details>

<details><summary><code>p23b.mjs</code></summary>

```js
// Entre las partes 2 y 3: recorrido solo con teclado (RNF-2) y árbol de accesibilidad de Chrome.
import { launch, wait, DEV } from './lib.mjs';
import { USERS, login as apiLogin } from './api.mjs';
import { SH, log, READY } from './common.mjs';
const Bid = (await apiLogin('B')).user.id;
const A = await launch(9532, './prof-A4');
await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
const FOCUS = `(() => { const a = document.activeElement; if (!a || a === document.body) return null; const s = getComputedStyle(a);
  return { tag: a.tagName, role: a.getAttribute('role'), text: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 40), sel: a.getAttribute('aria-selected'), dis: a.getAttribute('aria-disabled'),
    visible: a.matches(':focus-visible'), outline: s.outlineStyle + ' ' + s.outlineWidth, inMain: !!a.closest('main') }; })()`;
const tabUntil = async (cond, max = 200) => { for (let i = 1; i <= max; i++) { await A.press('Tab'); const f = await A.evaluate(FOCUS); if (f && (await A.evaluate(cond))) return { presses: i, ...f }; } return null; };

// Desde coincidencias.
await A.go(`${DEV}/coincidencias`); await A.waitFor(`document.querySelector('.entry__who a')`, 15000); await wait(600);
let f = await tabUntil(`document.activeElement?.textContent === 'Bruno Val'`);
log('RNF-2 coincidencias: Tab hasta el nombre de B, con foco visible', !!f && f.visible && f.outline.startsWith('solid'), f);
await A.press('Enter'); await A.waitFor(READY, 15000); await wait(600);
log('RNF-2 Enter abre la ficha de B', (await A.url()) === `/jugadores/${Bid}?juego=lol`, await A.url());
// Recorrido de la ficha con Tab: cada parada en main con foco visible.
await A.evaluate('document.activeElement?.blur(), window.scrollTo(0,0), true');
const stops = [];
for (let i = 0; i < 40; i++) { await A.press('Tab'); const x = await A.evaluate(FOCUS); if (!x) continue; if (x.inMain) stops.push(x); if (x.role === 'tab') break; }
const tabStop = stops.at(-1);
log('RNF-2 Tab llega a la pestaña elegida (LoL), una sola parada en la lista de pestañas (tabIndex −1 en las demás)', tabStop?.role === 'tab' && tabStop.sel === 'true' && tabStop.text.includes('League') && tabStop.visible, stops);
const seq = [];
for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'Home', 'End']) {
  await A.press(k); await wait(700);
  const x = await A.evaluate(FOCUS);
  seq.push({ tecla: k, foco: x.text, seleccionada: x.sel, focoVisible: x.visible, url: (await A.url()).split('?')[1] });
}
const expect = ['Rainbow', 'Counter', 'League', 'Counter', 'League', 'Counter'];
log('RNF-2 flechas, Inicio y Fin recorren las pestañas (activación automática, foco visible)', seq.every((s, i) => s.foco.startsWith(expect[i]) && s.seleccionada === 'true' && s.focoVisible), seq);
await A.shot(`${SH}/p23-teclado-pestanas-1280.jpg`, false);
// Tab desde la pestaña CS2 hasta "Proponer sesión" deshabilitado.
const after = [];
let pb = null;
for (let i = 0; i < 40; i++) { await A.press('Tab'); const x = await A.evaluate(FOCUS); if (!x) continue; after.push(x); if (x.text === 'Proponer sesión') { pb = x; break; } }
log('RNF-2 Tab llega a "Proponer sesión" deshabilitado (aria-disabled) y se ve el foco; cada parada intermedia con foco visible', !!pb && pb.dis === 'true' && pb.visible && after.every((x) => x.visible), after);
await A.shot(`${SH}/p23-teclado-proponer-cs2-1280.jpg`, false);
// Árbol de accesibilidad de Chrome para el botón enfocado (lo que lee un lector de pantalla).
await A.send('Accessibility.enable');
const { nodes } = await A.send('Accessibility.getFullAXTree');
const btn = nodes.find((n) => n.role?.value === 'button' && n.name?.value === 'Proponer sesión');
const props = Object.fromEntries((btn?.properties ?? []).map((p) => [p.name, p.value.value]));
log('RNF-2 árbol de accesibilidad: nombre, descripción (motivo) y estado deshabilitado del botón', btn?.description?.value === 'Vincula tu cuenta de CS2 para proponer una sesión' && props.disabled === true, { role: btn?.role?.value, name: btn?.name?.value, description: btn?.description?.value, properties: props });
const u0 = await A.url();
await A.press('Enter'); await A.press(' '); await wait(800);
log('RNF-2 Enter y Espacio sobre el botón deshabilitado no navegan', (await A.url()) === u0, await A.url());
const tl = nodes.find((n) => n.role?.value === 'tablist');
const panels = nodes.filter((n) => n.role?.value === 'tabpanel').map((n) => n.name?.value);
log('RNF-2 árbol de accesibilidad: lista de pestañas y panel', null, { tablist: tl?.name?.value, tabs: nodes.filter((n) => n.role?.value === 'tab').map((n) => `${n.name?.value}${(n.properties ?? []).find((p) => p.name === 'selected')?.value.value ? ' (seleccionada)' : ''}`), tabpanel: panels });
// Texto de RF-23 con el foco (cargando): latencia alta y foco en el botón.
await A.press('Home');
// Desde la agenda.
await A.go(`${DEV}/agenda`); await A.waitFor(`document.querySelectorAll('.week__session').length > 0`, 15000); await wait(600);
const ses = await tabUntil(`document.activeElement?.classList.contains('week__session')`, 300);
await A.press('Enter'); await wait(800);
f = await tabUntil(`document.activeElement?.textContent === 'Bruno Val' && !!document.activeElement.closest('.session__signatures')`, 80);
log('RNF-2 agenda: Tab hasta la sesión, Enter, Tab hasta el nombre de B con foco visible', !!ses && !!f && f.visible, { sesion: ses && { presses: ses.presses, text: ses.text, visible: ses.visible }, enlace: f });
await A.press('Enter'); await A.waitFor(READY, 15000); await wait(500);
log('RNF-2 Enter abre la ficha de B desde la agenda', (await A.url()) === `/jugadores/${Bid}?juego=lol`, await A.url());
A.kill();
```

</details>

<details><summary><code>p23c.mjs</code></summary>

```js
// Entre las partes 2 y 3: 360 px (RNF-5) y contraste medido por CDP en los dos temas (RNF-5; P60).
import { writeFileSync } from 'node:fs';
import { launch, wait, DEV } from './lib.mjs';
import { USERS, login as apiLogin } from './api.mjs';
import { SH, log, READY } from './common.mjs';
import { measure } from './contrast.mjs';
const Bid = (await apiLogin('B')).user.id, Cid = (await apiLogin('C')).user.id;
const A = await launch(9533, './prof-A5');
await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
const overflow = () => A.evaluate(`({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, bodyScroll: document.body.scrollWidth })`);
const STATES = [
  ['ficha B, LoL', async () => { await A.go(`${DEV}/jugadores/${Bid}?juego=lol`); await A.waitFor(READY, 15000); }],
  ['ficha B, R6', async () => { await A.go(`${DEV}/jugadores/${Bid}?juego=r6`); await A.waitFor(READY + ` && /Ubisoft/.test(document.querySelector('[role=tabpanel]').innerText)`, 15000); }],
  ['ficha B, CS2 (motivo 2 y RF-13)', async () => { await A.go(`${DEV}/jugadores/${Bid}?juego=cs2`); await A.waitFor(READY + ` && /SteamID64/.test(document.querySelector('[role=tabpanel]').innerText)`, 15000); }],
  ['ficha C (vacío, nota de zonas, sin horas, motivo 1)', async () => { await A.go(`${DEV}/jugadores/${Cid}`); await A.waitFor(`document.querySelector('.player-head') && !document.querySelector('main [aria-busy=true]')`, 15000); }],
  ['no existe (/jugadores/abc)', async () => { await A.go(`${DEV}/jugadores/abc`); await A.waitFor(`document.querySelector('main .blank')`, 15000); }],
  ['errores (horas y cuentas propias bloqueadas; RF-23 fallo)', async () => { await A.block(['*/api/users/me/availability*', '*/api/accounts?user=me*']); await A.go(`${DEV}/jugadores/${Bid}?juego=lol`); await A.waitFor(`document.querySelectorAll('main .blank').length >= 2`, 15000); await A.block([]); }],
  ['error de toda la ficha (usuario bloqueado)', async () => { await A.block([`*/api/users/${Bid}`]); await A.go(`${DEV}/jugadores/${Bid}?juego=lol`); await A.waitFor(`document.querySelector('main .blank')`, 15000); await A.block([]); }],
  ['cargando (RF-23, latencia 60 s)', async () => { await A.go(`${DEV}/jugadores/${Cid}`); await A.waitFor(`document.querySelector('.player-head')`, 15000); await A.evaluate(`document.querySelector('a[href="/coincidencias"]').click(), true`); await A.waitFor(`document.querySelector('.entry__who a')`, 15000); await A.throttle(60000); await A.evaluate(`document.querySelector('.entry__who a').click(), true`); await A.waitFor(`/Cargando los datos para proponer/.test(document.querySelector('main').innerText)`, 15000); }],
];
const all = {};
for (const theme of ['dark', 'light']) {
  await A.go(`${DEV}/inicio`); await A.evaluate(`localStorage.setItem('tmu.theme', '${theme}'), true`);
  for (const [name, open] of STATES) {
    await A.setWidth(1280); await A.noThrottle();
    await open(); await wait(1200);
    const { rows } = await measure(A);
    all[`${theme} · ${name}`] = rows;
    const fails = rows.filter((r) => r.pass === false), unknown = rows.filter((r) => r.pass === null);
    log(`contraste ${theme} · ${name}: ${rows.length} textos, ${fails.length} por debajo del umbral, ${unknown.length} indeterminados`, fails.length === 0,
      { mínimo: rows.filter((r) => r.ratio).sort((a, b) => a.ratio - b.ratio).slice(0, 3).map((r) => `${r.ratio}:1 «${r.text}» .${r.cls}`), fallos: fails.map((r) => `${r.ratio}:1 (≥${r.need}) «${r.text}» .${r.cls}`), indeterminados: unknown.map((r) => `«${r.text}» .${r.cls}`) });
    if (theme === 'dark' || name.startsWith('ficha B, LoL') || name.startsWith('errores')) {
      // 360 px en el mismo estado (sin recargar: la ficha no vuelve a pedir datos).
      await A.setWidth(360); await wait(900);
      const o = await overflow();
      log(`360 px ${theme} · ${name}: sin desplazamiento horizontal`, o.scrollWidth <= 360, o);
      if (theme === 'dark') await A.shot(`${SH}/p23-360-${name.split(' (')[0].replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.jpg`);
    }
    if (theme === 'light' && (name.startsWith('ficha B, LoL') || name.startsWith('errores') || name.startsWith('ficha C'))) { await A.setWidth(1280); await wait(400); await A.shot(`${SH}/p23-claro-${name.split(' (')[0].replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-1280.jpg`); }
  }
}
await A.noThrottle();
// Comparación: perfil y coincidencias a 360 px (hallazgo previo a la 008).
for (const path of ['/perfil', '/coincidencias']) { await A.setWidth(360); await A.go(`${DEV}${path}`); await wait(2500); log(`360 px ${path} (referencia, no es de la 008)`, null, await overflow()); }
writeFileSync('contrast.json', JSON.stringify(all, null, 1));
// Textos de los componentes compartidos medidos (P60): Failure, Blank, DemoTag (note--faint).
const pick = (pred) => Object.entries(all).flatMap(([k, rows]) => rows.filter(pred).map((r) => `${k}: ${r.ratio}:1 (≥${r.need}) «${r.text}»`));
log('P60 · note--faint (Failure mensaje, Blank descripción, DemoTag)', null, [...new Set(pick((r) => /note--faint/.test(r.cls)))]);
A.kill();
```

</details>

<details><summary><code>p23d.mjs</code></summary>

```js
// Entre las partes 2 y 3: contraste (repetición con muestreo de fondos complejos y perfil de referencia) medido por CDP en los dos temas (RNF-5; P60).
import { writeFileSync } from 'node:fs';
import { launch, wait, DEV } from './lib.mjs';
import { USERS, login as apiLogin } from './api.mjs';
import { SH, log, READY } from './common.mjs';
import { measure } from './contrast.mjs';
const Bid = (await apiLogin('B')).user.id, Cid = (await apiLogin('C')).user.id;
const A = await launch(9534, './prof-A6');
await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
const overflow = () => A.evaluate(`({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, bodyScroll: document.body.scrollWidth })`);
const STATES = [
  ['ficha B, LoL', async () => { await A.go(`${DEV}/jugadores/${Bid}?juego=lol`); await A.waitFor(READY, 15000); }],
  ['ficha B, R6', async () => { await A.go(`${DEV}/jugadores/${Bid}?juego=r6`); await A.waitFor(READY + ` && /Ubisoft/.test(document.querySelector('[role=tabpanel]').innerText)`, 15000); }],
  ['ficha B, CS2 (motivo 2 y RF-13)', async () => { await A.go(`${DEV}/jugadores/${Bid}?juego=cs2`); await A.waitFor(READY + ` && /SteamID64/.test(document.querySelector('[role=tabpanel]').innerText)`, 15000); }],
  ['ficha C (vacío, nota de zonas, sin horas, motivo 1)', async () => { await A.go(`${DEV}/jugadores/${Cid}`); await A.waitFor(`document.querySelector('.player-head') && !document.querySelector('main [aria-busy=true]')`, 15000); }],
  ['no existe (/jugadores/abc)', async () => { await A.go(`${DEV}/jugadores/abc`); await A.waitFor(`document.querySelector('main .blank')`, 15000); }],
  ['errores (horas y cuentas propias bloqueadas; RF-23 fallo)', async () => { await A.block(['*/api/users/me/availability*', '*/api/accounts?user=me*']); await A.go(`${DEV}/jugadores/${Bid}?juego=lol`); await A.waitFor(`document.querySelectorAll('main .blank').length >= 2`, 15000); await A.block([]); }],
  ['error de toda la ficha (usuario bloqueado)', async () => { await A.block([`*/api/users/${Bid}`]); await A.go(`${DEV}/jugadores/${Bid}?juego=lol`); await A.waitFor(`document.querySelector('main .blank')`, 15000); await A.block([]); }],
  ['cargando (RF-23, latencia 60 s)', async () => { await A.go(`${DEV}/jugadores/${Cid}`); await A.waitFor(`document.querySelector('.player-head')`, 15000); await A.evaluate(`document.querySelector('a[href="/coincidencias"]').click(), true`); await A.waitFor(`document.querySelector('.entry__who a')`, 15000); await A.throttle(60000); await A.evaluate(`document.querySelector('.entry__who a').click(), true`); await A.waitFor(`/Cargando los datos para proponer/.test(document.querySelector('main').innerText)`, 15000); }],
];
const all = {};
STATES.push(['perfil de A (referencia: componentes compartidos, 007)', async () => { await A.go(`${DEV}/perfil`); await A.waitFor(`document.querySelector('main [role=tabpanel], main .ficha') && !document.querySelector('main [aria-busy=true]')`, 15000); }]);
for (const theme of ['dark', 'light']) {
  await A.noThrottle(); await A.block([]);
  await A.go(`${DEV}/inicio`); await A.evaluate(`localStorage.setItem('tmu.theme', '${theme}'), true`);
  for (const [name, open] of STATES) {
    await A.noThrottle(); await A.setWidth(1280);
    await open(); await wait(1200);
    const { rows } = await measure(A);
    all[`${theme} · ${name}`] = rows;
    const fails = rows.filter((r) => r.pass === false), unknown = rows.filter((r) => r.pass === null);
    log(`contraste ${theme} · ${name}: ${rows.length} textos (${rows.filter((r) => r.sampled).length} por muestreo), ${fails.length} por debajo del umbral, ${unknown.length} indeterminados`, fails.length === 0,
      { fallos: [...new Set(fails.map((r) => `${r.ratio}:1 (≥${r.need}) «${r.text.replace(/\d+ (minutos|horas)/, 'N')}» .${r.cls}`))], indeterminados: unknown.map((r) => `«${r.text}» .${r.cls}`) });
  }
}
await A.noThrottle();
// Comparación: perfil y coincidencias a 360 px (hallazgo previo a la 008).
writeFileSync('contrast2.json', JSON.stringify(all, null, 1));
// Textos de los componentes compartidos medidos (P60): Failure, Blank, DemoTag (note--faint).
const pick = (pred) => Object.entries(all).flatMap(([k, rows]) => rows.filter(pred).map((r) => `${k}: ${r.ratio}:1 (≥${r.need}) «${r.text}»`));
log('P60 · note--faint (Failure mensaje, Blank descripción, DemoTag)', null, [...new Set(pick((r) => /note--faint/.test(r.cls)))]);
A.kill();
```

</details>

<details><summary><code>pg.mjs</code></summary>

```js
// 360 px: la grilla de horas se desplaza dentro de su propio recuadro (RNF-5), servidor real, ficha de C vista por A.
import { launch, wait, DEV } from './lib.mjs';
import { USERS, login as apiLogin } from './api.mjs';
import { log, SH } from './common.mjs';
const Cid = (await apiLogin('C')).user.id;
const A = await launch(9599, './prof-grid'); await A.setWidth(360);
await A.login(USERS.A.email, USERS.A.password);
await A.go(`${DEV}/jugadores/${Cid}`); await A.waitFor(`document.querySelector('.player-grid') && !document.querySelector('main [aria-busy=true]')`, 15000); await wait(800);
const g = await A.evaluate(`(() => { const e = document.querySelector('.player-grid'); const s = getComputedStyle(e); return { gridScrollWidth: e.scrollWidth, gridClientWidth: e.clientWidth, overflowX: s.overflowX, pageScrollWidth: document.documentElement.scrollWidth }; })()`);
log('360 px: la página no se desplaza y la grilla se desplaza dentro de su recuadro (RNF-5)', g.pageScrollWidth <= 360 && g.gridScrollWidth > g.gridClientWidth && /auto|scroll/.test(g.overflowX), g);
await A.shot(`${SH}/p23-360-grilla.jpg`);
A.kill();
```

</details>

<details><summary><code>lh.mjs</code></summary>

```js
// Lighthouse (accesibilidad) sobre la ficha de B con la sesión de A, en los dos temas y en tres estados.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { launch, wait, DEV } from './lib.mjs';
import { USERS, login as apiLogin } from './api.mjs';
import { log } from './common.mjs';
const Bid = (await apiLogin('B')).user.id, Cid = (await apiLogin('C')).user.id;
const PORT = 9541;
const A = await launch(PORT, './prof-lh'); await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
const targets = [['ficha-b-lol', `${DEV}/jugadores/${Bid}?juego=lol`], ['ficha-b-cs2', `${DEV}/jugadores/${Bid}?juego=cs2`], ['ficha-c', `${DEV}/jugadores/${Cid}`]];
for (const theme of ['dark', 'light']) {
  await A.go(`${DEV}/inicio`); await A.evaluate(`localStorage.setItem('tmu.theme', '${theme}'), true`);
  for (const [name, url] of targets) {
    const out = `../lh/${theme}-${name}.json`;
    try {
      execFileSync('npx', ['-y', 'lighthouse@12.8.2', url, `--port=${PORT}`, '--only-categories=accessibility', '--preset=desktop', '--disable-storage-reset', '--output=json', `--output-path=${out}`, '--quiet', '--max-wait-for-load=60000'], { stdio: 'inherit', timeout: 240000 });
    } catch (e) { log(`Lighthouse ${theme} ${name}`, false, String(e.message).slice(0, 300)); continue; }
    const r = JSON.parse(readFileSync(out, 'utf8'));
    const cc = r.audits['color-contrast'];
    const failed = Object.values(r.audits).filter((a) => a.score === 0 && a.scoreDisplayMode === 'binary').map((a) => a.id);
    const items = (cc.details?.items ?? []).map((i) => `${i.node?.snippet?.slice(0, 90)} — ${i.node?.explanation?.split('\n')[1]?.trim() ?? ''}`);
    log(`Lighthouse ${theme} · ${name}: accesibilidad ${Math.round(r.categories.accessibility.score * 100)}; color-contrast ${cc.score === 1 ? 'sin fallos' : cc.score === 0 ? 'con fallos' : cc.scoreDisplayMode}`, cc.score === 1,
      { url: r.finalDisplayedUrl.replace(DEV, ''), auditoríasFallidas: failed, contraste: items });
  }
}
A.kill();
```

</details>

<details><summary><code>p3.mjs</code></summary>

```js
// Parte 3 del registro: Agenda (A todavía con LoL), con la desvinculación de LoL de A al final.
import { launch, wait, DEV } from './lib.mjs';
import { USERS, call, login as apiLogin } from './api.mjs';
import { FICHA, FORM } from './ficha.mjs';
import { SH, log, READY } from './common.mjs';
const Bid = (await apiLogin('B')).user.id;
const A = await launch(9551, './prof-A7'); await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
const FB = `${DEV}/jugadores/${Bid}?juego=lol`;
const openFicha = async () => { await A.go(`${DEV}/coincidencias`); await A.waitFor(`document.querySelector('.entry__who a')`, 15000);
  await A.evaluate(`[...document.querySelectorAll('.entry__who a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
  await A.waitFor(READY + ` && document.querySelector('.player-propose button')?.getAttribute('aria-disabled') !== 'true'`, 15000); await wait(500); };
const propose = async () => { await A.clickText('.player-propose button', 'Proponer sesión'); await A.waitFor(`location.pathname === '/agenda'`, 15000); };
const agendaState = () => A.evaluate(`({ form: !!document.querySelector('#create-session-form'), alerts: [...document.querySelectorAll('main [role=alert], main .blank')].map((e) => e.innerText.replace(/\\n+/g, ' / ')), state: history.state?.usr ?? null })`);

// 3.1 Recargar la agenda tras abrir el formulario desde la ficha.
await openFicha(); await propose(); await A.waitFor(`document.querySelector('#create-session-form')`, 15000); await wait(600);
log('3.1a "Proponer sesión" abre el formulario', !!(await A.evaluate(FORM)), await A.evaluate(FORM));
await A.reload(); await A.waitFor(`document.querySelectorAll('.week__session').length > 0`, 15000); await wait(1500);
let s = await agendaState();
log('3.1b recargar la agenda la muestra sin formulario (RF-21; 007 RF-30)', !s.form, s);
// 3.2 "Atrás" a la ficha y "Adelante" a la agenda.
await A.back(); await A.waitFor(READY, 15000); await wait(600);
const u = await A.url();
await A.forward(); await A.waitFor(`location.pathname === '/agenda' && document.querySelectorAll('.week__session').length > 0`, 15000); await wait(1500);
s = await agendaState();
log('3.2 "Atrás" vuelve a la ficha y "Adelante" a la agenda sin reabrir el formulario (RF-21)', u === FB.replace(DEV, '') && !s.form, { atrás: u, adelante: await A.url(), ...s });
// 3.3 Con "3G lenta".
await openFicha();
await A.throttle(2000, 50000, 50000);
const t0 = Date.now();
await propose();
await A.waitFor(`document.querySelector('#create-session-form')`, 60000); await wait(300);
const form = await A.evaluate(FORM);
log('3.3 con 3G lenta, "Proponer sesión" abre el formulario con la lista de juegos cargada y LoL elegido (RF-21; 007 RF-30)', !!form && /\[lol\]/.test(form.game) && form.gameOptions.join() === 'lol,r6', { ms: Date.now() - t0, form, peticiones: A.apiRequests(t0) });
await A.shot(`${SH}/p3-3g-formulario-1280.jpg`, false);
await A.noThrottle();
await A.clickText('.slip button, button', 'Cancelar'); await wait(500);
// 3.4 Bloqueando la petición de las cuentas de A.
await openFicha();
await A.block(['*/api/accounts?user=me*']);
const t1 = Date.now();
await propose(); await wait(2500);
s = await agendaState();
log('3.4 bloqueadas las cuentas de A, la agenda muestra el error y no abre el formulario (RF-21; 007 RF-30)', !s.form && s.alerts.some((a) => /No se pudo conectar|Reintentar/.test(a)), { ...s, peticiones: A.apiRequests(t1) });
await A.shot(`${SH}/p3-cuentas-bloqueadas-1280.jpg`, false);
await A.block([]);
const n = (await call('GET', '/api/sessions?game=all', { session: await apiLogin('A') })).json.length;
log('3.4b ninguno de esos formularios se anotó', n === 1, `sesiones en la base: ${n}`);

// 3.5 Último paso: desvincular LoL en otra pestaña y pulsar "Proponer sesión".
await openFicha();
const T2 = await A.newTab(); await T2.setWidth(1280);
await T2.go(`${DEV}/configuracion`); await T2.waitFor(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Desvincular')`, 15000); await wait(500);
const unl = await T2.evaluate(`(() => { for (const b of [...document.querySelectorAll('button')].filter((x) => x.textContent.trim() === 'Desvincular')) {
  let a = b; while (a && !a.innerText?.includes('jugador1#las')) a = a.parentElement; if (a && !a.innerText.includes('jugador3')) { b.click(); return a.innerText.replace(/\\n+/g, ' / ').slice(0, 90); } } return null; })()`);
await wait(2000);
const accs = (await call('GET', '/api/accounts?user=me', { session: await apiLogin('A') })).json.map((a) => a.gameId);
log('3.5a A desvincula su cuenta de LoL en otra pestaña (Configuración, "Desvincular", confirmación aceptada)', !accs.includes('lol'), { fila: unl, cuentasDeA: accs });
T2.ws.close();
await A.bringToFront(); await wait(500);
await propose(); await wait(2500);
s = await agendaState();
log('3.5b "Proponer sesión": la agenda no abre el formulario y se muestra como abierta directamente (RF-21; P33)', !s.form && s.alerts.length === 0 && s.state === null, { url: await A.url(), ...s });
await A.shot(`${SH}/p3-agenda-sin-lol-1280.jpg`, false);
await A.back(); await A.waitFor(READY, 15000); await A.reload(); await A.waitFor(READY, 15000); await wait(800);
const f = await A.evaluate(FICHA);
log('3.5c al volver a la ficha y recargarla: RF-13 en la distancia y motivo 2, sin "Reintentar" (RF-6, RF-13, RF-21; P33)', f.distance.includes('Vincula tu cuenta de LoL para ver la distancia de rango') && f.propose.reason === 'Vincula tu cuenta de LoL para proponer una sesión' && !(await A.text('main')).includes('Reintentar'), { url: f.url, distancia: f.distance, proponer: f.propose });
await A.shot(`${SH}/p3-ficha-sin-lol-1280.jpg`, false);
log('consola', null, A.consoleErrors.filter((e) => !e.includes('React Router Future Flag')).slice(0, 6));
A.kill();
```

</details>

<details><summary><code>p4.mjs</code></summary>

```js
// Parte 4 del registro: paso final de CS2 (A sin LoL, con R6 y CS2; disponibilidad del recorrido restaurada).
import { launch, wait, DEV } from './lib.mjs';
import { USERS, call, login as apiLogin } from './api.mjs';
import { FICHA, FORM } from './ficha.mjs';
import { SH, log, READY } from './common.mjs';
const sA = await apiLogin('A'); const Bid = (await apiLogin('B')).user.id;
const r = await call('POST', '/api/accounts', { body: { gameId: 'cs2', handle: '76561190000000001', region: 'south america' }, session: sA });
log('4.1 A vincula CS2 76561190000000001 (POST /api/accounts con la sesión de A)', r.status === 201, { status: r.status, rango: r.json.currentRank, verified: r.json.verified, simulated: r.json.simulated });
log('4.1 cuentas de A', null, (await call('GET', '/api/accounts?user=me', { session: sA })).json.map((a) => `${a.gameId} ${a.handle}`));
log('4.1 disponibilidad de A', null, (await call('GET', '/api/users/me/availability', { session: sA })).json);
const A = await launch(9561, './prof-A8'); await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
await A.go(`${DEV}/coincidencias`); await A.waitFor(`document.querySelector('[role=tab]')`, 15000); await wait(800);
await A.clickText('[role=tab]', 'Counter-Strike 2');
await A.waitFor(`[...document.querySelectorAll('.entry')].some((e) => e.innerText.includes('Bruno Val')) || document.querySelector('main .blank')`, 15000); await wait(800);
const row = await A.evaluate(`(() => { const e = [...document.querySelectorAll('.entry')].find((x) => x.innerText.includes('Bruno Val')); return e ? e.innerText.replace(/\\n+/g, ' | ') : null; })()`);
log('4.2 B aparece en las coincidencias de CS2 de A', !!row, row);
await A.shot(`${SH}/p4-coincidencias-cs2-1280.jpg`, false);
await A.evaluate(`[...document.querySelectorAll('.entry__who a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
await A.waitFor(READY + ` && /SteamID64/.test(document.querySelector('[role=tabpanel]').innerText) && /Δ/.test(document.querySelector('.player-distance')?.innerText ?? '')`, 15000); await wait(1000);
const f = await A.evaluate(FICHA);
const matches = await A.evaluate(`[...document.querySelectorAll('[role=tabpanel] .ledger__row, [role=tabpanel] li, [role=tabpanel] tr')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim()).filter((t) => /·/.test(t))`);
const rowDist = /Δ \d+ pts/.exec(row ?? '')?.[0];
log('4.3 ficha de B en CS2: rango, escala Grey a Gold con CS Rating, partidas "<mapa> · a-b" con variación, distancia con la etiqueta igual a la fila (RF-4, RF-6, RF-27)', f.url.endsWith('?juego=cs2') && /CS Rating/.test(f.panel) && /Grey/i.test(f.panel) && /Gold/i.test(f.panel) && /\w+ · \d+-\d+/.test(f.panel) && f.distance.includes(rowDist) && /Datos de demostración/.test(f.distance), { url: f.url, panel: f.panel.replace(/\n+/g, ' | '), distancia: f.distance, distanciaFila: rowDist });
log('4.4 "Proponer sesión" ya no muestra el motivo 2', f.propose.ariaDisabled === null, f.propose);
await A.shot(`${SH}/p4-ficha-b-cs2-1280.jpg`);
await A.clickText('.player-propose button', 'Proponer sesión');
await A.waitFor(`document.querySelector('#create-session-form')`, 15000); await wait(800);
const form = await A.evaluate(FORM);
log('4.5 abre el formulario con CS2, martes, 20:00 y 3 horas (RF-7, RF-12; P31)', /\[cs2\]/.test(form.game) && /\[1\]/.test(form.day) && /\[20\]/.test(form.hour) && /\[3\]/.test(form.duration), form);
await A.shot(`${SH}/p4-agenda-form-cs2-1280.jpg`, false);
// Cerrar sin anotar: el "Cancelar" del pie del formulario (no el de la sesión de "Mis sesiones").
await A.evaluate(`document.querySelector('button[form=create-session-form]').parentElement.querySelector('button:not([form])').click(), true`); await wait(600);
log('4.5 formulario cerrado sin anotar', !(await A.evaluate(`!!document.querySelector('#create-session-form')`)), `sesiones en la base: ${(await call('GET', '/api/sessions?game=all', { session: sA })).json.length}`);
A.kill();
```

</details>

<details><summary><code>p56.mjs</code></summary>

```js
// Partes 5 y 6 del registro: pestaña que desaparece (RF-19, RF-26) y eliminación de B (último paso).
import { launch, wait, DEV } from './lib.mjs';
import { USERS, call, login as apiLogin } from './api.mjs';
import { FICHA } from './ficha.mjs';
import { SH, log, READY, SNAP } from './common.mjs';
const Bid = (await apiLogin('B')).user.id;
const A = await launch(9571, './prof-A9'); await A.setWidth(1280);
await A.login(USERS.A.email, USERS.A.password);
// Parte 5. A abre la ficha de B en CS2 desde sus coincidencias de CS2, sin elegir R6.
await A.go(`${DEV}/coincidencias`); await A.waitFor(`document.querySelector('[role=tab]')`, 15000); await wait(600);
await A.clickText('[role=tab]', 'Counter-Strike 2');
await A.waitFor(`[...document.querySelectorAll('.entry__who a')].some((a) => a.textContent === 'Bruno Val')`, 15000); await wait(500);
await A.evaluate(`[...document.querySelectorAll('.entry__who a')].find((a) => a.textContent === 'Bruno Val').click(), true`);
await A.waitFor(READY + ` && /SteamID64/.test(document.querySelector('[role=tabpanel]').innerText)`, 15000); await wait(800);
let f = await A.evaluate(FICHA);
log('5.1 A: ficha de B en CS2 (sin elegir R6)', f.url.endsWith('?juego=cs2'), { url: f.url, tabs: f.tabs });
// B desvincula su cuenta de R6 en otro navegador (su propio Chrome, Configuración).
const B = await launch(9572, './prof-B9'); await B.setWidth(1280);
await B.login(USERS.B.email, USERS.B.password);
await B.go(`${DEV}/configuracion`); await B.waitFor(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Desvincular')`, 15000); await wait(500);
const unl = await B.evaluate(`(() => { for (const b of [...document.querySelectorAll('button')].filter((x) => x.textContent.trim() === 'Desvincular')) {
  let a = b; while (a && !a.innerText?.includes('jugador1')) a = a.parentElement; if (a && !a.innerText.includes('jugador2')) { b.click(); return a.innerText.replace(/\\n+/g, ' / ').slice(0, 80); } } return null; })()`);
await wait(2000);
log('5.2 B desvincula R6 en otro navegador (Configuración, "Desvincular", confirmación aceptada)', !(await call('GET', `/api/accounts?user=${Bid}`, { session: await apiLogin('A') })).json.some((a) => a.gameId === 'r6'), { fila: unl });
B.kill();
// Volver el foco a la ventana de A: sin cambios ni peticiones (RF-26).
const before = JSON.stringify(await A.evaluate(FICHA));
const t0 = Date.now();
await A.bringToFront(); await A.evaluate(`window.dispatchEvent(new Event('online')), true`); await wait(5000);
const after = JSON.stringify(await A.evaluate(FICHA));
log('5.3 volver el foco (y "online") a la ventana de A: ninguna petición en la red y ningún cambio (RF-26)', A.apiRequests(t0).length === 0 && before === after.replace(/hace \d+ minutos/g, (m) => m), { peticiones: A.apiRequests(t0), sinCambios: before === after });
// Elegir R6.
const t1 = Date.now();
await A.clickText('[role=tab]', 'Rainbow Six Siege');
const seen = []; let last = '';
while (Date.now() - t1 < 4000) { const s = (await A.url()) + ' ' + (await A.evaluate(SNAP)) + ' tabs=' + JSON.stringify((await A.evaluate(FICHA)).tabs); if (s !== last) { seen.push(`+${((Date.now() - t1) / 1000).toFixed(2)}s ${s}`); last = s; } await wait(40); }
f = await A.evaluate(FICHA);
log('5.4 elegir R6: carga de la sección de juegos mientras pide usuario y cuentas; R6 desaparece y pasa a LoL, también en la dirección (RF-8, RF-19; P47)', f.url.endsWith('?juego=lol') && f.tabs.join() === '*League of Legends,Counter-Strike 2', { estados: seen, peticiones: A.apiRequests(t1), url: f.url, tabs: f.tabs, distancia: f.distance, proponer: f.propose });
await A.shot(`${SH}/p5-r6-desaparece-1280.jpg`);
log('5.5 historial: la corrección reemplaza la entrada', null, (await A.history()).urls.slice(-3));
// Parte 6. A recarga la ficha de B en LoL (CS2 no vista desde la recarga).
await A.reload(); await A.waitFor(READY, 15000); await wait(800);
f = await A.evaluate(FICHA);
log('6.1 A recarga la ficha de B en LoL', f.url.endsWith('?juego=lol') && f.tabs[0] === '*League of Legends', { url: f.url, tabs: f.tabs });
const sB = await apiLogin('B');
const del = await call('DELETE', '/api/users/me', { session: sB });
log('6.2 B elimina su cuenta en otro cliente (DELETE /api/users/me con la sesión de B; la interfaz no tiene esa acción)', del.status === 204, { status: del.status });
const t2 = Date.now();
await A.clickText('[role=tab]', 'Counter-Strike 2');
await A.waitFor(`/Este jugador no existe/.test(document.querySelector('main').innerText)`, 15000); await wait(800);
const main = await A.text('main');
log('6.3 A elige CS2: "Este jugador no existe" en lugar de toda la ficha, no "Este jugador no ha vinculado ningún juego" (RF-9, RF-19; P32)', main.includes('Este jugador no existe') && !main.includes('no ha vinculado') && !(await A.evaluate(`!!document.querySelector('.player-head')`)), { main: main.replace(/\n+/g, ' / '), peticiones: A.apiRequests(t2), url: await A.url() });
await A.shot(`${SH}/p6-b-eliminado-1280.jpg`, false);
log('consola', null, A.consoleErrors.filter((e) => !e.includes('React Router Future Flag')).slice(0, 6));
A.kill();
```

</details>

<details><summary><code>pt.mjs</code></summary>

```js
// Fuera del orden: título con tabulador (paso 14 de users.rest con D; E en la interfaz). RF-7; P34, P40, P45, P46.
import { readFileSync } from 'node:fs';
import { launch, wait, DEV } from './lib.mjs';
import { USERS, call, register, login as apiLogin, BASE } from './api.mjs';
import { FICHA, FORM } from './ficha.mjs';
import { SH, log, READY } from './common.mjs';
for (const k of ['D', 'E']) { const r = await register(k); log(`T.0 registro de ${k} (paso 1 de auth.rest con sus datos)`, r.status === 201, { status: r.status, id: r.json.id }); }
const prep = { D: [['lol', 'Jugador3#LAS', 'LAS']], E: [['lol', 'jugador4#las', 'LAS']] };
for (const k of ['D', 'E']) {
  const s = await apiLogin(k);
  for (const [gameId, handle, region] of prep[k]) { const a = await call('POST', '/api/accounts', { body: { gameId, handle, region }, session: s }); log(`T.0 ${k} vincula ${gameId} ${handle}`, a.status === 201, { status: a.status, rango: a.json.currentRank?.normalized }); }
  const v = await call('PUT', '/api/users/me/availability', { body: { blocks: ['2-18', '2-19'] }, session: s }); log(`T.0 ${k} guarda miércoles 18:00 y 19:00`, v.status === 200, v.json);
}
// Paso 14 de users.rest, con el cuerpo copiado literalmente del archivo.
const rest = readFileSync('/Users/cony/Developer/universidad/apps-web/TeamMatchUp-Activo/backend/requests/users.rest', 'utf8');
const body14 = /### 14 \(continuación\)[\s\S]*?\n\n(\{[\s\S]*?\})/.exec(rest)[1];
const login14 = await call('POST', '/api/auth/login', { body: { email: USERS.D.email, password: USERS.D.password } });
const sD = { cookie: (login14.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; '), csrf: login14.headers.get('x-csrf-token') };
const patch = await call('PATCH', '/api/users/me', { session: sD, raw: body14, body: {} });
log('T.1 paso 14: POST /api/auth/login (D) → PATCH /api/users/me', patch.status === 200 && patch.json.displayName === 'Jugador\tD', { login: login14.status, cuerpoEnviado: body14, status: patch.status, respuesta: patch.json, displayNameJSON: JSON.stringify(patch.json.displayName) });
const Did = patch.json.id;
// E en la interfaz.
const E = await launch(9581, './prof-E'); await E.setWidth(1280);
await E.login(USERS.E.email, USERS.E.password);
await E.go(`${DEV}/jugadores/${Did}?juego=lol`); await E.waitFor(READY + ` && document.querySelector('.player-propose button')?.getAttribute('aria-disabled') !== 'true'`, 15000); await wait(600);
const f = await E.evaluate(FICHA);
log('T.2 E abre la ficha de D: nombre con el tabulador como texto', JSON.stringify(f.h1) === JSON.stringify('Jugador\tD'), { h1: JSON.stringify(f.h1), title: JSON.stringify(f.title), tramos: f.ranges, proponer: f.propose });
await E.clickText('.player-propose button', 'Proponer sesión');
await E.waitFor(`document.querySelector('#create-session-form')`, 15000); await wait(600);
const form = await E.evaluate(FORM);
log('T.3 "Proponer sesión" abre el formulario con "Sesión con Jugador\\tD"', form.title === 'Sesión con Jugador\tD', { titulo: JSON.stringify(form.title), juego: form.game, dia: form.day, hora: form.hour, duracion: form.duration });
const t0 = Date.now();
await E.evaluate(`document.querySelector('button[form=create-session-form]').click(), true`); await wait(1500);
const err = await E.evaluate(`[...document.querySelectorAll('#create-session-form [role=alert], #create-session-form .notice, #create-session-form .field__error, #create-session-form [id$=error]')].map((e) => e.innerText.trim()).filter(Boolean)`);
const reqs = E.requests.filter((r) => r.t >= t0 && r.url.includes('/api/sessions') && r.method === 'POST').length;
const n1 = (await call('GET', '/api/sessions?game=all', { session: await apiLogin('E') })).json.filter((s) => s.title.includes('Jugador')).length;
log('T.4 al anotar, el formulario muestra el error del título y no se anota nada', err.length > 0 && n1 === 0 && !!(await E.evaluate(`!!document.querySelector('#create-session-form')`)), { errores: err, peticionesPOST: reqs, cuál: reqs > 0 ? 'mensaje del servidor (007 RF-9)' : 'error propio del formulario antes de enviar (DP6-33)', sesionesConEseTítulo: n1 });
await E.shot(`${SH}/pt-titulo-error-1280.jpg`, false);
await E.fill('#create-session-form input', 'Sesión con Jugador D');
await E.evaluate(`document.querySelector('button[form=create-session-form]').click(), true`); await wait(2000);
const ss = (await call('GET', '/api/sessions?game=all', { session: await apiLogin('E') })).json.filter((s) => s.title.includes('Jugador'));
log('T.5 tras corregir el título ("Sesión con Jugador D"), la sesión se anota', ss.length === 1 && !(await E.evaluate(`!!document.querySelector('#create-session-form')`)), ss.map((s) => ({ title: s.title, gameId: s.gameId, day: s.day, startHour: s.startHour, duration: s.duration })));
const hosts = [...new Set(E.requests.map((r) => new URL(r.url).host))];
log('peticiones de la interfaz: solo a localhost (sin dominios externos)', hosts.every((h) => h.startsWith('localhost')), hosts);
E.kill();
```

</details>

<details><summary><code>pm.mjs</code></summary>

```js
// Fuera del orden: modo simulado con la cuenta demo (RF-11, RF-15, RF-16, RF-27; P43, P48, P49).
import { launch, wait } from './lib.mjs';
import { FICHA } from './ficha.mjs';
import { SH, log, READY } from './common.mjs';
const DEV = 'http://localhost:5193';
const P = await launch(9591, './prof-mock'); await P.setWidth(1280);
await P.go(`${DEV}/login`); await P.waitFor(`document.querySelector('input[type=email]')`);
await P.fill('input[type=email]', 'demo@teammatchup.gg'); await P.fill('input[type=password]', 'demo1234');
await P.evaluate(`document.querySelector('form.access button[type=submit]').click(), true`); await P.waitFor(`location.pathname !== '/login'`, 20000); await wait(600);
const db = await P.evaluate(`JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith('tmu.mock-db'))))`);
const me = db.users.find((u) => u.email === 'demo@teammatchup.gg');
log('M.0 cuenta demo', null, { id: me.id, usuarios: db.users.length, cuentas: db.accounts.length });
const GAMES = { lol: 'League of Legends', r6: 'Rainbow Six Siege', cs2: 'Counter-Strike 2' };
const LABEL = { lol: 'Riot ID', r6: 'Ubisoft ID', cs2: 'SteamID64' };
const nameOf = (id) => db.users.find((u) => u.id === id)?.displayName;
// M.1 Desde coincidencias: ficha de un jugador semilla por juego.
const seen = {};
for (const g of ['lol', 'r6', 'cs2']) {
  await P.go(`${DEV}/coincidencias`); await P.waitFor(`document.querySelector('[role=tab]')`, 15000); await wait(500);
  await P.clickText('[role=tab]', GAMES[g]); await P.waitFor(`document.querySelector('.entry__who a')`, 15000); await wait(900);
  const href = await P.evaluate(`document.querySelector('.entry__who a').getAttribute('href')`);
  await P.evaluate(`document.querySelector('.entry__who a').click(), true`);
  await P.waitFor(READY + ` && /${LABEL[g]}/.test(document.querySelector('[role=tabpanel]').innerText) && document.querySelector('.player-distance')`, 20000); await wait(900);
  const f = await P.evaluate(FICHA);
  seen[g] = f.url;
  const tags = (f.panel.match(/Datos de demostración/g) ?? []).length;
  log(`M.1 ${g}: ficha de ${f.h1} desde coincidencias — rango, historial, partidas, marca y Etiqueta (también en la distancia) (RF-16, RF-27)`, f.url === href && /RANGO VIGENTE/.test(f.panel) && /lectura/.test(f.panel) && /Últimas partidas/.test(f.panel) && /(VERIFICADA|SIN VERIFICAR)/.test(f.panel) && tags >= 4 && /Δ \d+ pts\s+Datos de demostración/.test(f.distance), { url: f.url, etiquetasEnElPanel: tags, distancia: f.distance, panel: f.panel.replace(/\n+/g, ' | ').slice(0, 420) });
  if (g === 'lol') await P.shot(`${SH}/pm-ficha-semilla-lol-1280.jpg`);
}
// M.2 Verificadas y sin verificar por juego, con la Etiqueta junto a la marca.
for (const g of ['lol', 'r6', 'cs2']) {
  const out = {};
  for (const v of [true, false]) {
    const acc = db.accounts.find((a) => a.gameId === g && a.verified === v && a.userId !== me.id);
    if (!acc) { out[v] = 'ninguna'; continue; }
    await P.go(`${DEV}/jugadores/${acc.userId}?juego=${g}`); await P.waitFor(READY + ` && /${LABEL[g]}/.test(document.querySelector('[role=tabpanel]').innerText)`, 20000); await wait(500);
    const mark = await P.evaluate(`(() => { const s = document.querySelector('[role=tabpanel] .stamp'); return s ? [s.textContent.trim(), s.parentElement.innerText.replace(/\\n+/g, ' | ')] : null; })()`);
    out[v] = { jugador: nameOf(acc.userId), handle: acc.handle, marca: mark?.[0], junto: mark?.[1] };
  }
  log(`M.2 ${g}: hay cuentas "Verificada" y "Sin verificar" entre las semilla, con la Etiqueta junto a la marca (RF-16, RF-27)`, out.true?.marca === 'Verificada' && out.false?.marca === 'Sin verificar' && /Datos de demostración/.test(out.true?.junto) && /Datos de demostración/.test(out.false?.junto), out);
}
// M.3 Inexistentes.
for (const raw of ['user-999999', 'abc', 'ME']) {
  await P.go(`${DEV}/jugadores/${raw}`); await P.waitFor(`document.querySelector('main .blank') && !document.querySelector('main [aria-busy=true]')`, 15000); await wait(300);
  const t = await P.text('main');
  log(`M.3 /jugadores/${raw} → "Este jugador no existe" (RF-9, RF-15; P43)`, t.includes('Este jugador no existe'), t.replace(/\n+/g, ' / '));
}
// M.4 Ficha propia.
for (const raw of [me.id, me.id.toUpperCase(), 'me']) {
  await P.go(`${DEV}/inicio`); await wait(400);
  const i0 = (await P.history()).currentIndex;
  await P.go(`${DEV}/jugadores/${raw}`); await P.waitFor(`location.pathname === '/perfil'`, 10000); await wait(400);
  const h = (await P.history()).urls.slice(i0);
  await P.back(); await wait(600);
  log(`M.4 /jugadores/${raw} → perfil; "Atrás" no vuelve a la ficha (RF-15; P43)`, h.join() === '/inicio,/perfil' && (await P.url()) === '/inicio', { historial: h, trasAtrás: await P.url() });
}
// M.5 USER-<n> de un jugador semilla.
const seed = db.users.find((u) => u.id !== me.id && db.accounts.some((a) => a.userId === u.id && a.gameId === 'lol'));
const snap = async (raw) => { await P.go(`${DEV}/jugadores/${raw}?juego=lol`); await P.waitFor(READY + ` && document.querySelector('.player-distance')`, 20000); await wait(600); const f = await P.evaluate(FICHA); delete f.url; return f; };
const a = await snap(seed.id), b = await snap(seed.id.toUpperCase());
log(`M.5 /jugadores/${seed.id.toUpperCase()} abre la ficha de ${seed.displayName} con los mismos datos que ${seed.id} (RF-11; P49)`, JSON.stringify(a) === JSON.stringify(b), { h1: b.h1, igual: JSON.stringify(a) === JSON.stringify(b), url: await P.url() });
// M.6 Red.
const api = P.requests.filter((r) => r.url.includes('/api/'));
const hosts = [...new Set(P.requests.map((r) => { const u = new URL(r.url); return u.protocol === 'data:' ? 'data:' : u.host; }))];
log('M.6 la pestaña de red no muestra peticiones al servidor (RF-11, RF-16, RF-27)', api.length === 0, { peticionesApi: api.length, totalPeticiones: P.requests.length, destinos: hosts });
// M.7 Textos de la ficha.
const all = await P.text('body');
log('M.7 ningún nombre de fuente ni "verificado"; aviso global en barra y pie (RF-16, RF-27)', !/FACEIT|Steam(?!ID64)|Valve|Leetify|Riot(?! ID)|Ubisoft(?! ID)/.test(all) && !/verificado/i.test(all) && (await P.evaluate(`!!document.querySelector('.dock__demo') && /Datos de demostración/.test(document.querySelector('footer')?.innerText ?? '')`)), 'ok');
log('consola', null, P.consoleErrors.filter((e) => !e.includes('React Router Future Flag')).slice(0, 6));
P.kill();
```

</details>

<details><summary><code>pm2.mjs</code></summary>

```js
// Modo simulado: repetición de M.3 (ME), M.4 (historial) y M.5 (USER-<n>) con esperas y comparación campo a campo.
import { launch, wait } from './lib.mjs';
import { FICHA } from './ficha.mjs';
import { log, READY } from './common.mjs';
const DEV = 'http://localhost:5193';
const P = await launch(9592, './prof-mock2'); await P.setWidth(1280);
await P.go(`${DEV}/login`); await P.waitFor(`document.querySelector('input[type=email]')`);
await P.fill('input[type=email]', 'demo@teammatchup.gg'); await P.fill('input[type=password]', 'demo1234');
await P.evaluate(`document.querySelector('form.access button[type=submit]').click(), true`); await P.waitFor(`location.pathname !== '/login'`, 20000); await wait(600);
for (const raw of ['ME', 'user-999999', 'abc']) {
  await P.go(`${DEV}/inicio`); await wait(500);
  await P.go(`${DEV}/jugadores/${raw}`); await P.waitFor(`/Este jugador no existe/.test(document.querySelector('main')?.innerText ?? '')`, 15000); await wait(800);
  const t = await P.text('main');
  log(`M.3 /jugadores/${raw} → "Este jugador no existe" (RF-9, RF-15; P43)`, t.includes('Este jugador no existe') && !t.includes('Cruce'), t.replace(/\n+/g, ' / '));
}
for (const raw of ['user-1', 'USER-1', 'me']) {
  await P.go(`${DEV}/inicio`); await wait(400);
  const i0 = (await P.history()).currentIndex;
  await P.go(`${DEV}/jugadores/${raw}`); await P.waitFor(`location.pathname === '/perfil'`, 10000); await wait(400);
  const h = (await P.history()).urls.slice(i0).map((u) => u.replace(DEV, ''));
  await P.back(); await wait(600);
  log(`M.4 /jugadores/${raw} → perfil; "Atrás" no vuelve a la ficha (RF-15; P43)`, h.join() === '/inicio,/perfil' && (await P.url()) === '/inicio', { historial: h, trasAtrás: await P.url() });
}
const snap = async (raw) => { await P.go(`${DEV}/jugadores/${raw}?juego=lol`); await P.waitFor(READY + ` && document.querySelector('.player-distance strong')`, 20000); await wait(1500); const f = await P.evaluate(FICHA); delete f.url; return f; };
const a = await snap('user-2'), b = await snap('USER-2');
const diff = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => ({ campo: k, 'user-2': a[k], 'USER-2': b[k] }));
log('M.5 /jugadores/USER-2 abre la ficha de user-2 con los mismos datos (RF-11; P49)', diff.length === 0, diff.length ? diff : { h1: b.h1, url: await P.url() });
log('M.6 peticiones a /api/', P.requests.filter((r) => r.url.includes('/api/')).length === 0, P.requests.filter((r) => r.url.includes('/api/')).length);
P.kill();
```

</details>

<details><summary><code>ranks.ts</code> (rango simulado de la lectura 0 de los identificadores de ejemplo; <code>node ranks.ts</code>)</summary>

```ts
import { stepAt, canonicalHandle, isVerified } from '/Users/cony/Developer/universidad/apps-web/TeamMatchUp-Activo/backend/src/domain/rankSimulator.ts';
import { normalizeStep, ladder } from '/Users/cony/Developer/universidad/apps-web/TeamMatchUp-Activo/backend/src/domain/rankScale.ts';
const ids: Record<string, string[]> = {
  lol: ['jugador1#las', 'jugador2#las', 'Jugador3#LAS', 'jugador4#las'],
  r6: ['jugador1', 'jugador2', 'jugador3', 'jugador4'],
  cs2: ['76561190000000001', '76561190000000002', '76561190000000003', '76561190000000004'],
};
for (const g of Object.keys(ids)) for (const h of ids[g]) {
  const c = canonicalHandle(h); const s = stepAt(g as any, c, 0);
  console.log(g, h, 'step', s, ladder(g as any)[s]?.tier ?? '', ladder(g as any)[s]?.division ?? '', 'norm', normalizeStep(g as any, s), 'verified', isVerified(c));
}
```

Salida:

```
lol jugador1#las step 22 Emerald II norm 73 verified true
lol jugador2#las step 19 Platinum I norm 63 verified false
lol Jugador3#LAS step 12 Gold IV norm 40 verified true
lol jugador4#las step 13 Gold III norm 43 verified false
r6 jugador1 step 28 Emerald II norm 80 verified false
r6 jugador2 step 5 Bronze V norm 14 verified true
r6 jugador3 step 23 Platinum II norm 66 verified false
r6 jugador4 step 12 Silver III norm 34 verified true
cs2 76561190000000001 step 5 Red  norm 83 verified true
cs2 76561190000000002 step 3 Purple  norm 50 verified false
cs2 76561190000000003 step 6 Gold  norm 100 verified true
cs2 76561190000000004 step 5 Red  norm 83 verified false
```

</details>

## 5. T11 — Corrección de D10-3 (textos a `copy.ts`) y O-1 (2026-10-20)

### 5.1 Paso 1: inventario (antes de tocar nada)

`grep -rnF -- "<texto>" frontend/src` de cada texto de la tabla del plan 4.6 y
`grep -rnE 'Δ \$?\{' frontend/src`, sobre el árbol de trabajo (rama `marselo`, `d08b393` más
los cambios sin versionar de T1–T10). Resultados fuera de comentarios (los comentarios se
anotan como tales):

| Texto | Resultados de interfaz | Comentarios / otros |
| --- | --- | --- |
| `Juegos` | `PlayerGamesSection.tsx:58` (h2), `:110` (`label`); fuera de `features/players`: `LandingPage.tsx:132` ("Juegos soportados"), `ProfilePage.tsx:77` y `:132` ("Juegos vinculados"): otros textos, fuera de alcance; el "Hecho cuando" de `Juegos` se limita a `features/players` | `SessionDraftSlip.tsx:31`, `LinkAccountForm.tsx:12` (JSDoc) |
| `Juegos del jugador` | `PlayerGamesSection.tsx:110` | — |
| `Cruce con tu perfil` | `PlayerPage.tsx:127`, `:196` | — |
| `Distancia de rango` | `RankDistanceBlock.tsx:40` | `RankDistanceBlock.tsx:21`, `types.ts:87`, `matching.ts:43` (comentarios) |
| `Horas en común` | `SharedHoursBlock.tsx:50`, `HoursSheet.tsx:136`; **`app/pages/CrossingVisual.tsx:23`** (`label: 'Horas en común'`, que se pinta en `:129` dentro de `<motion.span className="crossing__tag …">` de la portada); además contienen el texto `MatchFiltersPanel.tsx:75` ("Horas en común por semana", rótulo del filtro) y `services/mock/mockApi.ts:192` (mensaje de error del mock «Horas en común por semana») | `SharedHoursBlock.tsx:26` (JSDoc) |
| `'hora'` / `'horas'` | `MatchEntry.tsx:110`, `SharedHoursBlock.tsx:72` (también `grep -rnE "'horas?'"`: solo esos dos) | — |
| `en común` | en `features/players`: `SharedHoursBlock.tsx:50`, `:72` | `PlayerPage.tsx:123`, `SharedHoursBlock.tsx:26`, `:30` (comentarios); el resto, fuera de `features/players` (alcance del "Hecho cuando" limitado a esa carpeta) |
| `se inscribió` | `PlayerHeader.tsx:23`, `ProfilePage.tsx:65` | — |
| `Posición en la escala del juego` | `GameSummaryPanel.tsx:61` | — |
| `lectura registrada` / `lecturas registradas` | `GameSummaryPanel.tsx:66`, `:67` | — |
| `Primera lectura:` | `GameSummaryPanel.tsx:86` | — |
| `Últimas partidas` | `GameSummaryPanel.tsx:98` | — |
| `ganadas` | `GameSummaryPanel.tsx:102` | — |
| `Δ {…}` | `RankDistanceBlock.tsx:84`, `MatchEntry.tsx:99` | — |

Nombres propuestos en `copy.ts` (`PLAYER_GAMES_TITLE`, `PLAYER_GAMES_TABS_LABEL`,
`PLAYER_CROSS_TITLE`, `RANK_DISTANCE_TITLE`, `SHARED_HOURS_TITLE`, `HOUR_UNIT`,
`SHARED_HOURS_SUFFIX`, `JOINED_TEXT`, `SCALE_POSITION_LABEL`, `READINGS_UNIT`,
`FIRST_READING_LABEL`, `RECENT_MATCHES_TITLE`, `WIN_RATE_SUFFIX`, `rankDistanceText`):
`grep -rnw` en `frontend/src` → 0 resultados cada uno; ningún choque. `copy.ts` no tiene
imports.

**Parada (paso 1).** El literal de interfaz `Horas en común` aparece en un archivo que la tabla
del plan 4.6 no lista: `frontend/src/app/pages/CrossingVisual.tsx:23` (etiqueta del círculo
"horario" de la figura de la portada, visible en `:129`). Con él, el "Hecho cuando" (1) de T11
(`grep -rnF "Horas en común" frontend/src` → fuera de comentarios, solo `copy.ts`, sin
excepciones) no se puede cumplir tocando solo los archivos listados. Por el mismo `grep` salen
también, como parte de textos más largos, `MatchFiltersPanel.tsx:75` ("Horas en común por
semana", rótulo del filtro de coincidencias) y `mockApi.ts:192` (mensaje del mock que copia el
del servidor, spec 005). Según el paso 1, T11 **se detiene aquí sin cambiar nada**: no se
hicieron capturas, sustituciones ni el cambio de O-1. Falta que el usuario decida el alcance
(por ejemplo: incluir `CrossingVisual.tsx` con `SHARED_HOURS_TITLE`; o excluirlo y anotar la
excepción en el "Hecho cuando"; y cómo tratar los dos textos que solo contienen la cadena).

**Reanudación (decisión del usuario 2026-10-20, P67: "Incluir la portada").** `CrossingVisual.tsx:23`
pasa a `SHARED_HOURS_TITLE`; "Horas en común por semana" (`MatchFiltersPanel.tsx:75`) y el mensaje
de `mockApi.ts:192` son textos distintos y no se tocan. No apareció ningún otro literal fuera de
la lista.

### 5.2 Pasos 2 a 5: capturas, sustitución, O-1 y comparación

- Entorno: modo simulado, `VITE_USE_MOCK_API=true VITE_PROXY_TARGET=http://localhost:3999 npx vite
  --port 5193`; Chrome headless por CDP (arnés `lib.mjs` de 4.9), perfil nuevo por ancho y cuenta
  demo. Script `snap.mjs` (scratchpad `t11/`, no versionado): portada sin sesión, coincidencias
  (LoL) con el cajón de la primera fila abierto (Fernanda Soto), su ficha
  `/jugadores/user-9?juego=lol` y el perfil, a 1280 y 360 px. Capturas en
  `validation/before/t11-*` y `validation/after/t11-*` (portada, coincidencias-cajon, ficha,
  perfil × 1280/360). Volcado: `innerText` de `main` y `aria-label`, `aria-labelledby` (con su
  texto resuelto), `aria-describedby` y `title` de todo `main`; en la portada, las tres etiquetas
  de la figura.
- Formas singulares/plurales: se ve "1 lectura registrada" (ficha y perfil); no hay ninguna fila
  ni ficha con exactamente 1 hora en común ni cuenta con varias lecturas: "hora" y "lecturas
  registradas" se revisan en el diff (`HOUR_UNIT = { one: 'hora', other: 'horas' }`,
  `READINGS_UNIT = { one: 'lectura registrada', other: 'lecturas registradas' }`, mismos
  argumentos de `pluralize` que antes).
- Sustitución: la del paso 3 más la portada (P67). Para no cambiar ni el DOM, cada texto que antes
  formaba un solo nodo con sus espacios sigue siendo un solo nodo: `` {` · ${JOINED_TEXT} `} ``
  (ficha y perfil), `` {` ${SHARED_HOURS_SUFFIX}`} ``, `` {` ${WIN_RATE_SUFFIX}`} `` y
  `` {` ${SHARED_HOURS_TITLE}`} `` (leyenda de `HoursSheet`). Una primera versión con
  `{JOINED_TEXT} ` partía el nodo y cambiaba el suavizado de la línea "se inscribió" (≤ 46/255 en
  ~140 px); con el nodo único, el perfil queda idéntico.
- **Volcado antes/después: `diff t11-before.txt t11-after.txt` → vacío** (1293 líneas cada uno;
  consola sin errores ni avisos en las dos pasadas, salvo los de React Router que se filtran).
- **Capturas** (SHA-256): iguales byte a byte portada 1280/360, coincidencias con cajón 1280/360 y
  perfil 1280/360. Ficha 1280 y 360: distintas en 105 y 122 px con diferencia > 8/255 (máx. 44 y
  46/255), todos en la parte de abajo del texto "Datos de demostración" que va junto a "Δ 0 pts".
  Causa medida: `rankDistanceText` deja "Δ 0 pts" en un nodo de texto (antes eran tres: "Δ ", n y
  " pts"); el `<strong>` pasa de 70,265625 a 70,25 px (1/64 px) y la etiqueta se desplaza esa
  fracción. Sin diferencia visible (recortes ampliados ×8 iguales a la vista). En coincidencias el
  ancho no cambia (150 px fijos). Una tercera pasada daba las mismas capturas byte a byte que la
  segunda: las capturas son deterministas, no es ruido.
- O-1: `hooks.ts:13` → "las 6 consultas".

**"Hecho cuando".** (1) `grep -rnF` fuera de comentarios solo en `copy.ts` (uno por texto) para
"Juegos del jugador", "Cruce con tu perfil", "Distancia de rango" (comentarios:
`RankDistanceBlock.tsx:26`, `copy.ts:111`, `types.ts:87`, `matching.ts:43`), "se inscribió"
(comentario `copy.ts:101`), "Posición en la escala del juego", "lectura registrada", "lecturas
registradas", "Primera lectura:", "Últimas partidas" y "ganadas". "Horas en común": como literal
completo solo `copy.ts:93`; contienen la cadena `MatchFiltersPanel.tsx:75` y `mockApi.ts:192`
(textos distintos, P67) y `SharedHoursBlock.tsx:32` (comentario). `grep -rn Juegos
features/players` → 0; `grep -rn "en común" features/players` → solo comentarios
(`SharedHoursBlock.tsx:32`, `:36`, `PlayerPage.tsx:123`). `grep -rnE "'horas?'"` → solo
`copy.ts:96`. `grep -rnE 'Δ \$?\{'` → solo `rankDistanceText` en `copy.ts:112`, importada por
`RankDistanceBlock.tsx` y `MatchEntry.tsx`. (2) Volcado vacío; capturas iguales salvo la ficha
(1/64 px, anotado arriba). (3) `hooks.ts` dice "6 consultas"; "7 consultas" → 0 en
`features/players`. (4) El diff de T11 (contra el estado previo de los archivos, ya que muchos
están sin versionar desde T1–T10) toca solo los 12 archivos de la lista más `CrossingVisual.tsx`
(P67): literales, imports, constantes y `rankDistanceText` en `copy.ts` y el comentario de O-1.
(5) `npm run typecheck` 0, `npm run lint` 0, `npm run build` 0; modo simulado sin errores de
consola. **D10-3 y O-1 resueltos** (4.8).
