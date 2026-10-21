# Validación 009 — Detalle de sesión
Fecha de creación: 2026-10-20 · Commit base: b0894e9 (rama `marselo`) · Node: v20.20.2

## Condición previa (T0)
Cumplida el 2026-10-20: plan 007 aprobado e implementado (T1–T31), 007 T1–T26 `[x]`, 008 T9
`[x]`, y las piezas del plan 009, sección 0, presentes. Detalle en `tasks.md`, T0 («Resultado»).

## Comprobaciones con Node

### T1 — `isValidSessionTitle`, `validateSessionEdit` y `SESSION_ERRORS` (2026-10-20)
Node v20.20.2 no carga TypeScript, así que el script compila `sessionRules.ts` con el esbuild
del frontend (`--bundle --format=esm`) y ejecuta los casos con `node:test`. El módulo no
tiene imports de valor, por lo que no hace falta el gancho de resolución de la 007.

Script (`scratchpad/t1/check.mjs`, no se versiona):
```js
// T1 · 009 · isValidSessionTitle y validateSessionEdit (plan 009, tabla 7.1)
// Uso: node check.mjs   (compila frontend/src/domain/sessionRules.ts con esbuild)
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/seba/Universidad/Reactivas/proyecto';
const OUT = new URL('./sessionRules.bundle.mjs', import.meta.url).pathname;
execFileSync(`${ROOT}/frontend/node_modules/.bin/esbuild`,
  [`${ROOT}/frontend/src/domain/sessionRules.ts`, '--bundle', '--format=esm', `--outfile=${OUT}`], { stdio: 'inherit' });
const m = await import(pathToFileURL(OUT).href);

const E = '🎮';
test('isValidSessionTitle: false', () => {
  for (const t of ['ab', '  ab  ', '\u3000ab\u3000', '', '   ', 'Ranked\tnoche', 'Ranked\u0085noche',
    'Ranked noche\u0085', 'Ranked\u2028noche', E.repeat(61)])
    assert.equal(m.isValidSessionTitle(t), false, JSON.stringify(t));
});
test('isValidSessionTitle: true', () => {
  for (const t of ['\tRanked\t', 'Ranked\n', ' Ranked\uFEFF', ' Ranked ', 'Ranked noche', '\u00A0Ranked\u00A0',
    E.repeat(60), '\u200Bab'])
    assert.equal(m.isValidSessionTitle(t), true, JSON.stringify(t));
});
test('validateSessionEdit', () => {
  const ok = (b, v) => assert.deepEqual(m.validateSessionEdit(b), { ok: true, value: v }, JSON.stringify(b));
  const bad = (b, e) => assert.deepEqual(m.validateSessionEdit(b), { ok: false, status: 400, error: e }, JSON.stringify(b));
  ok({}, {});
  ok(undefined, {});
  ok({ slots: 3 }, { slots: 3 });
  ok({ notes: '' }, { notes: '' });
  ok({ gameId: 'xyz', hostId: 'x' }, {});
  ok({ title: '  Ranked  ' }, { title: 'Ranked' });
  bad({ title: null }, 'El título debe tener entre 3 y 60 caracteres.');
  bad({ title: '' }, 'El título debe tener entre 3 y 60 caracteres.');
  bad({ notes: null }, 'Las notas deben ser texto de hasta 160 caracteres.');
  bad({ day: '3' }, 'Día no válido: usa un entero de 0 (lunes) a 6 (domingo).');
  bad({ title: 'ab', notes: 5 }, 'El título debe tener entre 3 y 60 caracteres.');
});
test('SESSION_ERRORS literales', () => {
  assert.deepEqual(m.SESSION_ERRORS, {
    title: 'El título debe tener entre 3 y 60 caracteres.',
    notes: 'Las notas deben ser texto de hasta 160 caracteres.',
    day: 'Día no válido: usa un entero de 0 (lunes) a 6 (domingo).',
    startHour: 'Hora de inicio no válida: usa un entero de 0 a 23.',
    durationHours: 'Duración no válida: usa un entero de 1 a 4 horas.',
    slots: 'Cupos no válidos: usa un entero de 2 a 6.',
    slotsBelowParticipants: 'No puedes dejar menos cupos que jugadores inscritos.',
    notFound: 'Sesión no encontrada.',
    notHostEdit: 'Solo quien organiza puede editar la sesión.',
    notHostCancel: 'Solo quien organiza puede cancelar la sesión.',
    alreadyJoined: 'Ya estás inscrito en esta sesión.',
    full: 'Esta sesión ya no admite jugadores.',
    hostLeave: 'Eres quien organiza: cancela la sesión en lugar de salir.',
    notJoined: 'No estás inscrito en esta sesión.',
    badId: 'id con formato inválido',
    badJson: 'JSON mal formado',
  });
  assert.equal(m.TITLE_MAX_LENGTH, 60);
  assert.equal(m.NOTES_MAX_LENGTH, 160);
});
```

Salida roja (módulo sin crear):
```
✘ [ERROR] Could not resolve "/Users/seba/Universidad/Reactivas/proyecto/frontend/src/domain/sessionRules.ts"

1 error
node:internal/errors:984
  const err = new Error(message);
              ^
```

Salida verde:
```

  ...-6191-43ae-a90b-a0edfc492d8c/scratchpad/t1/sessionRules.bundle.mjs  4.1kb

⚡ Done in 1ms
TAP version 13
# Subtest: isValidSessionTitle: false
ok 1 - isValidSessionTitle: false
  ---
  duration_ms: 0.808334
  ...
# Subtest: isValidSessionTitle: true
ok 2 - isValidSessionTitle: true
  ---
  duration_ms: 0.068792
  ...
# Subtest: validateSessionEdit
ok 3 - validateSessionEdit
  ---
  duration_ms: 0.681375
  ...
# Subtest: SESSION_ERRORS literales
ok 4 - SESSION_ERRORS literales
  ---
  duration_ms: 0.126334
  ...
1..4
# tests 4
# suites 0
# pass 4
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 6.178084
```

Verificación estándar: `cd frontend && npm run typecheck && npm run lint && npm run build` en
verde (exit 0).

### T2 — `limitToCodePoints` (2026-10-20)
Mismo método que T1 (esbuild + `node:test`, Node v20.20.2). Script `scratchpad/t2/check.mjs` (no se versiona):
```js
// T2 · 009 · limitToCodePoints (plan 009, tabla 7.1 y 4.7). Valor y cursor de cada caso.
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/seba/Universidad/Reactivas/proyecto';
const OUT = new URL('./sessionRules.bundle.mjs', import.meta.url).pathname;
execFileSync(`${ROOT}/frontend/node_modules/.bin/esbuild`,
  [`${ROOT}/frontend/src/domain/sessionRules.ts`, '--bundle', '--format=esm', `--outfile=${OUT}`], { stdio: 'inherit' });
const m = await import(pathToFileURL(OUT).href);

const E = '🎮', FLAG = '🇨🇱', THUMB = '👍🏽';
const L = (n) => 'a'.repeat(n);
const X = (n) => 'x'.repeat(n);
const cur = (n) => ({ start: n, end: n });
// ins(anterior, [s, e], insertado, max): next = anterior.slice(0, s) + insertado + anterior.slice(e)
const ins = (prev, [s, e], text, max = 60) =>
  m.limitToCodePoints({ previous: prev, next: prev.slice(0, s) + text + prev.slice(e), selection: { start: s, end: e } }, max);
const is = (r, value, selection) => assert.deepEqual(r, { value, selection });

test('sin pasar del límite', () => {
  is(ins('', [0, 0], 'Ranked'), 'Ranked', null);
  is(ins('', [0, 0], E.repeat(60)), E.repeat(60), null);
});
test('pegar al final, al principio y en medio', () => {
  is(ins('Ranked', [6, 6], L(70)), 'Ranked' + L(54), cur(60));
  is(ins('Ranked noche', [0, 0], X(70)), X(48) + 'Ranked noche', cur(48));
  is(ins('Ranked noche', [6, 6], X(70)), 'Ranked' + X(48) + ' noche', cur(54));
});
test('sustituyendo una selección', () => {
  is(ins(L(60), [10, 20], X(15)), L(10) + X(10) + L(40), cur(20));
});
test('notas con 160', () => {
  is(ins('', [0, 0], L(200), 160), L(160), cur(160));
  is(ins('', [0, 0], E.repeat(161), 160), E.repeat(160), cur(320));
});
test('emojis en el límite', () => {
  is(ins(L(59), [59, 59], E + E), L(59) + E, cur(61));
  is(ins(L(58), [29, 29], E + E + E), L(29) + E + E + L(29), cur(33));
  is(ins(L(59), [59, 59], FLAG), L(59), cur(59));
  is(ins(L(58), [58, 58], FLAG), L(58) + FLAG, null);
  is(ins(L(59), [59, 59], THUMB), L(59), cur(59));
});
test('sin hueco', () => {
  is(ins(E.repeat(60), [120, 120], 'a'), E.repeat(60), cur(120));
  is(ins(L(60), [5, 8], 'x'), L(5) + 'x' + L(52), null);
});
test('valor del servidor que ya pasa (R13)', () => {
  is(m.limitToCodePoints({ previous: L(65), next: L(64), selection: { start: 64, end: 65 } }, 60), L(64), null);
  is(ins(L(65), [10, 10], 'a'), L(65), cur(10));
  const r = ins(L(65), [0, 3], 'a');
  assert.equal([...r.value].length, 63);
  is(ins(L(65), [0, 1], 'abc'), L(65), { start: 0, end: 1 });
});
test('inserción no reconocible', () => {
  is(m.limitToCodePoints({ previous: L(60), next: L(61), selection: null }, 60), L(60), null);
  is(m.limitToCodePoints({ previous: L(60), next: L(61), selection: cur(130) }, 60), L(60), cur(130));
  const prev = 'a' + E + 'b'; // 4 unidades UTF-16; el índice 2 cae entre las dos mitades del emoji
  const next = prev.slice(0, 2) + 'xx' + prev.slice(2);
  is(m.limitToCodePoints({ previous: prev, next, selection: cur(2) }, 3), prev, cur(2));
});
test('next sin el prefijo y sufijo esperados', () => {
  is(m.limitToCodePoints({ previous: L(59), next: L(59) + 'bb', selection: cur(10) }, 60), L(59), cur(10));
});
```

Salida roja (función sin implementar; resumen):
```
   9   name: 'TypeError'
   1 # fail 9
   1 # pass 0
   1 not ok 1 - sin pasar del límite
   1 not ok 2 - pegar al final, al principio y en medio
   1 not ok 3 - sustituyendo una selección
   1 not ok 4 - notas con 160
   1 not ok 5 - emojis en el límite
   1 not ok 6 - sin hueco
   1 not ok 7 - valor del servidor que ya pasa (R13)
   1 not ok 8 - inserción no reconocible
   1 not ok 9 - next sin el prefijo y sufijo esperados
```

Salida verde:
```

  ...-6191-43ae-a90b-a0edfc492d8c/scratchpad/t2/sessionRules.bundle.mjs  5.7kb

⚡ Done in 1ms
TAP version 13
# Subtest: sin pasar del límite
ok 1 - sin pasar del límite
  ---
  duration_ms: 0.7555
  ...
# Subtest: pegar al final, al principio y en medio
ok 2 - pegar al final, al principio y en medio
  ---
  duration_ms: 6.286333
  ...
# Subtest: sustituyendo una selección
ok 3 - sustituyendo una selección
  ---
  duration_ms: 0.07025
  ...
# Subtest: notas con 160
ok 4 - notas con 160
  ---
  duration_ms: 0.195041
  ...
# Subtest: emojis en el límite
ok 5 - emojis en el límite
  ---
  duration_ms: 0.262875
  ...
# Subtest: sin hueco
ok 6 - sin hueco
  ---
  duration_ms: 0.063958
  ...
# Subtest: valor del servidor que ya pasa (R13)
ok 7 - valor del servidor que ya pasa (R13)
  ---
  duration_ms: 0.084625
  ...
# Subtest: inserción no reconocible
ok 8 - inserción no reconocible
  ---
  duration_ms: 0.054625
  ...
# Subtest: next sin el prefijo y sufijo esperados
ok 9 - next sin el prefijo y sufijo esperados
  ---
  duration_ms: 0.35925
  ...
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 13.133792
```

Nota: en la primera pasada verde, el caso 7 falló por un error del propio script (esperaba un cursor donde la selección devuelta es `{0,1}`); se corrigió el script, no el código.

### T3 — `sessionDetail.ts`, primera parte (2026-10-20)
Mismo método que T1 (esbuild + `node:test`, Node v20.20.2). Script `scratchpad/t3/check.mjs` (no se versiona):
```js
// T3 · 009 · sessionDetail.ts primera parte (plan 009, tabla 7.1)
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/seba/Universidad/Reactivas/proyecto';
const OUT = new URL('./sessionDetail.bundle.mjs', import.meta.url).pathname;
execFileSync(`${ROOT}/frontend/node_modules/.bin/esbuild`,
  [`${ROOT}/frontend/src/domain/sessionDetail.ts`, '--bundle', '--format=esm', `--outfile=${OUT}`], { stdio: 'inherit' });
const m = await import(pathToFileURL(OUT).href);

const person = (id) => ({ id, username: id, displayName: id, avatarColor: '#000' });
const session = (o = {}) => ({
  id: 'session-1', gameId: 'lol', hostId: 'h', host: person('h'), title: 'Ranked noche', notes: '',
  day: 0, startHour: 20, durationHours: 2, slots: 4,
  participants: [person('h'), person('a'), person('b')], status: 'open', createdAt: '2026-10-18T00:00:00.000Z', ...o,
});
const full = () => session({ status: 'full' });

test('detailRole / detailActions', () => {
  assert.equal(m.detailRole(session(), 'h'), 'host');
  assert.equal(m.detailRole(session(), 'a'), 'member');
  assert.equal(m.detailRole(session(), 'z'), 'outsider');
  assert.deepEqual(m.detailActions(session(), 'h'), { kind: 'host' });
  assert.deepEqual(m.detailActions(session(), 'a'), { kind: 'leave' });
  assert.deepEqual(m.detailActions(session(), 'z'), { kind: 'join', blocked: false });
  assert.deepEqual(m.detailActions(full(), 'z'), { kind: 'join', blocked: true });
});
test('formatSessionRange', () => {
  assert.equal(m.formatSessionRange({ day: 0, startHour: 23, durationHours: 4 }), 'Lunes · 23:00–03:00');
  assert.equal(m.formatSessionRange({ day: 6, startHour: 22, durationHours: 2 }), 'Domingo · 22:00–00:00');
});
test('openSlotCount / occupancy', () => {
  assert.equal(m.openSlotCount(full()), 0);
  assert.deepEqual(m.occupancy(full()), { taken: 3, total: 4 });
  assert.equal(m.openSlotCount(session()), 1);
  assert.deepEqual(m.occupancy(session()), { taken: 3, total: 4 });
  assert.equal(m.openSlotCount(session({ slots: 2, participants: [person('h')] })), 1);
});
test('slotRange / slotOptions', () => {
  assert.deepEqual(m.slotRange(full()), { min: 4, max: 6 });
  assert.deepEqual(m.slotRange(session()), { min: 3, max: 6 });
  assert.deepEqual(m.slotRange(session({ participants: [person('h')] })), { min: 2, max: 6 });
  assert.deepEqual(m.slotOptions({ min: 4, max: 6 }), [4, 5, 6]);
  assert.deepEqual(m.slotOptions({ min: 3, max: 6 }), [3, 4, 5, 6]);
  assert.deepEqual(m.slotOptions({ min: 7, max: 6 }), [6]);
});
test('adjustSlots / rebaseEditForm', () => {
  assert.equal(m.adjustSlots(2, { min: 3, max: 6 }), 3);
  assert.equal(m.adjustSlots(5, { min: 3, max: 6 }), 5);
  const v = { title: '  x  ', notes: 'n', day: 2, startHour: 20, durationHours: 3, slots: 2 };
  assert.deepEqual(m.rebaseEditForm(v, session()), { ...v, slots: 3 });
  assert.deepEqual(m.rebaseEditForm({ ...v, slots: 5 }, session()), { ...v, slots: 5 });
});
test('editFormInitial', () => {
  const s = session({ title: '  Ranked  ', notes: ' n ' });
  assert.deepEqual(m.editFormInitial(s),
    { title: '  Ranked  ', notes: ' n ', day: 0, startHour: 20, durationHours: 2, slots: 4 });
});
test('startHourOptions', () => {
  const grid = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];
  assert.deepEqual(m.startHourOptions(20), grid);
  assert.deepEqual(m.startHourOptions(5), [...grid, 5]);
});
test('checkEditForm', () => {
  const s = session({ startHour: 20 });
  const base = m.editFormInitial(s);
  const bad = (v, sess, field, error) =>
    assert.deepEqual(m.checkEditForm(v, sess), { ok: false, field, error }, JSON.stringify([field, error]));
  assert.deepEqual(m.checkEditForm(base, s), { ok: true });
  bad({ ...base, title: 'ab' }, s, 'title', 'El título debe tener entre 3 y 60 caracteres.');
  assert.deepEqual(m.checkEditForm({ ...base, title: '🎮'.repeat(60) }, s), { ok: true });
  bad({ ...base, notes: 'a'.repeat(161) }, s, 'notes', 'Las notas deben ser texto de hasta 160 caracteres.');
  bad({ ...base, day: 7 }, s, 'day', 'Día no válido: usa un entero de 0 (lunes) a 6 (domingo).');
  bad({ ...base, startHour: 5 }, s, 'startHour', 'Hora de inicio no válida: usa un entero de 0 a 23.');
  assert.deepEqual(m.checkEditForm({ ...base, startHour: 5 }, session({ startHour: 5 })), { ok: true });
  bad({ ...base, durationHours: 5 }, s, 'durationHours', 'Duración no válida: usa un entero de 1 a 4 horas.');
  bad({ ...base, slots: 7 }, s, 'slots', 'Cupos no válidos: usa un entero de 2 a 6.');
  bad({ ...base, slots: 2 }, s, 'slots', 'No puedes dejar menos cupos que jugadores inscritos.');
  bad({ ...base, slots: 3 }, full(), 'slots', 'No puedes dejar menos cupos que jugadores inscritos.');
  bad({ ...base, title: 'ab', day: 7 }, s, 'title', 'El título debe tener entre 3 y 60 caracteres.');
  bad({ ...base, day: 7, slots: 7 }, s, 'day', 'Día no válido: usa un entero de 0 (lunes) a 6 (domingo).');
});
test('toEditPayload', () => {
  const v = { title: '  Ranked  ', notes: ' n ', day: 1, startHour: 20, durationHours: 2, slots: 4 };
  assert.deepEqual(m.toEditPayload(v), v);
  assert.deepEqual(Object.keys(m.toEditPayload(v)).sort(),
    ['day', 'durationHours', 'notes', 'slots', 'startHour', 'title']);
});
```

Salida roja (módulo sin crear):
```
✘ [ERROR] Could not resolve "/Users/seba/Universidad/Reactivas/proyecto/frontend/src/domain/sessionDetail.ts"
```

Salida verde:
```

  ...6191-43ae-a90b-a0edfc492d8c/scratchpad/t3/sessionDetail.bundle.mjs  5.8kb

⚡ Done in 1ms
TAP version 13
# Subtest: detailRole / detailActions
ok 1 - detailRole / detailActions
  ---
  duration_ms: 0.74925
  ...
# Subtest: formatSessionRange
ok 2 - formatSessionRange
  ---
  duration_ms: 0.074792
  ...
# Subtest: openSlotCount / occupancy
ok 3 - openSlotCount / occupancy
  ---
  duration_ms: 0.079916
  ...
# Subtest: slotRange / slotOptions
ok 4 - slotRange / slotOptions
  ---
  duration_ms: 0.091083
  ...
# Subtest: adjustSlots / rebaseEditForm
ok 5 - adjustSlots / rebaseEditForm
  ---
  duration_ms: 0.121917
  ...
# Subtest: editFormInitial
ok 6 - editFormInitial
  ---
  duration_ms: 0.054708
  ...
# Subtest: startHourOptions
ok 7 - startHourOptions
  ---
  duration_ms: 0.056625
  ...
# Subtest: checkEditForm
ok 8 - checkEditForm
  ---
  duration_ms: 0.430792
  ...
# Subtest: toEditPayload
ok 9 - toEditPayload
  ---
  duration_ms: 0.112875
  ...
1..9
# tests 9
# suites 0
# pass 9
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 7.394416
```

### T4 — `classifyResponse` y `sessionList.ts` (2026-10-20)
Mismo método que T1 (esbuild + `node:test`, Node v20.20.2). Script `scratchpad/t4/check.mjs` (no se versiona):
```js
// T4 · 009 · classifyResponse, upsertSessionInList, removeSessionFromList (plan 009, 3 y 7.1)
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/seba/Universidad/Reactivas/proyecto/frontend';
async function load(name) {
  const out = new URL(`./${name}.bundle.mjs`, import.meta.url).pathname;
  execFileSync(`${ROOT}/node_modules/.bin/esbuild`,
    [`${ROOT}/src/domain/${name}.ts`, '--bundle', '--format=esm', `--outfile=${out}`], { stdio: 'inherit' });
  return import(pathToFileURL(out).href);
}
const detail = await load('sessionDetail');
const list = await load('sessionList');

const r = (status, hasMessage) => ({ ok: false, status, hasMessage });
const c = (kind, resp) => detail.classifyResponse(kind, resp);

test('classifyResponse: load', () => {
  assert.equal(c('load', { ok: true }), 'success');
  for (const s of [400, 404]) assert.equal(c('load', r(s, true)), 'empty', `load ${s}`);
  for (const [s, h] of [[403, true], [500, true], [500, false], [0, false], [409, true]])
    assert.equal(c('load', r(s, h)), 'pageError', `load ${s} ${h}`);
  assert.equal(c('load', r(401, true)), 'session');
});
test('classifyResponse: reread', () => {
  assert.equal(c('reread', { ok: true }), 'success');
  assert.equal(c('reread', r(404, true)), 'empty');
  assert.equal(c('reread', r(400, true)), 'empty');
  for (const [s, h] of [[500, true], [500, false], [0, false], [403, true], [409, true]])
    assert.equal(c('reread', r(s, h)), 'keep', `reread ${s} ${h}`);
  assert.equal(c('reread', r(401, true)), 'session');
});
test('classifyResponse: action', () => {
  assert.equal(c('action', { ok: true }), 'success');
  assert.equal(c('action', r(404, true)), 'empty');
  for (const s of [409, 403, 400]) assert.equal(c('action', r(s, true)), 'messageAndReread', `action ${s}`);
  for (const [s, h] of [[400, false], [409, false], [403, false], [500, false], [500, true], [0, false]])
    assert.equal(c('action', r(s, h)), 'messageOnly', `action ${s} ${h}`);
  assert.equal(c('action', r(401, true)), 'session');
  assert.equal(c('action', r(401, false)), 'session');
});

const s = (id, gameId, day, startHour, createdAt = '2026-10-18T10:00:00.000Z') =>
  ({ id, gameId, day, startHour, createdAt, title: id });
const ids = (l) => l.map((x) => x.id);

test('upsertSessionInList: reemplazo en su lugar', () => {
  const l = [s('a', 'lol', 0, 20), s('b', 'lol', 1, 20), s('c', 'r6', 2, 20)];
  const edited = { ...s('b', 'lol', 1, 20), title: 'nuevo' };
  const out = list.upsertSessionInList(l, edited, 'all');
  assert.deepEqual(ids(out), ['a', 'b', 'c']);
  assert.equal(out[1].title, 'nuevo');
  assert.equal(l[1].title, 'b'); // no muta
});
test('upsertSessionInList: inserción ordenada en all y en su juego', () => {
  const l = [s('a', 'lol', 0, 20), s('c', 'lol', 2, 20)];
  assert.deepEqual(ids(list.upsertSessionInList(l, s('b', 'lol', 1, 20), 'all')), ['a', 'b', 'c']);
  assert.deepEqual(ids(list.upsertSessionInList(l, s('b', 'lol', 1, 20), 'lol')), ['a', 'b', 'c']);
  // empate de día y hora: antigua primero, luego id por punto de código
  const t = [s('x', 'lol', 1, 20, '2026-10-18T10:00:00.000Z')];
  assert.deepEqual(ids(list.upsertSessionInList(t, s('y', 'lol', 1, 20, '2026-10-18T09:00:00.000Z'), 'all')), ['y', 'x']);
  assert.deepEqual(ids(list.upsertSessionInList(t, s('w', 'lol', 1, 20, '2026-10-18T10:00:00.000Z'), 'all')), ['w', 'x']);
  assert.deepEqual(ids(list.upsertSessionInList(t, s('a', 'lol', 1, 19), 'all')), ['a', 'x']);
});
test('upsertSessionInList: sin cambios en otro filtro', () => {
  const l = [s('a', 'lol', 0, 20)];
  assert.equal(list.upsertSessionInList(l, s('b', 'r6', 1, 20), 'lol'), l);
  assert.deepEqual(ids(list.upsertSessionInList(l, s('b', 'r6', 1, 20), 'r6')), ['a', 'b']);
});
test('removeSessionFromList', () => {
  const l = [s('a', 'lol', 0, 20), s('b', 'lol', 1, 20)];
  assert.deepEqual(ids(list.removeSessionFromList(l, 'a')), ['b']);
  assert.deepEqual(ids(list.removeSessionFromList(l, 'zzz')), ['a', 'b']);
  assert.equal(l.length, 2);
});
```

Salida roja (`sessionList.ts` sin crear):
```
✘ [ERROR] Could not resolve "/Users/seba/Universidad/Reactivas/proyecto/frontend/src/domain/sessionList.ts"
```

Salida verde:
```

  ...6191-43ae-a90b-a0edfc492d8c/scratchpad/t4/sessionDetail.bundle.mjs  6.3kb

⚡ Done in 1ms

  ...8-6191-43ae-a90b-a0edfc492d8c/scratchpad/t4/sessionList.bundle.mjs  1.4kb

⚡ Done in 1ms
TAP version 13
# Subtest: classifyResponse: load
ok 1 - classifyResponse: load
  ---
  duration_ms: 0.547291
  ...
# Subtest: classifyResponse: reread
ok 2 - classifyResponse: reread
  ---
  duration_ms: 0.068542
  ...
# Subtest: classifyResponse: action
ok 3 - classifyResponse: action
  ---
  duration_ms: 0.107542
  ...
# Subtest: upsertSessionInList: reemplazo en su lugar
ok 4 - upsertSessionInList: reemplazo en su lugar
  ---
  duration_ms: 0.278
  ...
# Subtest: upsertSessionInList: inserción ordenada en all y en su juego
ok 5 - upsertSessionInList: inserción ordenada en all y en su juego
  ---
  duration_ms: 0.153417
  ...
# Subtest: upsertSessionInList: sin cambios en otro filtro
ok 6 - upsertSessionInList: sin cambios en otro filtro
  ---
  duration_ms: 0.046875
  ...
# Subtest: removeSessionFromList
ok 7 - removeSessionFromList
  ---
  duration_ms: 0.050667
  ...
1..7
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5.836208
```

Nota: `mockApi.ts` tiene su propio `compareSessions` privado (mismo orden). T4 no lo toca; se reutiliza `sessionList.compareSessions` cuando T5 modifique `mockApi.ts`.

### T5 — Contrato, cliente HTTP y backend simulado de obtener y editar (2026-10-20)
Node v20.20.2. Dos scripts desechables (no se versionan), ambos compilados con el esbuild del
frontend. (a) `mockSessionTarget.ts` (sin imports). (b) `mockApi.ts` con `@/` resuelto por
esbuild, `import.meta.env` definido (`VITE_MOCK_LATENCY=0`) y un `localStorage` en memoria
inyectado con `--banner`; el módulo cargó sin problemas.

Script (a) `scratchpad/t5/check-a.mjs`:
```js
// T5 (a) · 009 · resolveMockSessionId (plan 009, tabla 7.1). Módulo sin imports, cargado directo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/seba/Universidad/Reactivas/proyecto/frontend';
const OUT = new URL('./mockSessionTarget.bundle.mjs', import.meta.url).pathname;
execFileSync(`${ROOT}/node_modules/.bin/esbuild`,
  [`${ROOT}/src/services/mock/mockSessionTarget.ts`, '--bundle', '--format=esm', `--outfile=${OUT}`], { stdio: 'inherit' });
const { resolveMockSessionId, MOCK_SESSION_ID_PATTERN } = await import(pathToFileURL(OUT).href);

test('resolveMockSessionId', () => {
  assert.equal(resolveMockSessionId('SESSION-3'), 'session-3');
  assert.equal(resolveMockSessionId('Session-3'), 'session-3');
  assert.equal(resolveMockSessionId('session-3'), 'session-3');
  assert.equal(resolveMockSessionId('session-999999'), 'session-999999');
  for (const bad of ['abc', 'session-', ' session-3', 'session-3 ', 'session-3\n', '', 'session-x'])
    assert.equal(resolveMockSessionId(bad), null, JSON.stringify(bad));
  assert.equal(MOCK_SESSION_ID_PATTERN.source, '^session-[0-9]+$');
  assert.equal(MOCK_SESSION_ID_PATTERN.flags, 'i');
});
```
Rojo (a):
```
✘ [ERROR] Could not resolve "/Users/seba/Universidad/Reactivas/proyecto/frontend/src/services/mock/mockSessionTarget.ts"
```
Verde (a):
```

  ...-43ae-a90b-a0edfc492d8c/scratchpad/t5/mockSessionTarget.bundle.mjs  274b 

⚡ Done in 1ms
TAP version 13
# Subtest: resolveMockSessionId
ok 1 - resolveMockSessionId
  ---
  duration_ms: 0.507167
  ...
1..1
# tests 1
# suites 0
# pass 1
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3.590417
```

Script (b) `scratchpad/t5/check-b.mjs` (versión final):
```js
// T5 (b) · 009 · backend simulado (`mockApi`): sessions.get / update / join / leave / cancel.
// esbuild resuelve `@/`; `import.meta.env` se define y `localStorage` es un sustituto en memoria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/seba/Universidad/Reactivas/proyecto/frontend';
const OUT = new URL('./mockApi.bundle.mjs', import.meta.url).pathname;
const banner = `const __m = new Map(); globalThis.localStorage = { getItem: (k) => (__m.has(k) ? __m.get(k) : null), setItem: (k, v) => void __m.set(k, String(v)), removeItem: (k) => void __m.delete(k), clear: () => __m.clear() };`;
execFileSync(`${ROOT}/node_modules/.bin/esbuild`, [
  `${ROOT}/src/services/mock/mockApi.ts`, '--bundle', '--format=esm', '--platform=node', `--outfile=${OUT}`,
  `--tsconfig=${ROOT}/tsconfig.app.json`,
  '--define:import.meta.env={"VITE_MOCK_LATENCY":"0","VITE_USE_MOCK_API":"true"}',
  `--banner:js=${banner}`,
], { stdio: 'inherit' });
const { mockApi } = await import(pathToFileURL(OUT).href);
const api = mockApi;

const rejects = async (p, status, message) => {
  try { await p; } catch (e) {
    assert.equal(e.status, status, `status ${e.status} ${e.message}`);
    if (message !== undefined) assert.equal(e.message, message);
    return;
  }
  assert.fail(`se esperaba ${status}`);
};
const NF = 'Sesión no encontrada.';

test('sin sesión: 401', async () => {
  await rejects(api.sessions.get('session-3'), 401);
});

test('sessions.get / update / join / leave / cancel', async () => {
  const me = await api.auth.login({ email: 'demo@teammatchup.gg', password: 'demo1234' });
  const list = await api.sessions.list('all');
  const foreign = list.find((s) => s.hostId !== me.id && !s.participants.some((p) => p.id === me.id));
  const crowded = list.find((s) => s.hostId !== me.id && s.participants.length >= 3);
  assert.ok(foreign && crowded, 'la semilla tiene sesiones ajenas, una con 3 o más inscritos');

  // get
  assert.equal((await api.sessions.get('SESSION-3')).id, 'session-3');
  assert.equal((await api.sessions.get(foreign.id)).id, foreign.id);
  await rejects(api.sessions.get('abc'), 400, 'id con formato inválido');
  await rejects(api.sessions.get('session-999999'), 404, NF);

  // update ajeno: 403 antes que los datos; inexistente 404; formato 400; cuerpo no objeto 400
  await rejects(api.sessions.update(foreign.id, { title: 'ab' }), 403, 'Solo quien organiza puede editar la sesión.');
  await rejects(api.sessions.update('session-999999', { title: 'ab' }), 404, NF);
  await rejects(api.sessions.update('abc', {}), 400, 'id con formato inválido');
  await rejects(api.sessions.update(foreign.id, null), 400, 'JSON mal formado');
  await rejects(api.sessions.update(foreign.id, [1]), 400, 'JSON mal formado');

  // join / leave / cancel con el resolvedor
  await rejects(api.sessions.join('session-999999'), 404, NF);
  await rejects(api.sessions.leave('session-999999'), 404, NF);
  await rejects(api.sessions.cancel('session-999999'), 404, NF);
  await rejects(api.sessions.join('abc'), 400, 'id con formato inválido');
  const joined = await api.sessions.join(foreign.id.toUpperCase());
  assert.equal(joined.id, foreign.id);
  assert.ok(joined.participants.some((p) => p.id === me.id));

  // una sesión creada en el modo simulado se puede abrir, editar y cancelar
  const acc = (await api.users.listAccounts(me.id))[0];
  const created = await api.sessions.create({ gameId: acc.gameId, title: 'Nueva sesión', notes: '', day: 1, startHour: 20, durationHours: 2, slots: 4 });
  assert.match(created.id, /^session-[0-9]+$/);
  assert.equal((await api.sessions.get(created.id)).id, created.id);
  assert.equal((await api.sessions.update(created.id, { slots: 6 })).slots, 6);
  await api.sessions.cancel(created.id);
  await rejects(api.sessions.get(created.id), 404, NF);

  // como anfitrión de una sesión con 3 o más inscritos
  const host = await api.users.get(crowded.hostId);
  await api.auth.login({ email: `${host.username.replace(/[^a-z0-9]/g, '')}@teammatchup.gg`, password: 'demo1234' });
  const mine = await api.sessions.get(crowded.id);
  assert.deepEqual(await api.sessions.update(mine.id, {}), mine);                      // {} → 200 sin cambios
  const ignored = await api.sessions.update(mine.id, { gameId: 'xyz', hostId: 'x' });
  assert.deepEqual(ignored, mine);                                                      // campos ignorados
  const edited = await api.sessions.update(mine.id, { title: '  Ranked  ' });
  assert.equal(edited.title, 'Ranked');
  assert.deepEqual({ ...edited, title: mine.title }, mine);
  assert.equal((await api.sessions.get(mine.id)).title, 'Ranked');
  assert.equal((await api.sessions.update(mine.id, { notes: '' })).notes, '');
  await rejects(api.sessions.update(mine.id, { title: 'ab' }), 400, 'El título debe tener entre 3 y 60 caracteres.');
  await rejects(api.sessions.update(mine.id, { notes: null }), 400, 'Las notas deben ser texto de hasta 160 caracteres.');
  await rejects(api.sessions.update(mine.id, { day: '3' }), 400, 'Día no válido: usa un entero de 0 (lunes) a 6 (domingo).');
  await rejects(api.sessions.update(mine.id, { slots: mine.participants.length - 1 }), 400,
    'No puedes dejar menos cupos que jugadores inscritos.');
  // estado recalculado
  const exact = await api.sessions.update(mine.id, { slots: mine.participants.length });
  assert.equal(exact.status, 'full');
  assert.equal((await api.sessions.update(mine.id, { slots: 6 })).status, 'open');
});
```
Rojo (b), con una primera versión del script (antes de implementar `sessions.get`/`update`;
el script se reescribió después porque la semilla no tiene sesiones del usuario demo):
```
not ok 1 - sin sesión: 401
  name: 'TypeError'
not ok 2 - sessions.get / update / join / leave / cancel
# pass 0
# fail 2
```
Verde (b):
```

  mockApi.bundle.mjs  60.7kb

⚡ Done in 8ms
TAP version 13
# Subtest: sin sesión: 401
ok 1 - sin sesión: 401
  ---
  duration_ms: 1.849334
  ...
# Subtest: sessions.get / update / join / leave / cancel
ok 2 - sessions.get / update / join / leave / cancel
  ---
  duration_ms: 50.496708
  ...
1..2
# tests 2
# suites 0
# pass 2
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 54.755875
```

Otras comprobaciones: `grep -rn "La sesión no existe" frontend/src` sin resultados; `git status
--short backend` vacío; `httpApi.ts` no usa `fetch` (todo por `request`).

Cambio adicional necesario: el identificador de las sesiones que crea el modo simulado pasa de
`session-<uuid>` a `session-<número>` (`nextSessionId`), porque el patrón del plan
(`^session-[0-9]+$`) rechazaría con 400 las sesiones recién creadas. `compareSessions` de
`mockApi.ts` se sustituye por el de `domain/sessionList.ts`.

### T6 — Ruta, claves de consulta, caché de la agenda y hooks (2026-10-20)
Node v20.20.2, esbuild (`--platform=node`, `@/` por `tsconfig.app.json`). `routes.ts`, `queryKeys.ts`
y `agendaCache.ts` cargaron sin problemas; `agendaCache` se probó con un `QueryClient` real de
`@tanstack/query-core`. Script `scratchpad/t6/check.mjs` (no se versiona):
```js
// T6 · 009 · sessionPath, isProtectedPath, claves de consulta y caché de la agenda.
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/seba/Universidad/Reactivas/proyecto/frontend';
async function load(rel, name) {
  const out = new URL(`./${name}.bundle.mjs`, import.meta.url).pathname;
  execFileSync(`${ROOT}/node_modules/.bin/esbuild`,
    [`${ROOT}/src/${rel}`, '--bundle', '--format=esm', '--platform=node', `--tsconfig=${ROOT}/tsconfig.app.json`, `--outfile=${out}`],
    { stdio: 'inherit' });
  return import(pathToFileURL(out).href);
}
const routes = await load('app/routes.ts', 'routes');
const keys = await load('app/providers/queryKeys.ts', 'keys');
const cache = await load('features/sessions/agendaCache.ts', 'cache');
const { QueryClient } = await import(pathToFileURL(`${ROOT}/node_modules/@tanstack/query-core/build/modern/index.js`).href);

test('rutas del detalle', () => {
  assert.equal(routes.ROUTES.sessionDetail, '/agenda/:sessionId');
  assert.equal(routes.sessionPath('session-3'), '/agenda/session-3');
  assert.equal(routes.sessionPath('a/b'), '/agenda/a%2Fb');
  for (const p of ['/agenda/session-3', '/agenda/a%2Fb', '/agenda/', '/agenda', '/agenda/session-3/'])
    assert.equal(routes.isProtectedPath(p), true, p);
  for (const p of ['/agendas', '/login', '/', '/agenda-x/1'])
    assert.equal(routes.isProtectedPath(p), false, p);
  assert.equal(routes.isProtectedPath('/jugadores/u1'), true);
});

test('claves de consulta', () => {
  assert.deepEqual(keys.queryKeys.sessionDetail('u1', 4, 'session-3'), ['u', 'u1', 'session-detail', 4, 'session-3']);
  assert.deepEqual(keys.queryKeys.sessionLists('u1'), ['u', 'u1', 'sessions']);
});

const s = (id, gameId, day) => ({ id, gameId, day, startHour: 20, createdAt: '2026-10-18T10:00:00.000Z', title: id });
function seeded() {
  const qc = new QueryClient();
  qc.setQueryData(['u', 'u1', 'sessions', 'all'], [s('a', 'lol', 0), s('c', 'r6', 2)]);
  qc.setQueryData(['u', 'u1', 'sessions', 'lol'], [s('a', 'lol', 0)]);
  qc.setQueryData(['u', 'u1', 'sessions', 'r6'], [s('c', 'r6', 2)]);
  qc.setQueryData(['u', 'u2', 'sessions', 'all'], [s('z', 'lol', 0)]);
  return qc;
}
const ids = (qc, f, u = 'u1') => qc.getQueryData(['u', u, 'sessions', f]).map((x) => x.id);

test('applySessionToAgenda', () => {
  const qc = seeded();
  cache.applySessionToAgenda(qc, 'u1', s('b', 'lol', 1));
  assert.deepEqual(ids(qc, 'all'), ['a', 'b', 'c']);
  assert.deepEqual(ids(qc, 'lol'), ['a', 'b']);
  assert.deepEqual(ids(qc, 'r6'), ['c']);
  assert.deepEqual(ids(qc, 'all', 'u2'), ['z']);                      // otro usuario intacto
  assert.equal(qc.getQueryState(['u', 'u1', 'sessions', 'all']).isInvalidated, true);
  assert.equal(qc.getQueryState(['u', 'u2', 'sessions', 'all']).isInvalidated, false);
  cache.applySessionToAgenda(qc, 'u1', { ...s('a', 'lol', 0), title: 'nuevo' });
  assert.equal(qc.getQueryData(['u', 'u1', 'sessions', 'lol'])[0].title, 'nuevo');
});
test('removeSessionFromAgenda / markAgendaStale', () => {
  const qc = seeded();
  cache.removeSessionFromAgenda(qc, 'u1', 'a');
  assert.deepEqual(ids(qc, 'all'), ['c']);
  assert.deepEqual(ids(qc, 'lol'), []);
  assert.equal(qc.getQueryState(['u', 'u1', 'sessions', 'lol']).isInvalidated, true);
  const q2 = seeded();
  cache.markAgendaStale(q2, 'u1');
  assert.equal(q2.getQueryState(['u', 'u1', 'sessions', 'r6']).isInvalidated, true);
  assert.deepEqual(ids(q2, 'all'), ['a', 'c']);
  assert.equal(q2.getQueryState(['u', 'u2', 'sessions', 'all']).isInvalidated, false);
});
```
Rojo (`agendaCache.ts` sin crear):
```
✘ [ERROR] Could not resolve "/Users/seba/Universidad/Reactivas/proyecto/frontend/src/features/sessions/agendaCache.ts"
```
Verde:
```

  ...a518-6191-43ae-a90b-a0edfc492d8c/scratchpad/t6/routes.bundle.mjs  1.3mb ⚠️

⚡ Done in 41ms

  ...f726a518-6191-43ae-a90b-a0edfc492d8c/scratchpad/t6/keys.bundle.mjs  2.5kb

⚡ Done in 1ms

  ...726a518-6191-43ae-a90b-a0edfc492d8c/scratchpad/t6/cache.bundle.mjs  6.0kb

⚡ Done in 2ms
TAP version 13
# Subtest: rutas del detalle
ok 1 - rutas del detalle
  ---
  duration_ms: 0.52275
  ...
# Subtest: claves de consulta
ok 2 - claves de consulta
  ---
  duration_ms: 0.225167
  ...
# Subtest: applySessionToAgenda
ok 3 - applySessionToAgenda
  ---
  duration_ms: 0.887
  ...
# Subtest: removeSessionFromAgenda / markAgendaStale
ok 4 - removeSessionFromAgenda / markAgendaStale
  ---
  duration_ms: 0.2855
  ...
1..4
# tests 4
# suites 0
# pass 4
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5.645083
```

Revisión de código: la clave del detalle no se siembra con `initialData`; los efectos en la
agenda están en el `onSuccess` del propio `useMutation` (`useSessionMutation`), no en callbacks
de `mutate`. Desviación menor: en `@tanstack/react-query` 5.102 el actualizador de
`setQueriesData` no recibe la clave, así que `applySessionToAgenda` llama a `setQueriesData`
una vez por filtro (`all` y cada juego) con la clave `queryKeys.sessions(userId, filtro)`, y
después `invalidateQueries` sobre `['u', userId, 'sessions']`.

### T7 — Límite de escritura en los campos y título del formulario de creación (2026-10-20)
**Referencia en rojo (comportamiento anterior de «Anotar una sesión», leído del código antes del
cambio):** «Título» con `maxLength={60}` (unidades UTF-16: caben 30 emojis, no 60; un `🇨🇱` o `👍🏽`
puede quedar partido); «Notas» con `maxLength={160}` (igual); título vacío o solo espacios con
el texto propio «Ponle un título a la sesión para que otros sepan de qué se trata.»; `ab` y un
título con tabulador o U+2028 se enviaban al servidor.

**Cambio:** `shared/hooks/useCodePointLimit.ts` (nuevo; `beforeinput` nativo con `addEventListener`,
regla aplicada en `onChange` y en `compositionend`, sin reglas propias, no cancela el evento);
`TextField` con `forwardRef`, `maxCodePoints` y `onValueChange` (sin `maxCodePoints` conserva
su comportamiento); `SessionDraftSlip` usa `isValidSessionTitle` + `SESSION_ERRORS.title`, sin
`maxLength`, `TextField maxCodePoints={60}` y el hook con 160 en «Notas».

**Verificación estándar:** `typecheck`, `lint` y `build` en verde.

**Recorrido en modo simulado (2026-10-20): hecho, 19 de 19 OK.** Chrome 156 headless por CDP
(puerto 9301, perfil nuevo), Vite con `VITE_USE_MOCK_API=true VITE_MOCK_LATENCY=20` en :5301;
cuenta demo; «Anotar una sesión» abierta desde la celda «Lunes a las 12:00». Texto insertado con
`Input.insertText` (pasa por `beforeinput` e `input` como un pegado) y Ctrl+Z con el comando
`undo`. Script desechable `scratchpad/br/t7.mjs` (no se versiona). Salida:
```
OK  abre «Anotar una sesión» — Anotar una sesión el Lunes a las 12:00
OK  60 emojis caben en Título — 60 puntos
OK  el 61.º emoji no entra — 60 puntos
OK  160 caben en Notas
OK  la 161.ª no entra en Notas
OK  pegar 70 al principio — len=60 cursor=48,48
OK  pegar 70 en medio — len=60 cursor=54,54
OK  pegar 70 al final — len=60 cursor=60,60
OK  🇨🇱 en el carácter 60 no entra (ni a medias) — aaaaa"
OK  👍🏽 en el carácter 60 no entra (ni a medias)
OK  🇨🇱 con hueco de 2 entra entera
OK  deshacer (Ctrl+Z) funciona — "hola"
OK  título «ab» → mensaje y no envía — alert="El título debe tener entre 3 y 60 caracteres." sesiones 9→9
OK  título «  ab  » → mensaje y no envía — alert="El título debe tener entre 3 y 60 caracteres." sesiones 9→9
OK  título «vacío» → mensaje y no envía — alert="El título debe tener entre 3 y 60 caracteres." sesiones 9→9
OK  título «solo espacios» → mensaje y no envía — alert="El título debe tener entre 3 y 60 caracteres." sesiones 9→9
OK  título «tabulador interior» → mensaje y no envía — alert="El título debe tener entre 3 y 60 caracteres." sesiones 9→9
OK  título «U+2028 interior» → mensaje y no envía — alert="El título debe tener entre 3 y 60 caracteres." sesiones 9→9
OK  título válido envía — 9→10
consola: sin errores
```

### T8 — Ventana, estados y foco visible compartidos; ventana de cancelar (2026-10-20)
**Referencia de R10 (foco de «Anotar una sesión» antes del cambio, leído del código de `Slip`):**
al abrir no se mueve el foco (queda en el elemento que abrió la ventana); no hay retención de
Tab (el foco puede salir a la página de atrás); Escape cierra; el fondo cierra con
`onMouseDown`; el botón «Cerrar» cierra. Con las opciones nuevas apagadas (valor por defecto)
`Slip` conserva todo eso.

**Cambio:** `Slip` gana `initialFocusRef`, `titleRef` (con `tabIndex={-1}`), `trapFocus` y
`closeLocked` (Escape, fondo y botón «Cerrar» sin efecto; este con `aria-disabled`); `Blank`
gana `headingRef` y `headingLevel`; `Failure` gana `headingRef` (el mensaje pasa a `h1`) y
`retryBusy` (`aria-disabled`, sin efecto); `global.css` añade `[tabindex='-1']:focus` y el
estilo `.btn[aria-disabled='true']` (sin hover ni `:active`), solo con tokens;
`copy.ts` añade los cinco textos de la ventana; `CancelSessionDialog.tsx` (nuevo, sin montar
en ninguna vista) recibe `open`, `onClose`, `onConfirm`, `pending`, `message` y `titleRef`.
Con `pending`: «Volver» y cerrar con `aria-disabled` y sin efecto, «Sí, cancelar sesión»
con `disabled` y «Enviando…».

**Verificación estándar:** `typecheck`, `lint` y `build` en verde; sin colores escritos a mano
en los archivos tocados (`grep` de `#hex`, `rgb(` y `hsl(` sin resultados).

**Comprobación en el navegador (2026-10-20): hecha, 25 de 25 OK, sin errores de consola.**
Mismo montaje que T7 (Chrome 156 headless por CDP, Vite en modo simulado). Como
`CancelSessionDialog` aún no está montada en ninguna vista, se probó con un arnés temporal
(`frontend/zz-t8.html` y `zz-t8.tsx`, **borrados al terminar**) que monta la ventana, `Blank` y
`Failure`; el foco de «Anotar una sesión» se comprobó en la aplicación real. Script desechable
`scratchpad/br/t8.mjs`. Notas: «Tab en círculo» se registra con el orden recorrido (Sí, cancelar
sesión → Cerrar → Volver → Sí, cancelar sesión); la animación de salida de la ventana tarda más de
500 ms en cerrarse, por lo que el script espera 1,5 s (una primera pasada falló por esa espera, no
por el componente). Salida:
```
OK  R10 al abrir el foco no se mueve (sigue en la celda que abrió) — BUTTON|BUTTON|Anotar una sesión el Lunes a las 12:00
OK  R10 Tab sin retención: el foco puede salir de la ventana — BUTTON|BUTTON|Anotar una sesión el Martes a las 12:00
OK  R10 Escape cierra
OK  dialog: foco inicial en «Volver» — Volver|BUTTON|
OK  dialog: role=dialog y título tabIndex=-1
OK  Tab en círculo por los botones — orden: Sí, cancelar sesión → BUTTON → Volver → Sí, cancelar sesión
OK  Mayús+Tab desde el primero va al último — Sí, cancelar sesión|BUTTON|
OK  desde el título Tab va al primero — BUTTON|BUTTON|Cerrar
OK  desde el título Mayús+Tab va al último — Sí, cancelar sesión|BUTTON|
OK  en curso: «Sí, cancelar sesión» disabled con «Enviando…» — [{"t":"Cerrar","dis":false,"ad":"true"},{"t":"Volver","dis":false,"ad":"true"},{"t":"Enviando…","dis":true,"ad":null}]
OK  en curso: «Volver» y «Cerrar» aria-disabled sin disabled
OK  en curso: Tab cicla por Cerrar y Volver (bloqueados), no por el disabled — Cerrar → Volver → Cerrar
OK  en curso: Escape sin efecto
OK  en curso: clic en el fondo sin efecto
OK  en curso: clic en «Volver» y «Cerrar» sin efecto
OK  mensaje con role=alert
OK  fuera de curso: Escape cierra
OK  fuera de curso: «Volver» cierra
OK  Blank con headingRef: h1 tabIndex=-1 enfocable — Esta sesión no existe|H1|
OK  Blank sin props nuevas: <strong> sin tabindex, igual que hoy
OK  Failure con headingRef: el mensaje es el h1 enfocable — boom|H1|
OK  Failure sin props nuevas: igual que hoy
OK  foco por programa visible (outline) — solid 2px rgb(205, 242, 75)
OK  Failure retryBusy: aria-disabled y clic sin efecto — aria-disabled=true log=close|close
OK  Failure sin busy: «Reintentar» funciona
orden Tab: Sí, cancelar sesión → BUTTON → Volver → Sí, cancelar sesión
consola: sin errores
```

### T9 — Regla del foco (`focusRule.ts`) (2026-10-20)
Node v20.20.2, esbuild + `node:test` (el módulo solo importa un tipo). Script
`scratchpad/t9/check.mjs` (no se versiona). Firma elegida:
`resolveFocus(evento, contexto): FocusTarget | null`, con `contexto = { load?, action?, origin?
('button' | 'titleEnter'), roleAfter?, isHost? }`; `null` = no mover el foco (excepción de R16).
Eventos: `loadDone`, `retryDone`, `joinLeaveOk`, `saveOk`, `formClosed`, `clientCheckFailed`,
`actionEnded`, `rereadArrived`, `dialogClosed`, `cancelInFlight`, `empty`, `panelFocus`,
`lateResponse`.
```js
// T9 · 009 · resolveFocus: casos 1 a 14 de RNF-2 (spec 009) + puntos a a d + excepción de R16.
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/seba/Universidad/Reactivas/proyecto/frontend';
const OUT = new URL('./focusRule.bundle.mjs', import.meta.url).pathname;
execFileSync(`${ROOT}/node_modules/.bin/esbuild`,
  [`${ROOT}/src/features/sessions/detail/focusRule.ts`, '--bundle', '--format=esm', `--outfile=${OUT}`], { stdio: 'inherit' });
const { resolveFocus: f } = await import(pathToFileURL(OUT).href);

test('caso 1: 409 al pulsar «Unirme», la nueva lectura muestra «Sin cupos» → se queda en el botón', () => {
  assert.equal(f('actionEnded', { action: 'join', origin: 'button' }), 'joinButton');
  assert.equal(f('rereadArrived', { action: 'join', origin: 'button', roleAfter: 'outsider' }), 'joinButton');
});
test('caso 2: «Unirme»/«Salir» y la nueva lectura cambia el botón → mensaje de la zona', () => {
  assert.equal(f('rereadArrived', { action: 'join', origin: 'button', roleAfter: 'member' }), 'zoneMessage');
  assert.equal(f('rereadArrived', { action: 'leave', origin: 'button', roleAfter: 'outsider' }), 'zoneMessage');
  assert.equal(f('rereadArrived', { action: 'leave', origin: 'button', roleAfter: 'member' }), 'leaveButton');
});
test('caso 3: rechazo al guardar con anfitrión → «Guardar cambios» o «Título» (Intro)', () => {
  assert.equal(f('actionEnded', { action: 'save', origin: 'button' }), 'saveButton');
  assert.equal(f('actionEnded', { action: 'save', origin: 'titleEnter' }), 'titleField');
  assert.equal(f('rereadArrived', { action: 'save', origin: 'button', roleAfter: 'host' }), 'saveButton');
  assert.equal(f('rereadArrived', { action: 'save', origin: 'titleEnter', roleAfter: 'host' }), 'titleField');
});
test('caso 4: la nueva lectura muestra que ya no es anfitrión → mensaje de la zona', () => {
  assert.equal(f('rereadArrived', { action: 'save', origin: 'button', roleAfter: 'outsider' }), 'zoneMessage');
  assert.equal(f('rereadArrived', { action: 'save', origin: 'titleEnter', roleAfter: 'member' }), 'zoneMessage');
  assert.equal(f('rereadArrived', { action: 'cancel', origin: 'button', roleAfter: 'outsider' }), 'zoneMessage');
});
test('caso 5: error sin mensaje o plazo, sin nueva lectura → vuelve al botón', () => {
  assert.equal(f('actionEnded', { action: 'join', origin: 'button' }), 'joinButton');
  assert.equal(f('actionEnded', { action: 'leave', origin: 'button' }), 'leaveButton');
  assert.equal(f('actionEnded', { action: 'cancel', origin: 'button' }), 'dialogConfirm');
});
test('caso 6 y 13: ventana de la agenda sin tarjeta / redirección de RF-8 → título del panel', () => {
  assert.equal(f('panelFocus', {}), 'panelTitle');
});
test('caso 7: comprobación del cliente falla → «Guardar cambios» o «Título» (Intro)', () => {
  assert.equal(f('clientCheckFailed', { action: 'save', origin: 'button' }), 'saveButton');
  assert.equal(f('clientCheckFailed', { action: 'save', origin: 'titleEnter' }), 'titleField');
});
test('caso 8: sumarse → «Salir»; salir → «Unirme»', () => {
  assert.equal(f('joinLeaveOk', { action: 'join' }), 'leaveButton');
  assert.equal(f('joinLeaveOk', { action: 'leave' }), 'joinButton');
});
test('caso 9: 404 en acción o nueva lectura 400/404 → «Esta sesión no existe»', () => {
  assert.equal(f('empty', {}), 'emptyTitle');
});
test('casos 10 y 12: abrir/recargar/Atrás/login y «Reintentar» → título, vacío o mensaje de error', () => {
  assert.equal(f('loadDone', { load: 'success' }), 'sessionTitle');
  assert.equal(f('loadDone', { load: 'empty' }), 'emptyTitle');
  assert.equal(f('loadDone', { load: 'pageError' }), 'errorMessage');
  assert.equal(f('retryDone', { load: 'success' }), 'sessionTitle');
  assert.equal(f('retryDone', { load: 'empty' }), 'emptyTitle');
  assert.equal(f('retryDone', { load: 'pageError' }), 'errorMessage');
});
test('caso 11: «Reintentar» en curso → sin evento (el foco se queda); al llegar se aplica el caso 10', () => {
  assert.equal(f('retryDone', { load: 'pageError' }), 'errorMessage');
});
test('caso 14: cancelación en curso → título de la ventana; al llegar el error → «Sí, cancelar sesión»', () => {
  assert.equal(f('cancelInFlight', {}), 'dialogTitle');
  assert.equal(f('actionEnded', { action: 'cancel', origin: 'button' }), 'dialogConfirm');
  assert.equal(f('rereadArrived', { action: 'cancel', origin: 'button', roleAfter: 'host' }), 'dialogConfirm');
});
test('formulario y ventana cerrados (punto a, Q1) y 200 al guardar', () => {
  assert.equal(f('formClosed', { isHost: true }), 'editButton');
  assert.equal(f('formClosed', { isHost: false }), 'zoneMessage');
  assert.equal(f('saveOk', { isHost: true }), 'editButton');
  assert.equal(f('saveOk', { isHost: false }), 'zoneMessage');
  assert.equal(f('dialogClosed', { isHost: true }), 'cancelButton');
  assert.equal(f('dialogClosed', { isHost: false }), 'zoneMessage');
});
test('excepción de R16: respuesta cuando ya no está en el detalle → ningún destino', () => {
  assert.equal(f('lateResponse', {}), null);
});
```
Rojo (módulo sin crear):
```
✘ [ERROR] Could not resolve "/Users/seba/Universidad/Reactivas/proyecto/frontend/src/features/sessions/detail/focusRule.ts"
```
Verde:
```

  ...518-6191-43ae-a90b-a0edfc492d8c/scratchpad/t9/focusRule.bundle.mjs  1.5kb

⚡ Done in 1ms
TAP version 13
# Subtest: caso 1: 409 al pulsar «Unirme», la nueva lectura muestra «Sin cupos» → se queda en el botón
ok 1 - caso 1: 409 al pulsar «Unirme», la nueva lectura muestra «Sin cupos» → se queda en el botón
  ---
  duration_ms: 0.749042
  ...
# Subtest: caso 2: «Unirme»/«Salir» y la nueva lectura cambia el botón → mensaje de la zona
ok 2 - caso 2: «Unirme»/«Salir» y la nueva lectura cambia el botón → mensaje de la zona
  ---
  duration_ms: 0.04925
  ...
# Subtest: caso 3: rechazo al guardar con anfitrión → «Guardar cambios» o «Título» (Intro)
ok 3 - caso 3: rechazo al guardar con anfitrión → «Guardar cambios» o «Título» (Intro)
  ---
  duration_ms: 0.078125
  ...
# Subtest: caso 4: la nueva lectura muestra que ya no es anfitrión → mensaje de la zona
ok 4 - caso 4: la nueva lectura muestra que ya no es anfitrión → mensaje de la zona
  ---
  duration_ms: 0.039917
  ...
# Subtest: caso 5: error sin mensaje o plazo, sin nueva lectura → vuelve al botón
ok 5 - caso 5: error sin mensaje o plazo, sin nueva lectura → vuelve al botón
  ---
  duration_ms: 0.040167
  ...
# Subtest: caso 6 y 13: ventana de la agenda sin tarjeta / redirección de RF-8 → título del panel
ok 6 - caso 6 y 13: ventana de la agenda sin tarjeta / redirección de RF-8 → título del panel
  ---
  duration_ms: 0.032083
  ...
# Subtest: caso 7: comprobación del cliente falla → «Guardar cambios» o «Título» (Intro)
ok 7 - caso 7: comprobación del cliente falla → «Guardar cambios» o «Título» (Intro)
  ---
  duration_ms: 0.033709
  ...
# Subtest: caso 8: sumarse → «Salir»; salir → «Unirme»
ok 8 - caso 8: sumarse → «Salir»; salir → «Unirme»
  ---
  duration_ms: 0.040459
  ...
# Subtest: caso 9: 404 en acción o nueva lectura 400/404 → «Esta sesión no existe»
ok 9 - caso 9: 404 en acción o nueva lectura 400/404 → «Esta sesión no existe»
  ---
  duration_ms: 0.074625
  ...
# Subtest: casos 10 y 12: abrir/recargar/Atrás/login y «Reintentar» → título, vacío o mensaje de error
ok 10 - casos 10 y 12: abrir/recargar/Atrás/login y «Reintentar» → título, vacío o mensaje de error
  ---
  duration_ms: 0.103666
  ...
# Subtest: caso 11: «Reintentar» en curso → sin evento (el foco se queda); al llegar se aplica el caso 10
ok 11 - caso 11: «Reintentar» en curso → sin evento (el foco se queda); al llegar se aplica el caso 10
  ---
  duration_ms: 0.0425
  ...
# Subtest: caso 14: cancelación en curso → título de la ventana; al llegar el error → «Sí, cancelar sesión»
ok 12 - caso 14: cancelación en curso → título de la ventana; al llegar el error → «Sí, cancelar sesión»
  ---
  duration_ms: 0.039667
  ...
# Subtest: formulario y ventana cerrados (punto a, Q1) y 200 al guardar
ok 13 - formulario y ventana cerrados (punto a, Q1) y 200 al guardar
  ---
  duration_ms: 0.037542
  ...
# Subtest: excepción de R16: respuesta cuando ya no está en el detalle → ningún destino
ok 14 - excepción de R16: respuesta cuando ya no está en el detalle → ningún destino
  ---
  duration_ms: 0.070791
  ...
1..14
# tests 14
# suites 0
# pass 14
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 8.2195
```

### T10 — Página de detalle de solo lectura (2026-10-20)
Chrome 156 headless por CDP, Vite en modo simulado (:5301, `VITE_MOCK_LATENCY=20`), cuenta demo.
Scripts desechables `scratchpad/br/t10.mjs` y `t10b.mjs` (no se versionan).

**Referencia en rojo (antes de implementar):** `/agenda/session-3` mostraba la página «no
encontrada» (`h1` «No hay nadie en esta sala»; no había ruta):
```
path /agenda/session-3 | main text: undefined | h1: No hay nadie en esta sala
```
**Cambios:** `SessionDetailPage.tsx` (`SessionDetailRoute` con `key={location.key}`), `sessionDetail.css`
(solo tokens), `SessionDetailFacts.tsx`, `detail/useDetailController.ts` (visita, `mountedRef`, pantalla,
foco con `focusRequest` + `useLayoutEffect`, reflejo en la agenda, «Reintentar»), ruta diferida en
`router.tsx` y textos en `copy.ts`. Detalle de implementación: en React Query 5 una consulta sin datos
que se reintenta vuelve a `pending` y borra su error; el controlador recuerda el último error para que
siga visible durante «Reintentar» (RF-13). Una primera pasada falló por mi script (orden de los argumentos
de `ApiError`, texto en mayúsculas por CSS y una espera corta), no por la página.

**Salida del recorrido (30 comprobaciones, consola sin errores):**
```
OK  sin sesión: /agenda/session-3 lleva a login
OK  con sesión: /agenda/session-3 abre el detalle
OK  detalle: h1 con el foco — Noche de clasificatorias
OK  detalle: rango, n/t jugadores — LOL | League of Legends | Noche de clasificatorias | Lunes · 16:00–18:00 | Traer ganas de comunicar calls. | 3/5 jugadores | EV | Emilia Vargas | ORGANIZA | JP | Joaquín Pacheco | IC | Isidora Campos 
OK  detalle: participantes con enlace a playerPath(id, juego) — /jugadores/user-4?juego=lol,/jugadores/user-6?juego=lol,/jugadores/user-2?juego=lol
OK  detalle: sin región de estado (sin announce) — 0
OK  detalle: «organiza» y «cupo libre» — 2 filas de cupo libre
OK  /agenda/SESSION-3 muestra la misma sesión
OK  aviso «Datos de demostración» en barra y pie, sin aviso propio — 2 avisos (barra y pie), ninguno dentro de main
OK  título del documento
OK  /agenda/abc: «Esta sesión no existe» con el foco — {"t":"Esta sesión no existe","f":true,"link":["Ir a la agenda→/agenda"]}
OK  /agenda/abc: siguiente Tab = «Ir a la agenda» — A:Ir a la agenda
OK  /agenda/session-999999: «Esta sesión no existe» con el foco — {"t":"Esta sesión no existe","f":true,"link":["Ir a la agenda→/agenda"]}
OK  /agenda/session-999999: siguiente Tab = «Ir a la agenda» — A:Ir a la agenda
OK  error: mientras carga «Cargando…»
OK  error: mensaje como h1 con el foco y «Reintentar» — {"t":"No se pudo conectar con el servidor. Inténtalo de nuevo.","f":true,"btn":true}
OK  Reintentar en curso: aria-disabled, conserva el foco, sin «Cargando…» — {"ad":"true","focus":true,"loading":false,"calls":2}
OK  doble pulsación = una petición — llamadas 2 (1 de apertura + 1)
OK  tras fallar de nuevo el foco va al mensaje
OK  Reintentar con éxito: foco en el título de la sesión
OK  Atrás al detalle: pide de nuevo — n 1→2
OK  enfocar la ventana / reconectar no pide nada — n=2
OK  título <b>x</b> se ve literal
OK  360 px: sin desplazamiento horizontal (60 sin espacios + 160 de notas) — {"sw":360,"iw":360}
OK  contraste «organiza» tema dark — 5.18:1 (fg rgb(124, 132, 143), fondo rgb(11, 12, 14), opacidad 1)
OK  contraste «cupo libre» tema dark — 5.18:1 (fg rgb(124, 132, 143), fondo rgb(11, 12, 14), opacidad 1)
OK  contraste «organiza» tema light — 4.56:1 (fg rgb(101, 108, 118), fondo rgb(236, 238, 241), opacidad 1)
OK  contraste «cupo libre» tema light — 4.56:1 (fg rgb(101, 108, 118), fondo rgb(236, 238, 241), opacidad 1)
OK  al abrir el detalle la agenda queda actualizada con esa sesión (R17) — Título remoto
OK  tras el estado vacío la agenda queda marcada para pedir de nuevo (R8) — true
consola: sin errores
```
Retorno tras iniciar sesión por el formulario y una sola petición por apertura:
```
1 ruta tras abrir sin sesión: /login {"from":"/agenda/session-3"}
2 ruta tras entrar: /agenda/session-3 | h1: Noche de clasificatorias | foco en h1: true
3 peticiones en una apertura (dev con StrictMode): 1
consola: sin errores
```
**Contraste (R-4):** «organiza» y «cupo libre» usan `--ink-3`: 5,18:1 en el tema oscuro y 4,56:1 en el
claro, ambos por encima de 4,5:1; no hace falta pasar a `--ink-2`.

**No ejecutado:** `npm run build && npm run preview` para la petición única (R-6): el modo simulado no
hace peticiones de red que contar. Se comprobó en desarrollo con StrictMode (1 petición por apertura, con
la consulta compartida), que es el caso más exigente.

### T11 — Zona de acciones: sumarse y salir, mensajes y nueva lectura (2026-10-20)
**Lista de comprobación pendiente antes de implementar (casos de RNF-2 de esta tarea):** 1 (409 al
pulsar «Unirme» y la lectura muestra «Sin cupos»: el foco se queda en el botón), 2 (409 y la lectura cambia
el botón: foco al mensaje), 5 (error sin mensaje o plazo: foco al botón, sin nueva lectura), 8 (sumarse →
«Salir»; salir → «Unirme») y 9 (404 → «Esta sesión no existe»); además R16, el doble clic y «Sin cupos».

Chrome 156 headless por CDP, Vite en modo simulado (:5301). Los 409 se provocan cambiando la base
simulada (`tmu.mock-db.v3`) entre la lectura y la acción, como haría otra pestaña. Scripts desechables
`scratchpad/br/t11.mjs` y `t11b.mjs` (no se versionan).

**Corrección durante la tarea:** una primera pasada falló en el foco (caso 8, caso 1 y caso 2: el foco iba
al título). Causa: la clave con la que `useDetailController` anuncia «un resultado nuevo de la lectura»
incluía `dataUpdatedAt`, y `setQueryData` (sumarse, salir, nueva lectura) la cambiaba, así que se repetía
el foco de la apertura. Ahora la clave es la pantalla (y `errorUpdatedAt` en el error de página), de modo
que solo abrir y «Reintentar» mueven el foco. Tras el cambio se repitió también T10 (30 de 30 OK).

**Salida (17 de 17 OK, consola sin errores):**
```
OK  no inscrito: botón «Unirme»
OK  Unirme en curso: «Enviando…» con disabled — {"t":"Enviando…","dis":true,"ad":null}
OK  caso 8: tras sumarse, «Salir» con el foco y sin anuncio — BUTTON:Salir
OK  caso 8: tras salir, «Unirme» con el foco — BUTTON:Unirme
OK  doble clic: una sola petición — join=1
OK  «Sin cupos» con aria-disabled y sin disabled — {"t":"Sin cupos","dis":false,"ad":"true"}
OK  «Sin cupos» recibe el foco con Tab — BUTTON:Sin cupos
OK  «Sin cupos» no envía nada
OK  caso 1: 409 → mensaje literal y nueva lectura sin «Cargando…» — mensaje=Esta sesión ya no admite jugadores. lecturas=1
OK  caso 1: el foco se queda en el botón (ahora «Sin cupos») — BUTTON:Sin cupos
OK  caso 2: «Ya estás inscrito…» y la lectura cambia el botón a «Salir» — mensaje=Ya estás inscrito en esta sesión. botón=Salir
OK  caso 2: el foco va al mensaje de la zona — P:Ya estás inscrito en esta sesión.
OK  caso 2: «Salir» con 409 «No estás inscrito…» → «Unirme» y foco al mensaje — mensaje=No estás inscrito en esta sesión. botón=Unirme
OK  caso 5: texto de error sin mensaje, sin nueva lectura — lecturas=0
OK  caso 5: el foco vuelve al botón — BUTTON:Unirme
OK  caso 9: 404 → «Esta sesión no existe» con el foco
OK  R16: la respuesta tras «Atrás» actualiza la agenda — {"path":"/agenda","inList":true,"alerts":0}
OK  R16: no mueve el foco ni muestra mensajes — BODY:Saltar al contenidoTeamMatchUpMi fichaCo → BODY:Saltar al contenidoTeamMatchUpMi fichaCo
consola: sin errores
```
Plazo (estado 0 sin mensaje):
```
OK  plazo (estado 0): texto de error sin mensaje — No se pudo conectar con el servidor. Inténtalo de nuevo.
OK  plazo: sin nueva lectura
OK  plazo: el foco vuelve a «Unirme»
```
**No ejecutado:** el plazo real de 30 s con `VITE_MOCK_LATENCY=40000`. Con esa latencia también tardan
40 s la restauración de la sesión y la lectura del detalle, y la aplicación nunca llega al detalle. Se
sustituyó por una acción que falla con el error que `transport.ts` da al vencer el plazo (estado 0, sin
mensaje); el plazo en sí lo comprobó la 007 (T4, `transport-check`). Las acciones del anfitrión
(«Editar sesión», «Cancelar sesión») llegan en T12 y T14: hoy el anfitrión no ve botones.

### T12 — Edición en el detalle: formulario, guardar y descartar (2026-10-20)
**Lista de comprobación pendiente antes de implementar (casos de RNF-2 de esta tarea):** 3 (rechazo al
guardar con anfitrión: el foco vuelve a «Guardar cambios» o a «Título» si se envió con Intro), 4 (la lectura
muestra que ya no es anfitrión: el formulario se cierra y el foco va al mensaje de la zona), 7 (título que
no pasa la comprobación del cliente: el foco se queda en el origen), 9 (404) y Q1 (abrir → «Título»; cerrar
con «Guardar cambios» o «Descartar» → «Editar sesión»).

Chrome 156 headless por CDP, Vite en modo simulado (:5301). Script desechable `scratchpad/br/t12.mjs` (no
se versiona); la cuenta demo crea cuatro sesiones propias y la base simulada (`tmu.mock-db.v3`) se modifica
entre la lectura y la acción para provocar los rechazos. Cambios: `SessionEditForm.tsx` (nuevo),
`SessionActionsZone.tsx` («Editar sesión» y «Cambios guardados.»), `useDetailController.ts` (`form`,
`formMessage`, `savedNotice`, `openForm`, `discard`, `submitForm`, rebase y regla defensiva en `reread`),
`SessionDetailPage.tsx` y `copy.ts`. Intro en «Título» se maneja con `onKeyDown` (sin enviar el formulario
dos veces).

**Salida (24 de 24 OK, consola sin errores; T10 y T11 repetidos sin fallos):**
```
OK  anfitrión: botón «Editar sesión»
OK  formulario relleno con lo guardado (título sin recortar) — {"t":"  Ranked noche  ","n":"notas","sl":"4","h":"20"}
OK  foco en «Título» — INPUT:#:r9:
OK  «Editar sesión» se oculta con el formulario abierto
OK  «Descartar» cierra y el foco vuelve a «Editar sesión» — BUTTON:Editar sesión
OK  guardar sin cambios envía los seis campos — {"title":"  Ranked noche  ","notes":"notas","day":1,"startHour":20,"durationHours":2,"slots":4}
OK  200: formulario cerrado, «Cambios guardados.» como estado, sin nueva lectura — lecturas=0
OK  la sesión mostrada es la devuelta (título recortado)
OK  el foco va a «Editar sesión» — BUTTON:Editar sesión
OK  reabrir el formulario oculta «Cambios guardados.»
OK  caso 7: «ab» + Guardar → mensaje literal, no envía, foco en el botón — El título debe tener entre 3 y 60 caracteres. | BUTTON:Guardar cambios
OK  caso 7: «ab» + Intro en «Título» → no envía y el foco queda en el campo — INPUT:#:rd:
OK  caso 3: mensaje del servidor en el formulario — No puedes dejar menos cupos que jugadores inscritos.
OK  caso 3: relee (1 lectura) sin «Cargando…», conserva lo escrito y sube los cupos al nuevo mínimo — {"t":"Título nuevo","sl":"4","loading":false} lecturas=1
OK  caso 3: el foco vuelve a «Guardar cambios» — BUTTON:Guardar cambios
OK  guardar en curso: «Enviando…» disabled y «Descartar» aria-disabled — [{"t":"Descartar","dis":false,"ad":"true"},{"t":"Enviando…","dis":true,"ad":null}]
OK  guardar en curso: «Descartar» sin efecto
OK  doble envío = una sola petición
OK  nueva lectura en curso: «Guardar cambios» aria-disabled
OK  nueva lectura en curso: «Descartar» funciona
OK  05:00 aparece al final de «Hora de inicio» — 12:00 13:00 14:00 15:00 16:00 17:00 18:00 19:00 20:00 21:00 22:00 23:00 00:00 01:00 05:00
OK  05:00 se conserva al guardar — Martes · 05:00–07:00
OK  caso 4: el formulario se cierra y el mensaje pasa a la zona — Solo quien organiza puede editar la sesión.
OK  caso 4: el foco va al mensaje de la zona — P:Solo quien organiza puede editar la sesi
consola: sin errores
```
**Revisión de código:** la rama defensiva de `reread` (rol distinto de anfitrión con el formulario abierto →
se cierra, el mensaje pasa a la zona y el foco sigue `rereadArrived`) existe y se ejerció (caso 4);
`SessionEditForm` no repite ninguna regla de `checkEditForm` (grep sin `isValidSessionTitle` ni
`codePointLength`; solo importa las constantes de límite para el campo).

**No comprobado:** «Cancelar sesión» bloqueado mientras se guarda: ese botón llega en T14 (y con el
formulario abierto «Editar sesión» está oculto). Queda para T14.

### T13 — Agenda: «Ver detalle», rango compartido, 360 px y cancelar con confirmación (2026-10-20)
**Referencia previa (R-9), tomada antes de cambiar nada** (Chrome 156, 1280 y 360 px, cuenta demo con una
sesión propia de título de 60 caracteres sin espacios y notas de 160, y sumada a otra). Capturas en
`scratchpad/br/ref-1280-mis.png`, `ref-360-mis.png`, `ref-1280-abierta.png` y `ref-360-abierta.png`; datos en
`t13-ref.json`. Rangos que mostraba la tarjeta: «Lunes · 16:00–18:00» y «Miércoles · 21:00–23:00». Anchura de
tarjeta: 300 px (1280) y 278 px (360). **Desbordamiento horizontal de partida:** `scrollWidth` 2115 con 1280 de
ventana y 1225 con 360 en «Mis sesiones» (el título largo y las notas sin espacios no se cortaban).

**Cambios:** `SessionSlip.tsx` (enlace «Ver detalle» con `aria-label`, rango con `formatSessionRange`,
`cancelButtonRef`), `sessionSlip.css` (`min-width: 0` y `overflow-wrap: anywhere`), `SchedulePage.tsx`
(«Cancelar sesión» abre `CancelSessionDialog`; 204, 404 y cierre; `h2` del panel con `tabIndex={-1}`; consumo
único de `state.focus` sin borrar `proposal`), `CancelSessionDialog.tsx` (`confirmRef`), `copy.ts` y `Slip.tsx`.
Corrección en `Slip`: el clic en el fondo hace `preventDefault` en `mousedown`; sin eso el navegador llevaba el
foco al cuerpo justo después de cerrar y el foco no volvía a «Cancelar sesión».

Una primera pasada del script falló por mi preparación (la base simulada de la pasada anterior seguía en
memoria y duplicó tarjetas; dos esperas mal puestas), y una por el comportamiento del fondo descrito arriba.

**Salida (30 de 30 OK, consola sin errores; T7, T10, T11 y T12 repetidos sin fallos):**
```
OK  1280px «Mis sesiones»: mismo texto que la referencia, salvo «Ver detalle» — Lunes · 16:00–18:00 / Miércoles · 21:00–23:00
OK  1280px «Mis sesiones»: cada tarjeta con «Ver detalle» y su nombre accesible
OK  1280px «Mis sesiones»: sin desplazamiento horizontal — {"sw":1280,"iw":1280} (referencia: {"sw":2115,"iw":1280})
OK  1280px «Sesión abierta»: una tarjeta con «Ver detalle» — Lunes · 16:00–18:00
OK  1280px «Sesión abierta»: sin desplazamiento horizontal — {"sw":1280,"iw":1280}
OK  360px «Mis sesiones»: mismo texto que la referencia, salvo «Ver detalle» — Lunes · 16:00–18:00 / Miércoles · 21:00–23:00
OK  360px «Mis sesiones»: cada tarjeta con «Ver detalle» y su nombre accesible
OK  360px «Mis sesiones»: sin desplazamiento horizontal — {"sw":360,"iw":360} (referencia: {"sw":1225,"iw":1225})
OK  360px «Sesión abierta»: una tarjeta con «Ver detalle» — Lunes · 16:00–18:00
OK  360px «Sesión abierta»: sin desplazamiento horizontal — {"sw":360,"iw":360}
OK  «Ver detalle» abre el detalle y añade una entrada — 15→16
OK  «Atrás» vuelve a la agenda en «Mis sesiones» y «Todos los juegos»
OK  «Cancelar sesión» abre la ventana con el foco en «Volver» — BUTTON:Volver
OK  «Volver» no envía y devuelve el foco a «Cancelar sesión» — BUTTON:Cancelar sesión
OK  Escape no envía y devuelve el foco al botón — BUTTON:Cancelar sesión
OK  cerrar (X) no envía y devuelve el foco al botón — BUTTON:Cancelar sesión
OK  fondo no envía y devuelve el foco al botón — BUTTON:Cancelar sesión
OK  404: la ventana sigue abierta con el mensaje — Sesión no encontrada.
OK  404: la agenda vuelve a pedir sus sesiones — listas=1
OK  404: al cerrar el foco va al título del panel — H2:Mis sesiones
OK  en curso: el foco va al título de la ventana — H2:¿Cancelar esta sesión?
OK  en curso: Tab no sale de la ventana — [true,true,true]
OK  en curso: Escape sin efecto
OK  204: la tarjeta desaparece y la ventana se cierra
OK  204: el foco va al título del panel — H2:Mis sesiones
OK  state.focus: el foco va a «Mis sesiones» y la marca se borra — null
OK  state.focus no borra proposal (se abre «Anotar una sesión») — Anotar una sesión
OK  recargar no repite el foco — BODY:Saltar al contenidoTeamMatchUpMi fichaCo
OK  «Estás dentro» conserva role=status (announce)
consola: sin errores
```
Capturas posteriores: `new-1280-mis.png`, `new-360-mis.png`, `new-1280-abierta.png`, `new-360-abierta.png` (mismo
texto y mismos rangos que la referencia salvo «Ver detalle»; la tarjeta ya no desborda).

**No comprobado en la agenda:** el rechazo 403 de una cancelación con mensaje (foco de vuelta a «Sí, cancelar
sesión», caso 14) se ejerce junto con el detalle en T14; «Sin cupos» con `disabled` y los filtros no se tocaron.

### T14 — Cancelar desde el detalle y redirección con reemplazo (2026-10-20)
**Lista de comprobación pendiente antes de implementar (casos de RNF-2 de esta tarea):** 13 (204: la agenda
con el foco en «Mis sesiones»), 14 (en curso: foco al título de la ventana; al llegar el error, vuelve a «Sí,
cancelar sesión»), 9 (404: estado vacío con el foco en su título) y el cierre de la ventana (punto a: foco a
«Cancelar sesión»).

Chrome 156 headless por CDP, Vite en modo simulado (:5301). Script desechable `scratchpad/br/t14.mjs` (no se
versiona). Cambios: `SessionActionsZone.tsx` («Cancelar sesión», `btn--danger`, bloqueado con `aria-disabled`),
`useDetailController.ts` (`dialogOpen`, `dialogMessage`, `openDialog`, `closeDialog`, `confirmCancel`, rama
`cancel` de `run` con `navigate(..., { replace: true, state: { focus: 'panelTitle' } })` y de `reread`),
`SessionDetailPage.tsx` (monta `CancelSessionDialog`) y los tipos de `titleRef` en `Slip`/`CancelSessionDialog`
(`Ref` en lugar de `RefObject`).

**Salida (24 de 24 OK, consola sin errores):**
```
OK  anfitrión: botón «Cancelar sesión»
OK  la ventana se abre sobre el formulario, que conserva lo escrito
OK  foco inicial en «Volver» — BUTTON:Volver
OK  cerrar devuelve el foco a «Cancelar sesión» y no envía — BUTTON:Cancelar sesión
OK  «Cambios guardados.» visible tras guardar
OK  abrir la ventana no oculta «Cambios guardados.»
OK  Escape cierra y devuelve el foco — BUTTON:Cancelar sesión
OK  error con mensaje: la ventana sigue abierta con el mensaje — Mensaje de prueba del servidor
OK  error con mensaje: foco en «Sí, cancelar sesión» — BUTTON:Sí, cancelar sesión
OK  error con mensaje: relee (1 lectura) — 1
OK  en la nueva lectura la ventana se puede cerrar
OK  en curso: «Enviando…» con disabled; «Volver» y cerrar con aria-disabled — ["Cerrar[aria-disabled]","Volver[aria-disabled]","Enviando…[disabled]"]
OK  en curso: el foco va al título de la ventana — H2:¿Cancelar esta sesión?
OK  en curso: Tab y Mayús+Tab no salen de la ventana — [true,true,true,true]
OK  en curso: Escape y fondo sin efecto
OK  204: lleva a la agenda con el foco en «Mis sesiones» — {"p":"/agenda","h2":"H2:Mis sesiones","hl":7,"st":"{}","card":false}
OK  204: reemplaza la entrada (el historial no crece) y la marca de foco se consume — 7→7 {}
OK  204: la sesión cancelada ya no está en la agenda
OK  «Atrás» va a la página anterior al detalle, no al detalle cancelado — /agenda/session-10
OK  404: cierra todo y muestra «Esta sesión no existe» con el foco
OK  403 + ya no es anfitrión: la ventana se cierra y el mensaje pasa a la zona con el foco — P:Solo quien organiza puede cancelar la se
OK  cerrar (X) devuelve el foco a «Cancelar sesión» — BUTTON:Cancelar sesión
OK  el fondo cierra y devuelve el foco a «Cancelar sesión» — BUTTON:Cancelar sesión
consola: sin errores
```
**Regresión:** T7, T10, T11, T12 y T13 repetidos. T13 falló una vez en «Estás dentro» (el script comprobaba
900 ms después de cargar, con el equipo ocupado por otros procesos) y pasó entero al repetirlo solo.

**Aviso sobre la verificación estándar:** `npm run typecheck` (`tsc --noEmit`) no comprueba nada en este
proyecto, porque `tsconfig.json` solo tiene `references`; los errores de tipos los da `tsc -b`, que ejecuta
`npm run build`. En esta tarea el `build` encontró dos errores de tipos que `typecheck` dejó pasar
(el tipo de `call` en `run` y `titleRef`); ya están corregidos. Las verificaciones anteriores seguían siendo
válidas porque en todas se comprobó que el `build` terminaba en verde.

**Cierra el pendiente de T12:** «Cancelar sesión» se bloquea con `aria-disabled` mientras hay una acción o una
nueva lectura en curso (mismo `blocked` que «Editar sesión»).

## Revisiones de código (T15, 2026-10-20)

**Revisión 1. Una sola regla del título.** (Resultado inicial; el hallazgo D-1 se cerró después.)
`grep -rn "isValidSessionTitle" frontend/src` → una definición (`domain/sessionRules.ts:74`) y tres usos:
`checkEditForm` (`sessionDetail.ts:113`), `SessionDraftSlip.tsx:88` y, dentro de `sessionRules.ts`, el `checkTitle`
de `validateSessionEdit`. `grep -rnE "trimText|codePointLength|hasForbiddenTitleChar|\.trim\(\)"` sobre
`features/sessions`, `TextField.tsx` y `shared/hooks` → sin resultados: ningún componente repite la regla.
**Hallazgo D-1 (cerrado el 2026-10-20, por decisión del usuario: opción 1).** `services/mock/mockApi.ts` (código de la 007,
`validateCreateSession`) mantenía una segunda copia de la regla del título: su propio `trimText`,
`FORBIDDEN_TITLE_CHAR`, `TRIM_FIXED` y `codePointLength`, y la repetía en línea. **Corrección:**
`validateCreateSession` ahora llama a `isValidSessionTitle` y usa `trimText`, `codePointLength` y `NOTES_MAX_LENGTH` de
`domain/sessionRules`; se borraron las definiciones locales. `grep -rnE "function trimText|function codePointLength|
FORBIDDEN_TITLE_CHAR =|FORBIDDEN_TITLE_PATTERN =|TRIM_FIXED" frontend/src` fuera de `sessionRules.ts` → sin resultados.
Comprobación con Node (esbuild; `scratchpad/t5/check-c.mjs`, no se versiona): el `sessions.create` del simulado rechaza
con el texto de la 006 los diez títulos inválidos de la tabla 7.1 (`ab`, `  ab  `, U+3000, vacío, solo espacios, tabulador
interior, U+0085 en el interior y en el extremo, U+2028, 61 emojis) y acepta y recorta los cinco válidos (tabuladores en los
extremos, espacios, 60 emojis, U+200B inicial); las notas de 161 siguen dando su texto. `check-b.mjs` (T5) sigue en verde (2 de 2).
```js
// Revisión T15 · crear sesión en el backend simulado: la regla del título es la única (isValidSessionTitle)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const ROOT = '/Users/seba/Universidad/Reactivas/proyecto/frontend';
const OUT = new URL('./mockApi.bundle.mjs', import.meta.url).pathname;
const banner = `const __m = new Map(); globalThis.localStorage = { getItem: (k) => (__m.has(k) ? __m.get(k) : null), setItem: (k, v) => void __m.set(k, String(v)), removeItem: (k) => void __m.delete(k), clear: () => __m.clear() };`;
execFileSync(`${ROOT}/node_modules/.bin/esbuild`, [`${ROOT}/src/services/mock/mockApi.ts`, '--bundle', '--format=esm', '--platform=node', `--outfile=${OUT}`, `--tsconfig=${ROOT}/tsconfig.app.json`, '--define:import.meta.env={"VITE_MOCK_LATENCY":"0","VITE_USE_MOCK_API":"true"}', `--banner:js=${banner}`], { stdio: 'inherit' });
const { mockApi: api } = await import(pathToFileURL(OUT).href);
test('crear: mismos casos que isValidSessionTitle', async () => {
  const me = await api.auth.login({ email: 'demo@teammatchup.gg', password: 'demo1234' });
  const game = (await api.users.listAccounts(me.id))[0].gameId;
  const mk = (title) => api.sessions.create({ gameId: game, title, notes: '', day: 1, startHour: 20, durationHours: 2, slots: 4 });
  const T = 'El título debe tener entre 3 y 60 caracteres.';
  for (const bad of ['ab', '  ab  ', '　ab　', '', '   ', 'Ranked\tnoche', 'Ranked\u0085noche', 'Ranked noche\u0085', 'Ranked noche', '🎮'.repeat(61)])
    await assert.rejects(mk(bad), (e) => e.status === 400 && e.message === T, JSON.stringify(bad));
  for (const [good, saved] of [['\tRanked\t', 'Ranked'], [' Ranked ', 'Ranked'], ['Ranked noche', 'Ranked noche'], ['🎮'.repeat(60), '🎮'.repeat(60)], ['​ab', '​ab']])
    assert.equal((await mk(good)).title, saved, JSON.stringify(good));
  await assert.rejects(api.sessions.create({ gameId: game, title: 'Ranked', notes: 'a'.repeat(161), day: 1, startHour: 20, durationHours: 2, slots: 4 }), (e) => e.message === 'Las notas deben ser texto de hasta 160 caracteres.');
});
```
```
ok 1 - crear: mismos casos que isValidSessionTitle   (# pass 1, # fail 0)
```
Nota: este cambio toca código de la 007 (`mockApi.ts`), fuera de los archivos que T15 permitía; se hizo por decisión
expresa del usuario.

**Revisión 2. Estilo y seguridad.** Sobre los 30 archivos nuevos o modificados de `frontend/src`:
`xargs grep -nE "#[0-9a-fA-F]{3,8}|rgb\(|hsl\("` → una sola coincidencia, `mockApi.ts:745`
(`avatarColor: '#6d5efc'`, dato de un usuario nuevo del modo simulado, de la 007; `git diff` no la toca); líneas
añadidas a `global.css` y `sessionSlip.css`: 0 colores. `grep -rn "fetch(" frontend/src` (sin `refetch(`) →
solo `services/http/httpClient.ts:57`. `grep -rnE "dangerouslySetInnerHTML|innerHTML"` → sin resultados.
`grep -nE ": any|as any|@ts-ignore|\.only"` → sin resultados. **Conclusión:** sin hallazgos.

**Revisión 3. Backend simulado frente a la 006.** `controllers/sessions.ts` (`PUT /:id`) fija el orden: cuerpo →
sesión → formato → existencia → anfitrión → datos → RF-8. `mockApi.sessions.update` sigue el mismo orden: cuerpo
no objeto → 400 «JSON mal formado»; autorizar; `findSession` (formato 400, existencia 404); anfitrión 403 «Solo quien
organiza puede editar la sesión.»; `validateSessionEdit` (título → notas → día → hora → duración → cupos); cupos bajo
inscritos 400; estado recalculado. Textos: comparación programática de las 16 claves de `SESSION_ERRORS` del
frontend con la del backend → 0 diferencias (los textos de `join`/`leave`/`cancel` del mock son los de
`MESSAGES.session*`, que coinciden con los del backend). Diferencia aceptada y documentada: el servidor real
valida el identificador como `ObjectId` (`isValidId`) y el simulado como `session-<número>` (D-16, Q20).
**Conclusión:** sin hallazgos.

**Revisión 4. Rama defensiva y nueva lectura fallida.** (a) Código: en `useDetailController.reread`, si el rol
de la nueva lectura no es `host` y hay formulario o ventana abiertos, se cierran, el mensaje pasa a la zona y el
foco sigue `rereadArrived`; se ejerció en el navegador en T12 (caso 4) y T14 (403). (b) `keep`: la nueva lectura
no es una consulta de la página (`rereadSession` llama a la API directamente), así que un fallo suyo no puede
producir el error de RF-13. Prueba en el navegador (`scratchpad/br/t15.mjs`, no se versiona): rechazo 409 y nueva
lectura con 500 →
```
OK  nueva lectura fallida (500): el detalle sigue igual con el mensaje del rechazo — {"h1":"doc-title session-detail__title","title":"Noche de clasificatorias","msg":"Esta sesión ya no admite jugadores.","reads":1,"btn":"Unirme","pageError":false}
OK  nueva lectura fallida: no aparece el error de página de RF-13
OK  nueva lectura fallida: el foco queda en el botón de origen
OK  nueva lectura fallida: botones desbloqueados
consola: sin errores
```
**Conclusión:** sin hallazgos.

**Revisión 5. Backend.** `git status --short backend` → vacío: ningún archivo de `backend/` cambió en la 009.

**Estado de T15:** las cinco revisiones tienen comando, resultado y conclusión, y no queda ningún hallazgo abierto
(D-1 cerrado). Verificación estándar tras el cambio: `tsc -b`, `lint` y `build` en verde.

## Modo simulado
Registrado tarea por tarea (T5, T10 a T14) y, de forma resumida, en «Recorrido manual», criterio 9.

## Recorrido manual (T16, 2026-10-20 y 2026-10-21)

**Entorno.** Servidor real: MongoDB local con base temporal `tmu_t16_tmp` (**borrada al terminar**; `teammatchup` sin
tocar), `backend` con Node v22.18.0 (`node src/index.ts`, puerto 3411, variables de entorno del proceso, sin crear
`backend/.env`; hizo falta `npm ci` en `backend/`, que solo escribe en `node_modules`, ignorado por git), Vite en :5411 con
`VITE_PROXY_TARGET`, sin `VITE_USE_MOCK_API`. Tres perfiles de Chrome 156 headless por CDP (A, B y C; C con dos pestañas P1 y P2),
cuentas reales A (Ana), B (Beto) y C (Cami); A y B con cuenta de LoL y C sin ella. La red limitada se emula con
`Network.emulateNetworkConditions` («3G lenta» = 2000 ms de latencia y 50 KB/s; y 40 000 ms para el plazo), el servidor
apagado se hace parando el proceso, y el bloqueo de la URL con `Network.setBlockedURLs`. Scripts desechables en
`scratchpad/br/` (`p0`…`p7`, no se versionan). **Aviso del montaje:** una pestaña en segundo plano de Chrome headless no
termina las animaciones de salida de la agenda, así que cada pestaña se trae al primer plano (`Page.bringToFront`) antes de
manejarla; sin eso, una navegación desde una pestaña oculta parecía no terminar.

### Criterio 1 — pasos 1 a 9 (servidor real; A crea LoL, lunes 23:00, 4 h, 2 cupos, `<b>x</b>`, sin notas)
```
OK  paso 1: «Sesión abierta» y «Mis sesiones» muestran «Ver detalle» — Ver detalle de <b>x</b> | Ver detalle de <b>x</b> | bloque: <b>x</b>, Lunes 23:00, 1 de 2 jugadores
OK  paso 1: A abre el detalle desde la tarjeta — /agenda/6ad828396c076e94f860abd6
OK  paso 2: LoL, <b>x</b> literal, sin notas, rango y cupos — {"game":"League of Legends","h1":"<b>x</b>","notes":false,"full":false,"host":"organiza","stamp":["La organizas"],"free":1,"btns":["Editar sesión","Cancelar sesión"],"bold":false}
OK  paso 2: «organiza», «La organizas», un «cupo libre», solo Editar y Cancelar — ["Editar sesión","Cancelar sesión"]
OK  paso 2: aviso «Datos de demostración» en barra y pie con el servidor real — 2
OK  paso 3: formulario con los valores actuales y cupos de 2 a 6, foco en «Título» — {"t":"<b>x</b>","n":"","d":"0","h":"23","du":"4","sl":"2","opts":"2,3,4,5,6","foco":true}
OK  paso 3: «ab» → mensaje y sin petición — []
OK  paso 3: «Descartar» cierra el formulario sin petición
OK  paso 3: al reabrir trae los valores de la sesión
OK  paso 4: guarda, cierra, «Cambios guardados.» y la sesión actualizada sin recargar — PUT /api/sessions/6ad828396c076e94f860abd6
OK  paso 4: al reabrir el formulario el texto desaparece
OK  paso 5: B abre la dirección compartida (cualquier rol lo ve)
OK  paso 5: B se suma y ve «Estás dentro» y «2/3 jugadores» — 2/3 jugadores
OK  paso 5: …con el foco en «Salir» — BUTTON:Salir
OK  paso 5: B sale y vuelve a «1/3 jugadores»
OK  paso 5: B se suma de nuevo
OK  paso 6: C (sin cuenta de LoL) ve «Unirme» habilitado
OK  paso 6: con B dentro la lista de cupos va de 2 a 6 — 2,3,4,5,6
OK  paso 6: A baja los cupos a 2 y aparece «Cupos llenos»
OK  paso 7: P2 muestra «Sin cupos» bloqueado (aria-disabled) — {"t":"Sin cupos","ad":"true","dis":false}
OK  paso 7: «Sin cupos» se alcanza con Tab — BUTTON:Sin cupos
OK  paso 7: activarlo no hace peticiones — []
OK  paso 7: P1 pulsa «Unirme» con datos viejos → mensaje 409 en la zona — Esta sesión ya no admite jugadores.
OK  paso 7: la nueva lectura muestra «Sin cupos» y «Cupos llenos» con el mensaje visible — ["POST /api/sessions/6ad828396c076e94f860abd6/join","GET /api/sessions/6ad828396c076e94f860abd6"]
OK  paso 7: el foco queda en «Sin cupos» — BUTTON:Sin cupos
OK  paso 7: C en la agenda sin recargar: «Mis sesiones» — {"title":"Mis sesiones","block":"Ranked editado, Miércoles 21:00, 2 de 2 jugadores"}
OK  paso 7: el bloque de la sesión muestra «LoL · 2/2» — ["Ranked editado, Miércoles 21:00, 2 de 2 jugadores | Ranked editadoLoL · 2/2"]
OK  paso 7: «Sesión abierta» con sello «Cupos llenos» y botón «Sin cupos» — {"title":"Sesión abierta","full":true,"btn":["Sin cupos[disabled]"]}
OK  paso 8: el enlace propio lleva al perfil — /perfil
OK  paso 8: «Atrás» vuelve al detalle con la petición de la sesión, estado de carga y foco en el título — GET /api/sessions/6ad828396c076e94f860abd6 | carga=null | foco=H1:Ranked editado
OK  paso 8: el enlace de B abre su ficha en la pestaña LoL — /jugadores/6ad828366c076e94f860abba?juego=lol
OK  paso 8: «Atrás» desde la ficha vuelve al detalle con la misma petición y foco en el título — GET /api/sessions/6ad828396c076e94f860abd6 | H1:Ranked editado
OK  paso 9: ventana «¿Cancelar esta sesión?» con su texto y el foco en «Volver»
OK  paso 9: «Volver» cierra sin peticiones y el foco vuelve a «Cancelar sesión» — BUTTON:Cancelar sesión
OK  paso 9: «Sí, cancelar sesión» lleva a la agenda sin la sesión y con el foco en el título del panel — {"p":"/agenda","card":false,"foco":"H2:Mis sesiones","hl":21}
OK  paso 9: «Atrás» no vuelve al detalle cancelado — /agenda
```
Nota del paso 8: el estado de carga al volver con «Atrás» dura menos que el muestreo (250 ms) con el servidor local; su
visibilidad se comprobó con la red limitada en «Estados» (`Cargando…` visible a 3G lenta).

### Criterio 2 — Agenda (cancelar con confirmación; servidor apagado y 3G lenta)
```
OK  agenda: «Cancelar sesión» abre la misma ventana
OK  agenda: Escape no cancela
OK  agenda: «Volver» no cancela
OK  servidor apagado: la ventana sigue abierta con el texto de error sin mensaje y la tarjeta sigue — No se pudo conectar con el servidor. Inténtalo de nuevo.
OK  servidor apagado: el foco queda en «Sí, cancelar sesión» — BUTTON:Sí, cancelar sesión
OK  3G lenta, en curso: «Sí, cancelar sesión» deshabilitado con «Enviando…» — ["Cerrar[aria-disabled]","Volver[aria-disabled]","Enviando…[disabled]"]
OK  3G lenta, en curso: el foco visible está en el título de la ventana — {"btns":["Cerrar[aria-disabled]","Volver[aria-disabled]","Enviando…[disabled]"],"foco":"H2:¿Cancelar esta sesión?","vis":"solid 2px"}
OK  3G lenta, en curso: Escape, «Volver», cerrar y pulsar fuera no cierran
OK  3G lenta, en curso: Tab y Mayús+Tab recorren «Volver» y cerrar sin salir de la ventana — Cerrar → Volver → Cerrar → Volver → Cerrar → Volver → Cerrar
OK  3G lenta, 204: la ventana se cierra, la tarjeta desaparece y el foco queda en el título del panel — H2:Mis sesiones
OK  servidor apagado + 3G lenta: en curso el foco está en el título; al llegar el error vuelve a «Sí, cancelar sesión» — H2:¿Cancelar esta sesión? → BUTTON:Sí, cancelar sesión
OK  404: aparece el mensaje del 404 en la ventana — Sesión no encontrada.
OK  404: la tarjeta desaparece (la agenda vuelve a pedir)
OK  404: Escape cierra y el foco queda en el título del panel — H2:Mis sesiones
OK  404: el siguiente Tab sigue desde el título del panel — {"t":"A:Ana","after":true}
```

### Criterio 3 — Estados (3G lenta, servidor apagado, bloqueo de la URL, plazo, dos pestañas)
Parte 1:
```
OK  3G lenta: al abrir el detalle se ve «Cargando…»
OK  3G lenta: al sumarse el botón aparece deshabilitado con «Enviando…» — {"t":"Enviando…","d":true}
OK  3G lenta: al responder 200 el foco queda visible en «Salir» — BUTTON:Salir
OK  3G lenta: B pulsa «Salir» y «Atrás» en curso: la agenda no muestra mensajes ni mueve el foco — {"p":"/agenda","alerts":0,"foco":"BODY"}
OK  3G lenta: al llegar la respuesta la agenda refleja la salida sin recargar — servidor: B dentro=false
OK  R17: la agenda de C muestra los cupos que leyó el detalle (2 de 4) — Estados uno, Viernes 20:00, 2 de 4 jugadores
OK  estado vacío con «abc» — {"h":"Esta sesión no existe","d":true,"l":["Ir a la agenda"],"f":true}
OK  estado vacío con un identificador válido inexistente — {"h":"Esta sesión no existe","d":true,"l":["Ir a la agenda"],"f":true}
OK  «Ir a la agenda» lleva a la agenda
OK  con la sesión cerrada: el detalle lleva a login y, al entrar, vuelve al detalle — /login → /agenda/6ad8292eab007608abcbbcfd
```
Parte 2:
```
OK  servidor apagado + «Ver detalle»: error de RF-13 con «Reintentar», sin llevar a login y con una sola petición — {"h":"No se pudo conectar con el servidor. Inténtalo de nuevo.","retry":true,"p":"/agenda/6ad8296dab007608abcbbd8b","detail":false} peticiones=1
OK  al encender el servidor «Reintentar» carga el detalle y el foco va al título — H1:Estados dos
OK  URL de obtener la sesión bloqueada: recargar da el error de RF-13 con el foco en el mensaje — {"h":"No se pudo conectar con el servidor. Inténtalo de nuevo.","f":true}
OK  al desbloquearla «Reintentar» carga el detalle y el foco va al título — H1:Estados dos
OK  3G lenta: mientras «Reintentar» espera el error sigue visible, el botón en curso con el foco, sin «Cargando…» — {"ad":"true","foco":true,"error":true,"carga":false}
OK  3G lenta: pulsarlo otra vez no hace otra petición — ["GET /api/sessions/6ad8296dab007608abcbbd8b"]
OK  servidor apagado, recargar el detalle: pantalla de error de la spec 007 (RF-5), no el error del detalle — No se pudo comprobar tu sesión | No se pudo conectar con el servidor. Inténtalo de nuevo. | Reintentar
OK  servidor apagado y detalle abierto: «Unirme» da el texto de error sin mensaje y no hace nueva lectura — No se pudo conectar con el servidor. Inténtalo de nuevo. | ["POST /api/sessions/6ad8296dab007608abcbbd8b/join"] | BUTTON:Unirme
OK  volver el foco a la ventana con el detalle abierto no hace peticiones — []
OK  dos pestañas de A: cancelar en una y editar en la otra muestra el estado vacío con el foco — {"h":"Esta sesión no existe","f":true,"form":false}
OK  …y el siguiente Tab llega a «Ir a la agenda» — A:Ir a la agenda
OK  «Ir a la agenda» hace una petición de las sesiones y la tarjeta no aparece — ["GET /api/sessions/6ad8296dab007608abcbbd8b","GET /api/accounts?user=me","GET /api/users/me/availability","GET /api/sessions?game=all"]
```
Plazo de 30 s con 40 s de latencia (en la apertura se precargó el trozo de código del detalle, porque con 40 s de latencia
también tarda 40 s su descarga; se mide el plazo de la lectura):
```
OK  latencia de 40 s: a los 29 s sigue «Cargando…» y a los 30 s el texto de error sin mensaje al abrir con «Ver detalle» — 29 s: Cargando… | 32,5 s: {"h":"No se pudo conectar con el servidor. Inténtalo de nuevo.","retry":true}
OK  latencia de 40 s: a los 29 s «Enviando…» y a los 30 s el texto de error sin mensaje en una acción — 29 s: Enviando… | No se pudo conectar con el servidor. Inténtalo de nuevo. | BUTTON:Unirme
```

### Criterios 4 y 5 — Bloqueos y formulario; cupos con datos viejos; hora fuera del horario
```
OK  3G lenta: «Guardar cambios» en curso aparece deshabilitado con «Enviando…» — [{"t":"Descartar","d":false,"ad":"true"},{"t":"Enviando…","d":true,"ad":null}]
OK  3G lenta: «Descartar» y «Cancelar sesión» están bloqueados con aria-disabled (no disabled) — [{"t":"Cancelar sesión","d":false,"ad":"true"},{"t":"Descartar","d":false,"ad":"true"},{"t":"Enviando…","d":true,"ad":null}]
OK  3G lenta: «Descartar» y «Cancelar sesión» se alcanzan con Tab y no hacen nada — BUTTON:Cancelar sesión, BUTTON:Descartar
OK  3G lenta: al responder 200 el foco queda visible en «Editar sesión» — BUTTON:Editar sesión
OK  «Cambios guardados.» visible tras guardar
OK  con «Cambios guardados.» visible, abrir la ventana no lo oculta
OK  con el formulario abierto, «Cancelar sesión» abre la ventana y Tab / Mayús+Tab no salen de ella — [true,true,true,true,true,true,true,true]
OK  «Volver» la cierra con el formulario intacto
OK  Intro en «Título» con «ab»: texto de RF-22, sin petición y el foco en el campo — El título debe tener entre 3 y 60 caracteres. | [] | INPUT:
FALLA formulario de creación de la agenda: el foco no se mueve al abrir, Tab no se retiene y Escape cierra (R10) — BUTTON: | tab dentro=false
OK  cupos viejos: el 400 del servidor aparece en el formulario, que sigue abierto — No puedes dejar menos cupos que jugadores inscritos.
OK  rechazo: el foco vuelve a «Guardar cambios» — BUTTON:Guardar cambios
OK  «Descartar» durante la nueva lectura: cierra el formulario sin petición y el foco va a «Editar sesión» — {"form":false,"foco":"BUTTON:Editar sesión"} guardar bloqueado=true
OK  al llegar la nueva lectura se ve «3/4 jugadores»
OK  cupos viejos: la nueva lectura muestra «3/4 jugadores», lista desde 3 con el 3 elegido y el resto sin cambios — {"t":"Escrito por A","n":"se conserva dos","h":"22","sl":"3","opts":"3,4,5,6","txt":true}
OK  hora fuera del horario: 05:00 al final de la lista tras las 01:00 y elegida — 00:00 01:00 05:00
OK  guardando sin cambios sigue a las 05:00 (servidor) — 5
```
La única línea FALLA de esa salida (R10) era un error del script (comparaba el texto del botón de la celda, que es vacío); repetida
con la comparación correcta:
```
OK  formulario de creación de la agenda: el foco no se mueve al abrir (sigue en la celda), Tab no se retiene y Escape cierra (R10) — Anotar una sesión el Lunes a las 12:00 | foco=Anotar una sesión el Lunes a las 12:00 | Tab dentro de la ventana=false
```

### Criterio 6 — Regla del título (edición, creación, notas) y «Proponer» con tabulador en el nombre visible
```
OK  edición: 60 emojis caben y el 61.º no entra
OK  edición: guardar con 60 emojis responde 200 — ["PUT 200"]
OK  edición: «tabulador interno» → texto de RF-22 y sin petición — []
OK  edición: «U+2028 interno» → texto de RF-22 y sin petición — []
OK  edición: «ab» → texto de RF-22 y sin petición — []
OK  edición: «  ab  » → texto de RF-22 y sin petición — []
OK  edición: «U+0085 solo al final» → texto de RF-22 y sin petición — []
OK  edición: «U+00A0 en los extremos + 3 caracteres» se envía (200) y se guarda recortado — ["PUT 200"] título="abc"
OK  edición: «tabulador solo en los extremos + 3 caracteres» se envía (200) y se guarda recortado — ["PUT 200"] título="abc"
OK  edición: 160 emojis en las notas caben y el 161.º no entra
OK  edición: guardar con 160 emojis en las notas responde 200 — ["PUT 200"]
OK  creación: 60 emojis caben y el 61.º no entra
OK  creación: 160 emojis en las notas caben y el 161.º no entra
OK  creación: con 60 emojis y 160 de notas responde 201 — ["POST 201","GET 200"]
OK  creación: «tabulador interno» → texto de RF-22 y sin petición — []
OK  creación: «U+2028 interno» → texto de RF-22 y sin petición — []
OK  creación: «ab» → texto de RF-22 y sin petición — []
OK  creación: «  ab  » → texto de RF-22 y sin petición — []
OK  creación: «vacío» → texto de RF-22 y sin petición — []
OK  creación: «U+0085 solo al final» → texto de RF-22 y sin petición — []
OK  creación: «U+00A0 en los extremos + 3 caracteres» se envía y responde 201 — ["POST 201","GET 200"]
OK  creación: «tabulador solo en los extremos + 3 caracteres» se envía y responde 201 — ["POST 201","GET 200"]
```
Proponer (B fija contra la API un nombre visible con tabulador interno y aparece en coincidencias con A):
```
OK  B fija contra la API un nombre visible con tabulador interno — "Beto\tTab"
OK  «Proponer» abre el formulario con «Sesión con <nombre visible>» — "Sesión con Beto\tTab"
OK  enviarlo muestra el texto de RF-22 sin petición — []
OK  tras corregir el título, crear responde 201 — ["POST 201","GET 200"]
```

### Criterio 7 — 360 px y contraste (servidor real, dos temas)
```
OK  360 px: detalle con título de 60 sin espacios y notas de 160, sin desplazamiento horizontal — {"sw":360,"iw":360}
OK  360 px: …con el formulario de edición abierto — {"sw":360,"iw":360}
OK  360 px: …con la ventana de cancelar abierta — {"sw":360,"iw":360}
OK  360 px: agenda en «Mis sesiones» con la sesión y su «Ver detalle» — {"sw":360,"iw":360}
OK  360 px: agenda en «Sesión abierta» con esa sesión — {"sw":360,"iw":360}
OK  contraste dark: vacío: título — 8.26:1 (19px)
OK  contraste dark: vacío: descripción — 5.18:1 (13px)
OK  contraste dark: vacío: enlace — 16.43:1 (13px)
OK  contraste dark: detalle: cupo libre — 5.18:1 (13px)
OK  contraste dark: detalle: organiza — 5.18:1 (9.92px)
OK  contraste dark: detalle: Cambios guardados. — 7.36:1 (13px)
OK  contraste dark: detalle: jugadores — 8.26:1 (13px)
OK  contraste dark: detalle: título — 17.13:1 (46px)
OK  contraste dark: ventana: título — 17.53:1 (19px)
OK  contraste dark: ventana: texto — 8.45:1 (13px)
OK  contraste dark: ventana: mensaje de error — 15.48:1 (13px)
OK  contraste dark: error RF-13: mensaje — 8.26:1 (19px)
OK  contraste dark: error RF-13: Reintentar — 16.43:1 (11px)
OK  contraste light: vacío: título — 7.23:1 (19px)
OK  contraste light: vacío: descripción — 4.56:1 (13px)
OK  contraste light: vacío: enlace — 15.37:1 (13px)
OK  contraste light: detalle: cupo libre — 4.56:1 (13px)
OK  contraste light: detalle: organiza — 4.56:1 (9.92px)
OK  contraste light: detalle: Cambios guardados. — 8.11:1 (13px)
OK  contraste light: detalle: jugadores — 7.23:1 (13px)
OK  contraste light: detalle: título — 16.13:1 (46px)
OK  contraste light: ventana: título — 7.42:1 (19px)
FALLA contraste light: ventana: texto — 3.33:1 (13px)
OK  contraste light: ventana: mensaje de error — 6.84:1 (13px)
OK  contraste light: error RF-13: mensaje — 7.23:1 (19px)
OK  contraste light: error RF-13: Reintentar — 15.37:1 (11px)
```
La línea FALLA «contraste light: ventana: texto 3,33:1» es un falso positivo del script: mide contra el fondo de la capa de
fondo opaco más cercana (la cortina semitransparente sobre el cuerpo), pero el texto de la ventana se pinta sobre la hoja, que
tiene un degradado casi blanco (`rgb(250, 251, 252)`). Con ese fondo, `rgb(71, 78, 88)` (`--ink-2`) da **8,11:1** (calculado
aparte). Resto: todos ≥ 4,5:1; el mínimo es 4,56:1 («organiza» y «cupo libre» en el tema claro, `--ink-3`, R-4: sin cambio).

### Criterio 8 — «Una sola petición» con la compilación de producción (R-6)
`npm run build && vite preview` (:5412, con el proxy del servidor de desarrollo):
```
OK  compilación de producción: una sola petición de la sesión al abrir 466670 por dirección — peticiones=1
OK  compilación de producción: una sola petición de la sesión al abrir 46667a por dirección — peticiones=1
OK  compilación de producción: una sola petición de la sesión al abrir con «Ver detalle» — ["GET /api/sessions/6ad82a6c1f533fb10c466670"]
```

### Criterio 9 — Modo simulado frente a servidor real
Modo simulado (`VITE_USE_MOCK_API=true`, cuenta demo), sin peticiones a `/api`:
```
OK  simulado: /agenda/session-3 abre el detalle, sin peticiones a /api, con el aviso en barra y pie — {"h":"Noche de clasificatorias","t":"Noche de clasificatorias","d":2,"n":0}
OK  simulado: /agenda/SESSION-3 abre la misma sesión — {"h":"Noche de clasificatorias","t":"Noche de clasificatorias","d":2,"n":0}
OK  simulado: /agenda/abc muestra el estado vacío — {"h":"Esta sesión no existe","d":2,"n":0}
OK  simulado: /agenda/session-999999 muestra el estado vacío — {"h":"Esta sesión no existe","d":2,"n":0}
OK  simulado: /agenda/SESSION-999999 muestra el estado vacío — {"h":"Esta sesión no existe","d":2,"n":0}
OK  simulado: abrir desde la agenda y recargar el detalle de una sesión semilla — /agenda/session-3
OK  simulado: abrir por su dirección una sesión recién creada — {"h":"Recién creada","t":"Recién creada","d":2,"n":0} session-10
```
Con el servidor real, `abc` y un identificador válido inexistente dan el mismo estado vacío (parte 1 de «Estados»); `SESSION-3` en
mayúsculas solo existe en el simulado (D-16). Los casos de RF-16 que la interfaz no provoca se revisaron en T5 (Node, 2 de 2 verde)
y T15 (revisión 3). El resto de los casos de modo simulado (editar, sumarse, salir, cancelar con confirmación y reflejo en la
agenda sin recargar) se ejercieron en T11 a T14.

### Casos revisados en código o con Node (criterios «full durante la cascada», «nueva lectura fallida» y «RF-14 403»)
«full» de 4 cupos con 3 visibles → 0 «cupo libre», «3/4 jugadores» con «Cupos llenos» y lista de 4 a 6; con `open` → 1 «cupo
libre» y lista de 3 a 6: T3 (Node, 9 de 9: `openSlotCount`, `occupancy`, `slotRange`, `slotOptions`). Nueva lectura fallida (`keep`):
T15, revisión 4 (prueba en el navegador 4 de 4). 403 y regla defensiva: T14 (24 de 24) y T15; el simulado responde 403 al editar
o cancelar una sesión ajena (T5, Node).

### Decisión del usuario sobre NVDA y Lighthouse (2026-10-21)
- **NVDA: no exigible.** Es un programa de Windows y no hay uno disponible; el usuario lo da por no exigible. Queda registrado lo
  que sí se comprobó por programa (orden y destino del foco en los 14 casos de RNF-2 y en los pasos de arriba, `aria-disabled` /
  `disabled`, `role="alert"` / `role="status"`, `tabindex="-1"` en los títulos que reciben el foco y contorno visible). Sin
  verificar y sin exigir: el texto exacto que anuncia un lector (R-5, doble lectura de un `role="alert"` enfocado).
- **Lighthouse:** no se ejecutó; los contrastes se midieron por cálculo (criterio 7).
- **«3G lenta» de Chrome tal cual:** se usó una emulación equivalente por CDP (2000 ms de latencia y 50 KB/s).

### Defecto D-2 — corregido (2026-10-21, por decisión del usuario)
**Antes:** al salir del detalle se volvía a pedir la sesión (`GET /api/sessions/<id>`, también con una sesión cancelada, que daba
404 invisible) porque `AppLayout` deja montado el elemento saliente (`AnimatePresence mode="wait"`) y su `useLocation()` ya era el
de destino: `key={location.key}` cambiaba y la página se remontaba (RF-17).
**Corrección:** `SessionDetailRoute` (`pages/SessionDetailPage.tsx`) guarda la ruta de su apertura y solo sigue a `location.key`
mientras la ubicación tiene esa misma ruta; en el elemento saliente la clave ya no cambia. Una entrada nueva del historial a la misma
dirección sigue siendo una apertura nueva (R1).
**Comprobación** (Chrome 156, modo simulado; el defecto es del cliente y no depende del servidor), `scratchpad/br/d2.mjs`:
```
OK  D-2: al salir con enlace «Agenda» de la barra no hay otra lectura de la sesión — []
OK  D-2: al salir con «Ir a la agenda» (estado vacío) no hay otra lectura de la sesión — []
OK  D-2: al salir con «Atrás» no hay otra lectura — []
OK  R1: la misma dirección con otra entrada del historial es una apertura nueva (vuelve a leer una vez) — ["session-3"]
OK  D-2: cancelar desde el detalle: sin lecturas de más y el foco queda en «Mis sesiones» — []
```
Regresión repetida sin fallos: T7, T10, T11, T12, T13 y T14 (T13 falló una vez por el límite de 50 entradas de historial del perfil de
prueba tras muchas pruebas seguidas, y pasó entero con un perfil nuevo). `tsc -b`, `lint` y `build` en verde.

### Estado de T16
Con NVDA y Lighthouse sin exigir y D-2 corregido, los criterios de finalización con evidencia posible quedan registrados y sin
defectos abiertos. La comprobación con servidor real de la corrección de D-2 no se repitió (se hizo en modo simulado, que ejerce el
mismo código del cliente).

## Entrega a la validación del reviewer (T17, 2026-10-21)
**Dependencias implementadas en la fecha de entrega:** 006 — implementada (tasks T1 a T10 `[x]`; `backend/src/controllers/sessions.ts`
tiene `GET /:id` y `PUT /:id`); 007 — implementada (plan «aprobado e implementado, T1–T31»; tasks 31 de 31 `[x]`, incluidos RF-7, RF-10 y
RF-24); 008 — implementada (tasks 11 de 11 `[x]`, incluida T9 de enlaces; RF-9, RF-15 y RF-20 cubiertos). **009:** T0 a T16 marcadas
(17 de 17). Verificación estándar: `tsc -b`, `npm run typecheck`, `npm run lint` y `npm run build` en verde; ningún archivo de `backend/`
cambió en la 009. **La validación del reviewer puede empezar.**

Decisiones y salvedades que el reviewer debe conocer: NVDA y Lighthouse no se ejecutaron (NVDA dado por no exigible por el usuario el
2026-10-21; contrastes medidos por cálculo); D-1 (regla del título duplicada en `mockApi.ts`, código de la 007) y D-2 (remontaje de la
página al salir) se corrigieron por decisión del usuario; `npm run typecheck` no comprueba nada en este proyecto (`tsconfig.json` solo
tiene `references`), los tipos los comprueba `tsc -b` dentro de `npm run build`. **Aviso al coordinador:** actualizar `MEMORY.md` al cerrar
la fase (el planner y el implementer de la 009 no escriben fuera de lo que indica cada tarea).
