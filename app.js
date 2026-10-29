(() => {
const IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const MUSCLES = {abdominals:'Abdômen',abductors:'Abdutores',adductors:'Adutores',biceps:'Bíceps',calves:'Panturrilha',chest:'Peito',forearms:'Antebraço',glutes:'Glúteos',hamstrings:'Posterior de coxa','lower back':'Lombar',lats:'Dorsal','middle back':'Costas (meio)',neck:'Pescoço',quadriceps:'Quadríceps',shoulders:'Ombros',traps:'Trapézio',triceps:'Tríceps'};
const EQUIP = {'body only':'Peso do corpo',machine:'Máquina',barbell:'Barra',dumbbell:'Halteres',cable:'Cabo/Polia',kettlebells:'Kettlebell',bands:'Elástico','medicine ball':'Medicine ball','exercise ball':'Bola suíça','e-z curl bar':'Barra W','foam roll':'Rolo',other:'Outro'};
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
// Aulas avulsas: um toque registra no calendário de hoje, sem exercícios e sem duração.
const AULAS = [
  { nome: 'Spinning', icone: '🚴' },
  { nome: 'Pilates', icone: '🧘' },
  { nome: 'Ritmos', icone: '💃' },
  { nome: 'Fortalecimento', icone: '💪' },
  { nome: 'Cardio', icone: '🏃' },
];
const iconeAula = nome => AULAS.find(a => a.nome === nome)?.icone || '';
const DOW = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const EX = window.EXERCISES || [];
EX.forEach(e => { const p = (window.PT || {})[e.id]; e.nome = p ? p.n : e.name; e.passos = p ? p.i : e.instructions; });
const byId = Object.fromEntries(EX.map(e => [e.id, e]));
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const img = (e, i = 0) => IMG + (e.images[i] || e.images[0]);

// ---------- armazenamento ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
// Usuários e dados ficam no servidor (SQLite, fora da pasta do projeto).
let users = [], user = null, routines = [], logs = [], session = null;
const api = async (url, opt) => {
  const r = await fetch(url, opt);
  if (!r.ok) {
    const j = await r.json().catch(() => null);
    throw Object.assign(new Error(j?.erro || r.status), { status: r.status });
  }
  return r.status === 204 ? null : r.json();
};
const enviar = (method, url, body) => api(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const base = () => `/api/users/${user.id}`;
// Escritas em fila: chegam ao servidor na mesma ordem em que o usuário agiu.
let fila = Promise.resolve();
const enfileirar = fn => { const p = fila.then(fn); fila = p.catch(() => {}); return p; };
const erro = e => e.status === 401 ? telaSenha() : toast('⚠️ ' + (e.status && e.status < 500 ? e.message : 'Não foi possível salvar no servidor'));
const salvarSessao = () => enfileirar(() => session ? enviar('PUT', base() + '/session', session) : null).catch(erro);

async function entrar(p) {
  try {
    const b = `/api/users/${p.id}`;
    const [r, l, ses] = await Promise.all([
      api(b + '/routines'), api(b + '/logs'),
      api(b + '/session').catch(e => e.status === 404 ? null : Promise.reject(e)),
    ]);
    user = p; routines = r; logs = l; session = ses;
  } catch (e) { return e.status === 401 ? telaSenha() : toast('⚠️ Servidor indisponível'); }
  localStorage.setItem('mt_current', p.id); // só lembra quem foi o último usuário
  editing = null; selDay = iso(new Date());
  $('#who').textContent = p.name;
  $('#userbar').hidden = false;
  $('#welcome').close();
  go('treinos');
}
function telaSenha(erro) {
  $('#userbar').hidden = true;
  $('#welcome').innerHTML = `<div class="mbody"><h2>🔒 Meu Treino</h2>
    <form id="senhaForm" class="row"><input id="senha" type="password" placeholder="Senha de acesso" autocomplete="current-password" required style="flex:1">
    <button class="btn pri">Entrar</button></form>${erro ? '<p style="color:var(--danger)">Senha incorreta.</p>' : ''}</div>`;
  if (!$('#welcome').open) $('#welcome').showModal();
}
let registrandoAula = false;
function registrarAula(nome) {
  if (registrandoAula) return; // evita registrar duas vezes num toque duplo
  registrandoAula = true;
  enfileirar(() => enviar('POST', base() + '/logs', { date: iso(new Date()), name: nome, minutes: 0, items: [] }))
    .then(l => {
      logs.push(l); toast(`${iconeAula(nome)} ${nome} registrado no calendário!`);
      calMonth = new Date(); calMonth.setDate(1); selDay = l.date;
      go('calendario');
    }).catch(erro).finally(() => { registrandoAula = false; });
}
document.addEventListener('submit', async ev => {
  if (ev.target.id !== 'senhaForm') return;
  ev.preventDefault();
  try { await api('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: $('#senha').value }) }); location.reload(); }
  catch { telaSenha(true); }
});
async function telaPerfil() {
  $('#userbar').hidden = true;
  try { users = await api('/api/users'); } catch (e) { if (e.status === 401) return telaSenha(); users = []; }
  $('#welcome').innerHTML = `<div class="mbody">
    <h2>Quem vai treinar?</h2>
    ${users.length ? `<div class="row" style="gap:12px">${users.map(p => `<button class="btn pri" style="flex:1;font-size:20px;padding:22px" data-prof="${p.id}">${esc(p.name)}</button>`).join('')}</div>` : '<p class="muted">Servidor indisponível. Execute o iniciar.bat e abra http://localhost:3000</p>'}
  </div>`;
  if (!$('#welcome').open) $('#welcome').showModal();
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2000);
}

// ---------- navegação ----------
let view = 'exercicios';
function go(v) {
  view = v;
  document.querySelectorAll('#nav button').forEach(b => {
    const on = b.dataset.view === v; b.classList.toggle('active', on);
    if (on) $('#menuLabel').textContent = b.textContent;
  });
  $('#nav').hidden = true;
  ['exercicios', 'treinos', 'executar', 'calendario'].forEach(x => $('#view-' + x).hidden = x !== v);
  if (v === 'treinos') renderTreinos();
  if (v === 'executar') renderExecutar();
  if (v === 'calendario') renderCal();
}
$('#menuBtn').addEventListener('click', e => { e.stopPropagation(); $('#nav').hidden = !$('#nav').hidden; });
document.addEventListener('click', e => { if (!e.target.closest('#nav')) $('#nav').hidden = true; });
$('#nav').addEventListener('click', e => { if (e.target.dataset.view) { editing = null; go(e.target.dataset.view); } });

// ---------- modal ----------
const modal = $('#modal');
const openModal = html => { modal.innerHTML = `<div class="mbody">${html}</div>`; if (!modal.open) modal.showModal(); };
const closeModal = () => modal.open && modal.close();
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

// ---------- biblioteca ----------
const PAGE = 36;
let shown = PAGE;
const optList = (map, all) => `<option value="">${all}</option>` + Object.entries(map).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('#fMusculo').innerHTML = optList(MUSCLES, 'Todos os músculos');
$('#fEquip').innerHTML = optList(EQUIP, 'Todos os equipamentos');

function filtrar(q, m, eq) {
  q = q.trim().toLowerCase();
  return EX.filter(e =>
    (!q || (e.nome + " " + e.name).toLowerCase().includes(q)) &&
    (!m || e.primaryMuscles.includes(m) || e.secondaryMuscles.includes(m)) &&
    (!eq || e.equipment === eq));
}
const tags = e => `<span class="tag">${MUSCLES[e.primaryMuscles[0]] || '—'}</span> <span class="tag">${EQUIP[e.equipment] || 'Outro'}</span>`;

function renderGrid() {
  const list = filtrar($('#q').value, $('#fMusculo').value, $('#fEquip').value);
  $('#count').textContent = `${list.length} exercício(s)`;
  $('#grid').innerHTML = list.slice(0, shown).map(e => `
    <div class="card">
      <img src="${img(e)}" loading="lazy" alt="${esc(e.nome)}" data-det="${e.id}">
      <div class="body">
        <div class="name">${esc(e.nome)}</div>
        <div>${tags(e)}</div>
        <div class="actions">
          <button class="btn sm" data-det="${e.id}">Ver execução</button>
          <button class="btn sm pri" data-add="${e.id}">+ Treino</button>
        </div>
      </div>
    </div>`).join('');
  $('#more').hidden = list.length <= shown;
}
['q', 'fMusculo', 'fEquip'].forEach(id => $('#' + id).addEventListener('input', () => { shown = PAGE; renderGrid(); }));
$('#more').onclick = () => { shown += PAGE; renderGrid(); };

function detalhe(id) {
  const e = byId[id];
  openModal(`
    <div class="row between"><h2 style="margin:0">${esc(e.nome)}</h2><button class="btn sm" data-close>✕</button></div>
    <p>${tags(e)} ${e.secondaryMuscles.map(m => `<span class="tag">+ ${MUSCLES[m] || m}</span>`).join(' ')}</p>
    <div class="mimgs">${e.images.map((_, i) => `<img src="${img(e, i)}" alt="passo ${i + 1}">`).join('')}</div>
    <h3>Execução</h3>
    <ol>${e.passos.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <h3>Músculos trabalhados</h3>
    ${corpoSVG(e.primaryMuscles, e.secondaryMuscles)}
    <div class="corpo-legenda"><span><i></i>Principal</span><span><i class="s"></i>Secundário</span></div>
    <p><button class="btn pri" data-add="${e.id}">+ Adicionar a um treino</button></p>`);
}

// adicionar exercício a um treino (a partir da biblioteca)
function escolherTreino(exId) {
  openModal(`
    <div class="row between"><h3 style="margin:0">Adicionar "${esc(byId[exId].nome)}" a:</h3><button class="btn sm" data-close>✕</button></div>
    <div class="picker-list">
      ${routines.map(r => `<div class="item"><div class="info">${esc(r.name)} <span class="muted">(${r.items.length})</span></div><button class="btn sm pri" data-addto="${r.id}|${exId}">Adicionar</button></div>`).join('') || '<p class="muted">Você ainda não tem treinos.</p>'}
    </div>
    <div class="row" style="margin-top:12px"><input id="newName" placeholder="Nome de um novo treino"><button class="btn pri" data-newwith="${exId}">Criar e adicionar</button></div>`);
}
const novoItem = id => ({ exId: id, sets: 3, reps: 12, weight: 0 });
function addToRoutine(rid, exId) {
  const r = routines.find(x => x.id === rid);
  if (editing && editing.id === rid) { editing.items.push(novoItem(exId)); return; }
  r.items.push(novoItem(exId)); toast('Adicionado a ' + r.name);
  enfileirar(() => enviar('PUT', `${base()}/routines/${rid}`, { name: r.name, items: r.items })).catch(erro);
}

// ---------- treinos ----------
let editing = null; // cópia do treino em edição
function renderTreinos() {
  const el = $('#view-treinos');
  if (editing) return renderEditor(el);
  el.innerHTML = `
    <div class="row between"><h2>Meus Treinos</h2><button class="btn pri" data-newroutine>+ Novo treino</button></div>
    ${routines.map(r => `
      <div class="panel clickable" data-edit="${r.id}" title="Clique para editar">
        <div class="row between">
          <div><strong>${esc(r.name)}</strong> <span class="muted">· ${r.items.length} exercício(s)</span></div>
        </div>
        <div class="muted" style="margin-top:6px">${r.items.map(i => esc(byId[i.exId]?.nome || '?')).join(' · ') || 'Vazio'}</div>
      </div>`).join('') || '<p class="muted">Nenhum treino criado ainda. Clique em "Novo treino" ou use "+ Treino" na aba Exercícios.</p>'}`;
}

function renderEditor(el) {
  el.innerHTML = `
    <div class="row between"><h2>${routines.some(r => r.id === editing.id) ? 'Editar treino' : 'Novo treino'}</h2></div>
    <div class="panel">
      <input id="rname" value="${esc(editing.name)}" maxlength="100" placeholder="Nome do treino (ex: Treino A - Peito e Tríceps)" style="width:100%;margin-bottom:8px">
      ${editing.items.map((it, i) => {
        const e = byId[it.exId]; if (!e) return '';
        return `<div class="item">
          <img src="${img(e)}" alt="" data-det="${e.id}" class="clickable" title="Ver como fazer">
          <div class="info"><div class="clickable" data-det="${e.id}" title="Ver como fazer"><strong>${esc(e.nome)}</strong></div><div>${tags(e)}</div></div>
          <div class="ctrls">
          <label class="muted">Séries <input type="number" min="1" value="${it.sets}" data-f="sets" data-i="${i}"></label>
          <label class="muted">Reps <input type="number" min="1" value="${it.reps}" data-f="reps" data-i="${i}"></label>
          <label class="muted">Kg <input type="number" min="0" step="0.5" value="${it.weight}" data-f="weight" data-i="${i}"></label>
          </div>
          <div class="acoes">
            <button class="btn sm" data-mv="${i}|-1" title="Mover para cima">↑</button><button class="btn sm" data-mv="${i}|1" title="Mover para baixo">↓</button>
            <button class="btn sm danger" data-rm="${i}" title="Remover do treino">✕</button>
          </div>
        </div>`; }).join('') || '<p class="muted">Nenhum exercício ainda.</p>'}
      <div class="row" style="margin-top:10px">
        <button class="btn" data-picker>+ Adicionar exercício</button>
        <button class="btn pri" data-saveroutine>Salvar treino</button>
        <button class="btn" data-cancel>Cancelar</button>
        ${routines.some(r => r.id === editing.id) ? `<button class="btn danger" data-delroutine="${editing.id}" style="margin-left:auto">Excluir treino</button>` : ''}
      </div>
    </div>`;
}
function syncName() { const n = $('#rname'); if (n && editing) editing.name = n.value; }

function picker() {
  openModal(`
    <div class="row between"><h3 style="margin:0">Escolher exercício</h3><button class="btn sm" data-close>✕</button></div>
    <div class="filters" style="margin:10px 0">
      <input id="pq" type="search" placeholder="Buscar...">
      <select id="pm">${optList(MUSCLES, 'Todos os músculos')}</select>
    </div>
    <div id="plist" class="picker-list"></div>`);
  const draw = () => {
    const l = filtrar($('#pq').value, $('#pm').value, '').slice(0, 60);
    $('#plist').innerHTML = l.map(e => `<div class="item"><img src="${img(e)}" loading="lazy" alt=""><div class="info">${esc(e.nome)}<div>${tags(e)}</div></div><button class="btn sm pri" data-pick="${e.id}">Adicionar</button></div>`).join('');
  };
  $('#pq').oninput = draw; $('#pm').oninput = draw; draw();
}

// ---------- execução ----------
function startSession(rid) {
  const r = routines.find(x => x.id === rid);
  if (!r || !r.items.length) return toast('Esse treino não tem exercícios');
  if (session && !confirm('Já existe um treino em andamento. Descartar e iniciar outro?')) return;
  session = { name: r.name, start: Date.now(), items: r.items.map(i => ({ ...i, done: false })) };
  salvarSessao(); go('executar');
}
function renderExecutar() {
  const el = $('#view-executar');
  if (!session) {
    el.innerHTML = `<h2>Treinar</h2><p class="muted">Escolha um treino para iniciar:</p>` +
      (routines.map(r => `<div class="panel row between"><div><strong>${esc(r.name)}</strong> <span class="muted">· ${r.items.length} exercício(s)</span></div><button class="btn ok" data-start="${r.id}">▶ Iniciar</button></div>`).join('') || '<p class="muted">Crie um treino primeiro na aba "Meus Treinos".</p>') + `
    <h3>Aulas</h3>
    <p class="muted" style="margin-top:0">Toque para registrar uma aula de hoje no calendário.</p>
    <div class="aulas">${AULAS.map(a => `<button class="aula" data-aula="${a.nome}"><span class="ic">${a.icone}</span>${a.nome}</button>`).join('')}</div>`;
    return;
  }
  const done = session.items.filter(i => i.done).length, tot = session.items.length;
  el.innerHTML = `
    <div class="row between"><h2>${esc(session.name)}</h2><span class="muted">${done}/${tot} concluídos</span></div>
    <div class="bar"><div style="width:${done / tot * 100}%"></div></div>
    <div class="panel">
      ${session.items.map((it, i) => { const e = byId[it.exId]; return `
        <div class="item ${it.done ? 'done' : ''}">
          <input type="checkbox" class="check" ${it.done ? 'checked' : ''} data-done="${i}">
          <img src="${img(e)}" alt="" data-det="${e.id}" class="clickable" title="Ver como fazer">
          <div class="info"><div class="nm clickable" data-det="${e.id}" title="Ver como fazer">${esc(e.nome)}</div><div class="muted">${it.sets} x ${it.reps}${it.weight ? ' · ' + it.weight + ' kg' : ''}</div></div>
        </div>`; }).join('')}
    </div>
    <div class="row">
      <button class="btn ok" data-finish>🏁 Finalizar treino</button>
      <button class="btn danger" data-discard>Descartar</button>
    </div>`;
}
async function finish() {
  const done = session.items.filter(i => i.done).length;
  if (!done) return toast('Marque pelo menos um exercício como concluído');
  if (done < session.items.length && !confirm(`Só ${done} de ${session.items.length} exercícios concluídos. Finalizar mesmo assim?`)) return;
  const reg = { date: iso(new Date()), name: session.name, minutes: Math.round((Date.now() - session.start) / 60000), items: session.items };
  try {
    await enfileirar(async () => {
      const salvo = await enviar('POST', base() + '/logs', reg);
      logs.push(salvo); session = null;
      await api(base() + '/session', { method: 'DELETE' }).catch(e => { if (e.status !== 404) throw e; });
    });
  } catch (e) { return erro(e); }
  toast('Treino salvo no calendário! 💪');
  calMonth = new Date(); calMonth.setDate(1); selDay = iso(new Date());
  go('calendario');
}

// ---------- calendário ----------
let calMonth = new Date(); calMonth.setDate(1);
let selDay = iso(new Date());
function renderCal() {
  const el = $('#view-calendario');
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const todayIso = iso(new Date());
  let cells = DOW.map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < first; i++) cells += '<div class="day off"></div>';
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`;
    const ls = logs.filter(l => l.date === k);
    cells += `<div class="day ${k === todayIso ? 'today' : ''} ${k === selDay ? 'sel' : ''}" data-day="${k}">${d}${ls.map(l => `<span class="chip">${esc(l.name)}</span>`).join('')}</div>`;
  }
  const dl = logs.filter(l => l.date === selDay);
  const [sy, sm, sd] = selDay.split('-');
  el.innerHTML = `
    <div class="cal-head"><button class="btn" data-cal="-1">◀</button><h2 style="margin:0">${MESES[m]} ${y}</h2><button class="btn" data-cal="1">▶</button></div>
    <div class="cal">${cells}</div>
    <div class="panel" style="margin-top:12px">
      <strong>${sd}/${sm}/${sy}</strong>
      ${dl.map(l => `
        <div style="margin-top:10px">
          <div class="row between"><strong>${iconeAula(l.name)} ${esc(l.name)}</strong><span class="muted">${l.minutes ? l.minutes + ' min ' : ''}<button class="btn sm danger" data-dellog="${l.id}">Excluir</button></span></div>
          <label class="muted data-log">Data <input type="date" value="${l.date}" data-logdate="${l.id}"></label>
          ${l.items.length ? '' : '<div class="muted">Aula</div>'}
          ${l.items.map(i => `<div class="muted">${i.done ? '✅' : '⬜'} ${esc(byId[i.exId]?.nome || '?')} — ${i.sets}x${i.reps}${i.weight ? ' · ' + i.weight + 'kg' : ''}</div>`).join('')}
        </div>`).join('') || '<p class="muted">Nenhum treino neste dia.</p>'}
    </div>`;
}

// ---------- eventos globais ----------
document.addEventListener('click', ev => {
  const t = ev.target.closest('button, img, .day, input.check, .clickable'); if (!t) return;
  const d = t.dataset;
  if ('close' in d) return closeModal();
  if (d.aula) return registrarAula(d.aula);
  if (d.prof) return entrar(users.find(p => String(p.id) === d.prof));
  if ('switch' in d) { user = null; localStorage.removeItem('mt_current'); return telaPerfil(); }
  if (d.det) { syncName(); return detalhe(d.det); }
  if (d.add) return escolherTreino(d.add);
  if (d.addto) { const [rid, ex] = d.addto.split('|'); addToRoutine(rid, ex); closeModal(); if (view === 'treinos') renderTreinos(); return; }
  if (d.newwith) {
    const name = $('#newName').value.trim() || 'Novo treino';
    enfileirar(() => enviar('POST', base() + '/routines', { name, items: [novoItem(d.newwith)] }))
      .then(r => { routines.push(r); closeModal(); toast('Treino criado'); }).catch(erro);
    return;
  }
  if ('newroutine' in d) { editing = { id: uid(), name: '', items: [] }; return renderTreinos(); }
  if (d.edit) { editing = JSON.parse(JSON.stringify(routines.find(r => r.id === d.edit))); return renderTreinos(); }
  if (d.delroutine) {
    if (confirm('Excluir este treino?')) enfileirar(() => enviar('DELETE', `${base()}/routines/${d.delroutine}`))
      .then(() => { routines = routines.filter(r => r.id !== d.delroutine); editing = null; toast('Treino excluído'); renderTreinos(); }).catch(erro);
    return;
  }
  if ('picker' in d) { syncName(); return picker(); }
  if (d.pick) { editing.items.push(novoItem(d.pick)); toast('Adicionado'); return; }
  if (d.mv) { syncName(); const [i, dir] = d.mv.split('|').map(Number), j = i + dir; if (editing.items[j]) { [editing.items[i], editing.items[j]] = [editing.items[j], editing.items[i]]; renderTreinos(); } return; }
  if (d.rm) { syncName(); editing.items.splice(+d.rm, 1); return renderTreinos(); }
  if ('cancel' in d) { editing = null; return renderTreinos(); }
  if ('saveroutine' in d) {
    syncName();
    if (!editing.name.trim()) return toast('Dê um nome ao treino');
    if (!editing.items.length) return toast('Adicione ao menos um exercício');
    const ed = editing, i = routines.findIndex(r => r.id === ed.id), corpo = { name: ed.name.trim(), items: ed.items };
    enfileirar(() => i >= 0 ? enviar('PUT', `${base()}/routines/${ed.id}`, corpo) : enviar('POST', base() + '/routines', corpo))
      .then(r => { if (i >= 0) routines[i] = r; else routines.push(r); editing = null; toast('Treino salvo'); renderTreinos(); }).catch(erro);
    return;
  }
  if (d.start) return startSession(d.start);
  if (d.done !== undefined && t.matches('input')) { session.items[+d.done].done = t.checked; salvarSessao(); return renderExecutar(); }
  if ('finish' in d) return finish();
  if ('discard' in d) { if (confirm('Descartar o treino em andamento?')) { session = null; renderExecutar(); enfileirar(() => api(base() + '/session', { method: 'DELETE' })).catch(e => e.status === 404 ? null : erro(e)); } return; }
  if (d.cal) { calMonth.setMonth(calMonth.getMonth() + +d.cal); return renderCal(); }
  if (d.day) { selDay = d.day; return renderCal(); }
  if (d.dellog) { if (confirm('Excluir este registro?')) {
    enfileirar(() => enviar('DELETE', `${base()}/logs/${d.dellog}`))
      .then(() => { logs = logs.filter(l => l.id !== d.dellog); renderCal(); }).catch(erro);
  } }
});
// o picker atualiza o editor sem re-renderizar o modal; ao fechar, redesenha
modal.addEventListener('close', () => { if (view === 'treinos' && editing) renderTreinos(); });
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.logdate) {
    const l = logs.find(x => x.id === t.dataset.logdate), data = t.value;
    if (!l || !data || data === l.date) return renderCal();
    enfileirar(() => enviar('PUT', `${base()}/logs/${l.id}`, { date: data, name: l.name, minutes: l.minutes, items: l.items }))
      .then(r => {
        Object.assign(l, r); selDay = r.date;
        const [y, m] = r.date.split('-').map(Number); calMonth = new Date(y, m - 1, 1);
        toast('Data alterada'); renderCal();
      }).catch(e => { erro(e); renderCal(); });
    return;
  }
  if (t.dataset.f && editing) {
    const f = t.dataset.f, n = parseFloat(t.value) || 0;
    editing.items[+t.dataset.i][f] = f === 'weight' ? Math.min(9999, Math.max(0, n)) : Math.min(999, Math.max(1, Math.round(n)));
    if (f !== 'weight') t.value = editing.items[+t.dataset.i][f];
  }
});

$('#welcome').addEventListener('cancel', e => e.preventDefault());
renderGrid();
(async () => {
  go('treinos');
  try { users = await api('/api/users'); } catch (e) { if (e.status === 401) return telaSenha(); users = []; }
  const atual = users.find(p => String(p.id) === localStorage.getItem('mt_current'));
  if (atual) entrar(atual); else telaPerfil();
})();
})();
