const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderHtml, renderMarkdown, totais, contexto } = require('../scripts/gerar-relatorio');

const ctx = contexto({});
const ok = (nome, ms = 5) => ({ nome, arquivo: 'test/a.test.js', status: 'passou', ms, erro: '' });
const ruim = nome => ({ nome, arquivo: 'test/a.test.js', status: 'falhou', ms: 9, erro: 'esperado 1, veio 2' });

test('conta passaram, falharam e ignorados', () => {
  const t = totais([ok('a'), ruim('b'), { ...ok('c'), status: 'ignorado' }]);
  assert.deepEqual([t.passaram, t.falharam, t.ignorados, t.total], [1, 1, 1, 3]);
});

test('html: tudo passou mostra faixa verde e o total', () => {
  const html = renderHtml({ testes: [ok('a'), ok('b')], openapi: { ok: true, caminhos: 7 }, ctx });
  assert.match(html, /class="banner ok"[^>]*>✅ Todos os 2 testes passaram/);
  assert.match(html, /openapi\.yaml válido/);
});

test('html: falha mostra faixa vermelha e o erro', () => {
  const html = renderHtml({ testes: [ok('a'), ruim('quebrou')], openapi: null, ctx });
  assert.match(html, /class="banner bad"[^>]*>❌ 1 de 2 testes falharam/);
  assert.match(html, /esperado 1, veio 2/);
});

test('html: openapi inválido deixa o relatório vermelho mesmo com testes verdes', () => {
  const html = renderHtml({ testes: [ok('a')], openapi: { ok: false, erro: 'yaml quebrado' }, ctx });
  assert.match(html, /class="banner bad"/);
  assert.match(html, /yaml quebrado/);
});

test('html: sem resultados avisa em vez de dizer que passou', () => {
  const html = renderHtml({ testes: [], openapi: null, ctx });
  assert.match(html, /Nenhum resultado de teste encontrado/);
  assert.doesNotMatch(html, /Todos os/);
});

test('html: escapa o que vem dos testes (nome e mensagem de erro)', () => {
  const html = renderHtml({ testes: [{ ...ruim('<script>alert(1)</script>'), erro: '<img src=x onerror=1>' }], openapi: null, ctx });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('markdown: tabela por arquivo e escape de |', () => {
  const md = renderMarkdown({ testes: [ok('usa | barra')], openapi: { ok: true, caminhos: 7 } });
  assert.match(md, /Todos os testes passaram/);
  assert.match(md, /usa \\| barra/);
  assert.match(md, /openapi\.yaml válido/);
});

test('html: arquivo só com teste ignorado não ganha ❌', () => {
  const html = renderHtml({ testes: [ok('a'), { ...ok('b'), status: 'ignorado' }], openapi: null, ctx });
  assert.match(html, /1\/2 ✅/);
});
