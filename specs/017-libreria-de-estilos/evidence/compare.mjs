// Compara dos `measures.json` (línea base y «después») con los criterios de RF-3. Uso:
//   node compare.mjs <base/measures.json> <despues/measures.json> [--kind=button,chip] [--view=^login] [--quiet]
// Diferencias que informa: colores, grosor, radio, letra (iguales), caja (±2 px), más líneas de texto
// que la base y ancho desplazable nuevo. Los elementos que no aparecen en uno de los dos se cuentan aparte.
import fs from 'node:fs';

const [a, b, ...flags] = process.argv.slice(2);
const opt = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.split('=')[1];
const kinds = opt('kind')?.split(',');
const viewRe = opt('view') ? new RegExp(opt('view')) : null;
const quiet = flags.includes('--quiet');
const base = JSON.parse(fs.readFileSync(a, 'utf8'));
const next = JSON.parse(fs.readFileSync(b, 'utf8'));

const EXACT = ['bg', 'color', 'borderColor', 'borderWidth', 'radius', 'fontFamily', 'fontSize', 'fontWeight'];
let compared = 0;
let diffs = 0;
let onlyBase = 0;
let onlyNext = 0;
const lines = [];

for (const [id, v0] of Object.entries(base.views)) {
  if (viewRe && !viewRe.test(id)) continue;
  const v1 = next.views[id];
  if (!v1 || v0.error || v1.error) {
    lines.push(`${id}: ${v1?.error ?? v0.error ?? 'falta en el segundo'}`);
    continue;
  }
  if (v1.scrollWidth > v1.innerWidth && !(v0.scrollWidth > v0.innerWidth)) {
    lines.push(`${id}: ancho desplazable nuevo (${v0.scrollWidth} → ${v1.scrollWidth} > ${v1.innerWidth})`);
    diffs++;
  }
  const map1 = new Map(v1.items.map((i) => [i.key, i]));
  const keys0 = new Set();
  for (const i0 of v0.items) {
    if (kinds && !kinds.includes(i0.kind)) continue;
    keys0.add(i0.key);
    const i1 = map1.get(i0.key);
    if (!i1) {
      onlyBase++;
      if (!quiet) lines.push(`${id}: solo en la base → ${i0.key}`);
      continue;
    }
    compared++;
    const d = [];
    for (const f of EXACT) if (i0[f] !== i1[f]) d.push(`${f} ${i0[f]} → ${i1[f]}`);
    if (Math.abs(i0.w - i1.w) > 2) d.push(`ancho ${i0.w} → ${i1.w}`);
    if (Math.abs(i0.h - i1.h) > 2) d.push(`alto ${i0.h} → ${i1.h}`);
    if (i1.lines > i0.lines) d.push(`líneas ${i0.lines} → ${i1.lines}`);
    if (i0.disabled !== i1.disabled) d.push(`deshabilitado ${i0.disabled} → ${i1.disabled}`);
    if (d.length) {
      diffs++;
      lines.push(`${id}: ${i0.key}: ${d.join('; ')}`);
    }
  }
  for (const i1 of v1.items) {
    if (kinds && !kinds.includes(i1.kind)) continue;
    if (!keys0.has(i1.key)) {
      onlyNext++;
      if (!quiet) lines.push(`${id}: solo en el segundo → ${i1.key}`);
    }
  }
}
console.log(lines.join('\n'));
console.log(`\nComparados ${compared} elementos; ${diffs} con diferencias; ${onlyBase} solo en la base; ${onlyNext} solo en el segundo.`);
process.exitCode = diffs ? 1 : 0;
