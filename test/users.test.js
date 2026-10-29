const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseUsers, PADRAO } = require('../src/users');

test('sem variável (ou vazia) usa Thiago e Carla', () => {
  assert.deepEqual(parseUsers(undefined), PADRAO);
  assert.deepEqual(parseUsers(''), PADRAO);
  assert.deepEqual(parseUsers('  , ,'), PADRAO);
});

test('separa por vírgula, limpa espaços e mantém a ordem', () => {
  assert.deepEqual(parseUsers('Ana, Bruno ,  Maria   Clara'), ['Ana', 'Bruno', 'Maria Clara']);
});

test('ignora nomes repetidos (sem diferenciar maiúsculas)', () => {
  assert.deepEqual(parseUsers('Ana,ana,Bruno,ANA'), ['Ana', 'Bruno']);
});

test('aceita um único usuário', () => {
  assert.deepEqual(parseUsers('Ana'), ['Ana']);
});

test('nome longo demais é recusado', () => {
  assert.throws(() => parseUsers('x'.repeat(51)), /passa de 50/);
});
