// Gera exercises_pt.js (nomes e instruções em português) a partir da tradução
// https://github.com/joao-gugel/exercicios-bd-ptbr (CC0), fixada num commit para ser reproduzível.
// Uso: node scripts/gerar-exercicios-pt.js
const fs = require('node:fs');
const path = require('node:path');

const COMMIT = '6bb9118e46cf8d0ee98b42e0285bae5036d04a19';
const URL = `https://raw.githubusercontent.com/joao-gugel/exercicios-bd-ptbr/${COMMIT}/exercises/exercises-ptbr-minimal.json`;
const DESTINO = path.join(__dirname, '..', 'exercises_pt.js');

(async () => {
  const lista = await (await fetch(URL)).json();
  const novo = Object.fromEntries(lista.map(e => [e.id, e]));

  // Ids que a tradução nova não cobre continuam com a tradução anterior (se existir).
  let anterior = {};
  try { const s = fs.readFileSync(DESTINO, 'utf8'); anterior = JSON.parse(s.slice(s.indexOf('=') + 1, s.lastIndexOf(';'))); } catch { /* primeira geração */ }

  const base = fs.readFileSync(path.join(__dirname, '..', 'exercises.js'), 'utf8');
  const ids = JSON.parse(base.slice(base.indexOf('=') + 1, base.lastIndexOf(';'))).map(e => e.id);

  const pt = {};
  const sem = [];
  for (const id of ids) {
    if (novo[id]) pt[id] = { n: novo[id].name, i: novo[id].instructions };
    else if (anterior[id]) { pt[id] = anterior[id]; sem.push(id); }
  }
  fs.writeFileSync(DESTINO, 'window.PT=' + JSON.stringify(pt) + ';');
  console.log(`${Object.keys(pt).length} exercícios gravados em exercises_pt.js`);
  if (sem.length) console.log('Mantida a tradução anterior de:', sem.join(', '));
})();
