// Reporter do node:test que gera um resumo em Markdown (usado no GitHub Actions).
// Uso: node --test --test-reporter=./scripts/resumo-testes.js --test-reporter-destination=resumo-testes.md
const path = require('node:path');

const escapar = s => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const tempo = ms => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);

module.exports = async function* resumo(source) {
  const testes = [];
  for await (const ev of source) {
    if (ev.type !== 'test:pass' && ev.type !== 'test:fail') continue;
    const { name, file, details = {}, skip, todo } = ev.data;
    if (details.type === 'suite') continue;
    const status = ev.type === 'test:fail' ? 'falhou' : (skip || todo) ? 'ignorado' : 'passou';
    const erro = details.error?.cause?.message || details.error?.message || '';
    testes.push({ name, status, ms: details.duration_ms || 0, erro, arquivo: file ? path.relative(process.cwd(), file) : '(geral)' });
  }

  const por = s => testes.filter(t => t.status === s);
  const falhas = por('falhou'), ignorados = por('ignorado');
  const total = testes.reduce((n, t) => n + t.ms, 0);
  const icone = { passou: '✅', falhou: '❌', ignorado: '⏭️' };

  let md = `## 🧪 Resultado dos testes\n\n`;
  md += falhas.length ? `### ❌ ${falhas.length} teste(s) falharam\n\n` : `### ✅ Todos os testes passaram\n\n`;
  md += `| ✅ Passaram | ❌ Falharam | ⏭️ Ignorados | Total | Tempo |\n|---:|---:|---:|---:|---:|\n`;
  md += `| ${por('passou').length} | ${falhas.length} | ${ignorados.length} | ${testes.length} | ${tempo(total)} |\n\n`;

  const arquivos = [...new Set(testes.map(t => t.arquivo))];
  for (const arq of arquivos) {
    const doArq = testes.filter(t => t.arquivo === arq);
    md += `#### \`${arq.replace(/\\/g, '/')}\` (${doArq.filter(t => t.status === 'passou').length}/${doArq.length})\n\n`;
    md += `| | Teste | Tempo |\n|:-:|---|---:|\n`;
    for (const t of doArq) md += `| ${icone[t.status]} | ${escapar(t.name)} | ${tempo(t.ms)} |\n`;
    md += `\n`;
  }

  if (falhas.length) {
    md += `### Detalhes das falhas\n\n`;
    for (const t of falhas) {
      md += `<details open><summary>❌ ${escapar(t.name)}</summary>\n\n\`\`\`\n${t.erro || '(sem mensagem)'}\n\`\`\`\n\n</details>\n\n`;
    }
  }
  yield md;
};
