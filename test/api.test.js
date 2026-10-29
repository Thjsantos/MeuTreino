const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createClient } = require('@libsql/client');
const { init, makeRepo } = require('../src/repo');
const { createServer } = require('../src/http');

let dir, db, server, base, cookie = '';

// chama a API; devolve { status, body, headers }
async function api(method, url, body) {
  const r = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const txt = await r.text();
  return { status: r.status, body: txt ? JSON.parse(txt) : null, headers: r.headers };
}
const listen = srv => new Promise(ok => srv.listen(0, '127.0.0.1', () => ok(`http://127.0.0.1:${srv.address().port}`)));

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meutreino-'));
  db = createClient({ url: 'file:' + path.join(dir, 't.db').replace(/\\/g, '/') });
  await init(db, ['Thiago', 'Carla']);
  server = createServer({ repo: makeRepo(db), password: 'segredo' });
  base = await listen(server);
});
after(async () => {
  server.close(); server.closeAllConnections?.(); db.close();
  try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5 }); } catch { /* Windows pode manter o arquivo preso; é só lixo em %TEMP% */ }
});

const treino = (name = 'Treino A') => ({ name, items: [{ exId: 'Barbell_Squat', sets: 3, reps: 10, weight: 40 }] });
const registro = (date = '2026-10-29') => ({ date, name: 'Treino A', minutes: 50, items: [{ exId: 'Barbell_Squat', sets: 3, reps: 10, weight: 40, done: true }] });

test('exige senha nas rotas da API e aceita o login', async () => {
  assert.equal((await api('GET', '/api/users')).status, 401);
  assert.equal((await api('POST', '/api/login', { senha: 'errada' })).status, 401);
  const r = await api('POST', '/api/login', { senha: 'segredo' });
  assert.equal(r.status, 200);
  cookie = r.headers.get('set-cookie').split(';')[0];
  const u = await api('GET', '/api/users');
  assert.equal(u.status, 200);
  assert.deepEqual(u.body.map(x => x.name), ['Thiago', 'Carla']);
});

test('treinos: criar, listar, buscar, atualizar e excluir', async () => {
  const c = await api('POST', '/api/users/1/routines', treino());
  assert.equal(c.status, 201);
  assert.ok(c.body.id);
  const id = c.body.id;
  await api('POST', '/api/users/1/routines', treino('Treino B'));

  assert.deepEqual((await api('GET', '/api/users/1/routines')).body.map(r => r.name), ['Treino A', 'Treino B']);
  assert.equal((await api('GET', `/api/users/1/routines/${id}`)).body.items[0].weight, 40);

  const u = await api('PUT', `/api/users/1/routines/${id}`, { name: 'Treino A2', items: [] });
  assert.equal(u.status, 200);
  assert.equal((await api('GET', `/api/users/1/routines/${id}`)).body.name, 'Treino A2');

  assert.equal((await api('DELETE', `/api/users/1/routines/${id}`)).status, 204);
  assert.equal((await api('GET', `/api/users/1/routines/${id}`)).status, 404);
  assert.equal((await api('DELETE', `/api/users/1/routines/${id}`)).status, 404);
});

test('cada usuário só enxerga os próprios dados', async () => {
  const { body } = await api('POST', '/api/users/1/routines', treino('Só do Thiago'));
  assert.equal((await api('GET', `/api/users/2/routines/${body.id}`)).status, 404);
  assert.equal((await api('DELETE', `/api/users/2/routines/${body.id}`)).status, 404);
  assert.equal((await api('GET', `/api/users/2/routines`)).body.length, 0);
  assert.equal((await api('GET', `/api/users/1/routines/${body.id}`)).status, 200);
});

test('validação devolve 400 com mensagem', async () => {
  const sem = await api('POST', '/api/users/1/routines', { items: [] });
  assert.equal(sem.status, 400);
  assert.match(sem.body.erro, /name/);
  assert.equal((await api('POST', '/api/users/1/routines', { name: 'x', items: [{ exId: 'a', sets: 0, reps: 1 }] })).status, 400);
  assert.equal((await api('POST', '/api/users/1/routines', '{quebrado')).status, 400);
  assert.equal((await api('POST', '/api/users/1/logs', registro('2026-02-30'))).status, 400);
  assert.equal((await api('GET', '/api/users/1/logs?month=2026-13')).status, 400);
});

test('usuário ou rota inexistente, e método não permitido', async () => {
  assert.equal((await api('GET', '/api/users/99/routines')).status, 404);
  assert.equal((await api('GET', '/api/users/abc/routines')).status, 404);
  assert.equal((await api('GET', '/api/nada')).status, 404);
  const m = await api('PATCH', '/api/users/1/routines');
  assert.equal(m.status, 405);
  assert.match(m.headers.get('allow'), /GET/);
});

test('registros do calendário: criar, filtrar por mês e excluir', async () => {
  const a = await api('POST', '/api/users/1/logs', registro('2026-10-29'));
  assert.equal(a.status, 201);
  await api('POST', '/api/users/1/logs', registro('2026-11-02'));

  assert.equal((await api('GET', '/api/users/1/logs')).body.length, 2);
  const out = await api('GET', '/api/users/1/logs?month=2026-10');
  assert.deepEqual(out.body.map(l => l.date), ['2026-10-29']);
  assert.equal((await api('GET', '/api/users/2/logs')).body.length, 0);

  assert.equal((await api('DELETE', `/api/users/1/logs/${a.body.id}`)).status, 204);
  assert.equal((await api('GET', `/api/users/1/logs/${a.body.id}`)).status, 404);
});

test('registro avulso (sem exercícios) e correção da data', async () => {
  const c = await api('POST', '/api/users/1/logs', { date: '2026-09-10', name: 'Aula de Pilates', minutes: 50 });
  assert.equal(c.status, 201);
  assert.deepEqual(c.body.items, []);

  // aula avulsa só com data e nome: duração 0 e sem exercícios
  const aula = await api('POST', '/api/users/1/logs', { date: '2026-08-11', name: 'Spinning' });
  assert.equal(aula.status, 201);
  assert.equal(aula.body.minutes, 0);
  assert.deepEqual(aula.body.items, []);

  const u = await api('PUT', `/api/users/1/logs/${c.body.id}`, { date: '2026-09-08', name: 'Aula de Pilates', minutes: 50, items: [] });
  assert.equal(u.status, 200);
  assert.equal(u.body.date, '2026-09-08');
  assert.equal((await api('GET', `/api/users/1/logs/${c.body.id}`)).body.date, '2026-09-08');
  assert.deepEqual((await api('GET', '/api/users/1/logs?month=2026-09')).body.map(l => l.date), ['2026-09-08']);

  assert.equal((await api('PUT', `/api/users/1/logs/${c.body.id}`, { date: '2026-02-30', name: 'x', minutes: 1 })).status, 400);
  assert.equal((await api('PUT', `/api/users/2/logs/${c.body.id}`, { date: '2026-09-08', name: 'x', minutes: 1 })).status, 404);
  assert.equal((await api('PUT', '/api/users/1/logs/nao-existe', { date: '2026-09-08', name: 'x', minutes: 1 })).status, 404);
  assert.equal((await api('GET', `/api/users/1/logs/${c.body.id}`)).body.date, '2026-09-08');
});

test('treino em andamento: iniciar, atualizar, buscar e descartar', async () => {
  assert.equal((await api('GET', '/api/users/1/session')).status, 404);
  const s = { name: 'Treino A', start: 1782000000000, items: [{ exId: 'Barbell_Squat', sets: 3, reps: 10, weight: 40, done: false }] };
  assert.equal((await api('PUT', '/api/users/1/session', s)).status, 200);
  s.items[0].done = true;
  assert.equal((await api('PUT', '/api/users/1/session', s)).status, 200);
  assert.equal((await api('GET', '/api/users/1/session')).body.items[0].done, true);
  assert.equal((await api('GET', '/api/users/2/session')).status, 404);
  assert.equal((await api('DELETE', '/api/users/1/session')).status, 204);
  assert.equal((await api('GET', '/api/users/1/session')).status, 404);
});

test('rota antiga /state foi removida', async () => {
  assert.equal((await api('GET', '/api/users/1/state')).status, 404);
  assert.equal((await api('PUT', '/api/users/1/state', { routines: [] })).status, 404);
});

test('documentação e especificação são públicas', async () => {
  const semCookie = cookie; cookie = '';
  const docs = await fetch(base + '/docs');
  assert.equal(docs.status, 200);
  assert.match(await docs.text(), /swagger-ui/);
  const spec = await fetch(base + '/openapi.yaml');
  assert.equal(spec.status, 200);
  assert.match(await spec.text(), /openapi: 3\.0\.3/);
  assert.equal((await fetch(base + '/corpo.js')).status, 200);
  cookie = semCookie;
});
