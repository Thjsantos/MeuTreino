const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const carregar = arquivo => {
  const s = fs.readFileSync(path.join(__dirname, '..', 'public', 'dados', arquivo), 'utf8');
  return JSON.parse(s.slice(s.indexOf('=') + 1, s.lastIndexOf(';')));
};
const base = carregar('exercises.js');
const pt = carregar('exercises_pt.js');

test('todo exercício da base tem tradução com nome', () => {
  const sem = base.filter(e => !pt[e.id]?.n?.trim()).map(e => e.id);
  assert.deepEqual(sem, []);
});

test('a tradução tem instruções sempre que a base original tem', () => {
  const sem = base.filter(e => e.instructions.length && !pt[e.id].i.length).map(e => e.id);
  assert.deepEqual(sem, []);
});

test('não há ids na tradução que não existam na base', () => {
  const ids = new Set(base.map(e => e.id));
  assert.deepEqual(Object.keys(pt).filter(id => !ids.has(id)), []);
});

test('os textos estão com a acentuação íntegra (UTF-8)', () => {
  const todos = JSON.stringify(pt);
  assert.ok(!todos.includes('�'), 'há caracteres de substituição (�)');
  assert.match(todos, /ç|ã|é/);
});
