// Tabla en Markdown con la medida de un elemento por tipo y por vista de referencia (línea base de RF-3).
//   node table.mjs <measures.json> [vista-clave ...]
import fs from 'node:fs';
const [file, ...views] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const ids = views.length ? views : ['agenda__1280__dark', 'agenda__375__dark', 'perfil__1280__light'];
console.log('| Vista | Tipo | Elemento | Fondo | Texto | Borde | Radio | Letra | Caja (ancho×alto) | Líneas |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const id of ids) {
  const v = data.views[id];
  if (!v || v.error) { console.log(`| ${id} | — | ${v?.error ?? 'sin datos'} | | | | | | | |`); continue; }
  const seen = new Set();
  for (const i of v.items) {
    if (seen.has(i.kind)) continue;
    seen.add(i.kind);
    console.log(`| ${id} | ${i.kind} | ${i.key.split('|')[1]} | ${i.bg} | ${i.color} | ${i.borderWidth} ${i.borderColor} | ${i.radius} | ${i.fontFamily} ${i.fontSize}/${i.fontWeight} | ${i.w}×${i.h} | ${i.lines} |`);
  }
}
