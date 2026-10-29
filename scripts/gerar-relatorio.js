// Gera o relatório dos testes a partir de resultados-testes.json (e resultado-openapi.json, se existir):
//  - relatorio-testes.html: página única e autocontida (abre em qualquer navegador)
//  - resumo em Markdown na aba "Summary" da execução do GitHub Actions ($GITHUB_STEP_SUMMARY)
// Uso: node scripts/gerar-relatorio.js
const fs = require('node:fs');
const path = require('node:path');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tempo = ms => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`);
const ICONE = { passou: '✅', falhou: '❌', ignorado: '⏭️' };

function totais(testes) {
  const n = s => testes.filter(t => t.status === s).length;
  return { passaram: n('passou'), falharam: n('falhou'), ignorados: n('ignorado'), total: testes.length, ms: testes.reduce((a, t) => a + t.ms, 0) };
}
function porArquivo(testes) {
  const mapa = new Map();
  for (const t of testes) mapa.set(t.arquivo, [...(mapa.get(t.arquivo) || []), t]);
  return [...mapa];
}
// de onde veio esta execução (GitHub Actions ou máquina local)
function contexto(env = process.env) {
  let evento = {};
  try { if (env.GITHUB_EVENT_PATH) evento = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8')); } catch { /* sem payload */ }
  const repo = env.GITHUB_REPOSITORY || '';
  const servidor = env.GITHUB_SERVER_URL || 'https://github.com';
  const pr = evento.pull_request?.number;
  return {
    local: !env.GITHUB_ACTIONS,
    repo,
    ramo: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || '',
    sha: (evento.pull_request?.head?.sha || env.GITHUB_SHA || '').slice(0, 7),
    pr,
    prUrl: pr && repo ? `${servidor}/${repo}/pull/${pr}` : '',
    execucao: env.GITHUB_RUN_NUMBER ? `#${env.GITHUB_RUN_NUMBER}` : '',
    execucaoUrl: env.GITHUB_RUN_ID && repo ? `${servidor}/${repo}/actions/runs/${env.GITHUB_RUN_ID}` : '',
    evento: env.GITHUB_EVENT_NAME || '',
    node: process.version,
    quando: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' }),
  };
}

function renderMarkdown({ testes, openapi }) {
  const t = totais(testes);
  const ok = t.falharam === 0 && t.total > 0 && (!openapi || openapi.ok);
  let md = `## 🧪 Resultado dos testes\n\n`;
  md += t.total === 0 ? `### ⚠️ Nenhum resultado de teste encontrado\n\n`
    : t.falharam ? `### ❌ ${t.falharam} teste(s) falharam\n\n` : ok ? `### ✅ Todos os testes passaram\n\n` : `### ✅ Testes passaram, mas há problema no openapi.yaml\n\n`;
  md += `| ✅ Passaram | ❌ Falharam | ⏭️ Ignorados | Total | Tempo |\n|---:|---:|---:|---:|---:|\n| ${t.passaram} | ${t.falharam} | ${t.ignorados} | ${t.total} | ${tempo(t.ms)} |\n\n`;
  for (const [arq, lista] of porArquivo(testes)) {
    md += `#### \`${arq}\` (${lista.filter(x => x.status === 'passou').length}/${lista.length})\n\n| | Teste | Tempo |\n|:-:|---|---:|\n`;
    for (const x of lista) md += `| ${ICONE[x.status]} | ${String(x.nome).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')} | ${tempo(x.ms)} |\n`;
    md += `\n`;
  }
  const falhas = testes.filter(x => x.status === 'falhou');
  if (falhas.length) {
    md += `### Detalhes das falhas\n\n`;
    for (const x of falhas) md += `<details open><summary>❌ ${esc(x.nome)}</summary>\n\n\`\`\`\n${x.erro || '(sem mensagem)'}\n\`\`\`\n\n</details>\n\n`;
  }
  if (openapi) md += openapi.ok ? `### ✅ openapi.yaml válido\n${openapi.caminhos} caminhos documentados.\n` : `### ❌ openapi.yaml inválido\n\`\`\`\n${openapi.erro}\n\`\`\`\n`;
  return md;
}

const CSS = `
:root{--bg:#f4f5f7;--card:#fff;--text:#1c1f26;--muted:#6b7280;--line:#e3e6ea;--ok:#16a34a;--bad:#dc2626;--skip:#9ca3af;--okbg:#dcfce7;--badbg:#fee2e2;--skipbg:#f3f4f6}
@media (prefers-color-scheme:dark){:root{--bg:#14161a;--card:#1e2127;--text:#eceef2;--muted:#9aa1ad;--line:#2d3139;--okbg:#14351f;--badbg:#431616;--skipbg:#262a31}}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--text)}
main{max-width:980px;margin:0 auto;padding:20px 16px 48px}
h1{margin:0;font-size:22px}h2{font-size:17px;margin:28px 0 10px}
.sub{color:var(--muted);font-size:13px;margin:4px 0 0;display:flex;flex-wrap:wrap;gap:4px 14px}.sub a{color:inherit}
.banner{margin:18px 0;padding:16px 18px;border-radius:14px;font-size:19px;font-weight:700;display:flex;align-items:center;gap:10px}
.banner.ok{background:var(--okbg);color:var(--ok)}.banner.bad{background:var(--badbg);color:var(--bad)}.banner.skip{background:var(--skipbg);color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.card b{display:block;font-size:26px;line-height:1.1}.card span{color:var(--muted);font-size:13px}
.card.ok b{color:var(--ok)}.card.bad b{color:var(--bad)}
.barra{display:flex;height:10px;border-radius:6px;overflow:hidden;background:var(--line);margin:14px 0}
.barra i{display:block}.barra .ok{background:var(--ok)}.barra .bad{background:var(--bad)}.barra .skip{background:var(--skip)}
.filtros{display:none;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0 4px}.filtros.on{display:flex}
.filtros button{border:1px solid var(--line);background:var(--card);color:var(--text);padding:6px 12px;border-radius:20px;font:inherit;cursor:pointer}
.filtros button.sel{background:var(--text);color:var(--bg);border-color:var(--text)}
.filtros input{flex:1 1 180px;padding:7px 12px;border:1px solid var(--line);border-radius:20px;background:var(--card);color:var(--text);font:inherit}
details.arq{background:var(--card);border:1px solid var(--line);border-radius:12px;margin:10px 0}
details.arq>summary{cursor:pointer;padding:12px 14px;font-weight:600;display:flex;justify-content:space-between;gap:10px;list-style:none}
details.arq>summary::-webkit-details-marker{display:none}.arq .n{color:var(--muted);font-weight:400}
.teste{border-top:1px solid var(--line);padding:9px 14px}
.linha{display:grid;grid-template-columns:26px 1fr 88px 110px;gap:8px;align-items:center}
.nome{word-break:break-word}.ms{color:var(--muted);font-size:13px;text-align:right;font-variant-numeric:tabular-nums}
.dur{height:6px;border-radius:3px;background:var(--line);overflow:hidden}.dur i{display:block;height:100%;background:var(--ok)}
.teste.falhou .dur i{background:var(--bad)}.teste.ignorado .dur i{background:var(--skip)}
.erro{margin:8px 0 2px 34px}.erro summary{cursor:pointer;color:var(--bad);font-size:13px}
pre{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px;overflow:auto;font-size:12.5px;white-space:pre-wrap}
.vazio{display:none;text-align:center;color:var(--muted);padding:24px}
.api{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
footer{margin-top:32px;color:var(--muted);font-size:12px}
@media (max-width:560px){.linha{grid-template-columns:26px 1fr 70px}.dur{display:none}}
`;

const JS = `
const f=document.querySelector('.filtros');if(f){f.classList.add('on');let st='todos',q='';
const ap=()=>{let vis=0;document.querySelectorAll('.teste').forEach(t=>{const ok=(st==='todos'||t.dataset.status===st)&&t.dataset.nome.includes(q);t.hidden=!ok;if(ok)vis++});
document.querySelectorAll('details.arq').forEach(d=>{d.hidden=!d.querySelector('.teste:not([hidden])')});document.querySelector('.vazio').style.display=vis?'none':'block'};
f.querySelectorAll('button').forEach(b=>b.onclick=()=>{st=b.dataset.f;f.querySelectorAll('button').forEach(x=>x.classList.toggle('sel',x===b));ap()});
f.querySelector('input').oninput=e=>{q=e.target.value.toLowerCase();ap()};}
`;

function renderHtml({ testes, openapi, ctx = contexto() }) {
  const t = totais(testes);
  const max = Math.max(1, ...testes.map(x => x.ms));
  const falhou = t.falharam > 0 || (openapi && !openapi.ok);
  const banner = t.total === 0 ? ['skip', '⚠️ Nenhum resultado de teste encontrado']
    : t.falharam ? ['bad', `❌ ${t.falharam} de ${t.total} testes falharam`]
    : openapi && !openapi.ok ? ['bad', '❌ Testes passaram, mas o openapi.yaml é inválido']
    : ['ok', `✅ Todos os ${t.total} testes passaram`];
  const pct = n => (t.total ? (n / t.total) * 100 : 0).toFixed(2);

  const meta = [
    ctx.local ? 'Execução local' : `${esc(ctx.repo)}`,
    ctx.pr ? `<a href="${esc(ctx.prUrl)}">PR #${ctx.pr}</a>` : '',
    ctx.ramo ? `ramo <b>${esc(ctx.ramo)}</b>` : '',
    ctx.sha ? `commit <b>${esc(ctx.sha)}</b>` : '',
    ctx.execucaoUrl ? `<a href="${esc(ctx.execucaoUrl)}">execução ${esc(ctx.execucao)}</a>` : '',
    `Node ${esc(ctx.node)}`, esc(ctx.quando),
  ].filter(Boolean).map(x => `<span>${x}</span>`).join('');

  const arquivos = porArquivo(testes).map(([arq, lista]) => {
    const ok = lista.filter(x => x.status === 'passou').length;
    const abrir = lista.some(x => x.status === 'falhou') || lista.length <= 12 ? ' open' : '';
    return `<details class="arq"${abrir}><summary><span>${esc(arq)}</span><span class="n">${ok}/${lista.length} ${lista.some(x => x.status === 'falhou') ? '❌' : '✅'}</span></summary>${
      lista.map(x => `<div class="teste ${x.status}" data-status="${x.status}" data-nome="${esc(String(x.nome).toLowerCase())}">
  <div class="linha"><span>${ICONE[x.status]}</span><span class="nome">${esc(x.nome)}</span><span class="ms">${tempo(x.ms)}</span><span class="dur"><i style="width:${Math.max(3, (x.ms / max) * 100).toFixed(1)}%"></i></span></div>${
        x.status === 'falhou' ? `<details class="erro" open><summary>Ver erro</summary><pre>${esc(x.erro || '(sem mensagem)')}</pre></details>` : ''}
</div>`).join('')}</details>`;
  }).join('');

  const api = openapi ? `<h2>Documentação da API</h2><div class="api">${openapi.ok
    ? `✅ <b>openapi.yaml válido</b> — ${openapi.caminhos} caminhos documentados.`
    : `❌ <b>openapi.yaml inválido</b><pre>${esc(openapi.erro)}</pre>`}</div>` : '';

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${falhou ? '❌' : '✅'} Relatório de testes · Meu Treino</title><style>${CSS}</style></head>
<body><main>
<h1>🧪 Relatório de testes · Meu Treino</h1>
<p class="sub">${meta}</p>
<div class="banner ${banner[0]}">${banner[1]}</div>
<div class="cards">
  <div class="card ok"><b>${t.passaram}</b><span>Passaram</span></div>
  <div class="card ${t.falharam ? 'bad' : ''}"><b>${t.falharam}</b><span>Falharam</span></div>
  <div class="card"><b>${t.ignorados}</b><span>Ignorados</span></div>
  <div class="card"><b>${t.total}</b><span>Total</span></div>
  <div class="card"><b>${tempo(t.ms)}</b><span>Tempo dos testes</span></div>
</div>
<div class="barra" title="${t.passaram} passaram, ${t.falharam} falharam, ${t.ignorados} ignorados"><i class="ok" style="width:${pct(t.passaram)}%"></i><i class="bad" style="width:${pct(t.falharam)}%"></i><i class="skip" style="width:${pct(t.ignorados)}%"></i></div>
<h2>Testes</h2>
<div class="filtros"><button class="sel" data-f="todos">Todos</button><button data-f="falhou">Falhas</button><button data-f="passou">Passaram</button><button data-f="ignorado">Ignorados</button><input type="search" placeholder="Buscar teste..."></div>
${arquivos || '<p class="vazio" style="display:block">Sem resultados.</p>'}
<p class="vazio">Nenhum teste com esse filtro.</p>
${api}
<footer>Gerado por scripts/gerar-relatorio.js</footer>
</main><script>${JS}</script></body></html>`;
}

function ler(arquivo) {
  try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return null; }
}

function main() {
  const dados = ler('resultados-testes.json') || { testes: [] };
  const openapi = ler('resultado-openapi.json');
  const entrada = { testes: dados.testes, openapi };
  fs.writeFileSync('relatorio-testes.html', renderHtml({ ...entrada, ctx: contexto() }));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderMarkdown(entrada));
  const t = totais(dados.testes);
  console.log(`Relatório gerado: relatorio-testes.html (${t.passaram} passaram, ${t.falharam} falharam, ${t.ignorados} ignorados)`);
}

if (require.main === module) main();
module.exports = { renderHtml, renderMarkdown, totais, contexto };
