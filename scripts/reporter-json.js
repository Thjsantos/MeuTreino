// Reporter do node:test que grava os resultados em JSON (lido por scripts/gerar-relatorio.js).
// Uso: node --test --test-reporter=./scripts/reporter-json.js --test-reporter-destination=resultados-testes.json
const path = require('node:path');

module.exports = async function* reporterJson(source) {
  const testes = [];
  for await (const ev of source) {
    if (ev.type !== 'test:pass' && ev.type !== 'test:fail') continue;
    const { name, file, details = {}, skip, todo } = ev.data;
    if (details.type === 'suite') continue;
    testes.push({
      nome: name,
      arquivo: file ? path.relative(process.cwd(), file).replace(/\\/g, '/') : '(geral)',
      status: ev.type === 'test:fail' ? 'falhou' : (skip || todo) ? 'ignorado' : 'passou',
      ms: Math.round((details.duration_ms || 0) * 100) / 100,
      erro: details.error?.cause?.message || details.error?.message || '',
    });
  }
  yield JSON.stringify({ testes });
};
