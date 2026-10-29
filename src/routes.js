// Rotas da API. Cada rota recebe { repo, uid, params, query, body } e devolve [status, corpo].
const validate = require('./validate');
const { HttpError } = require('./errors');

const nao = msg => { throw new HttpError(404, msg); };

// [método, padrão, precisaUsuario, handler]
const routes = [
  ['GET', '/api/users', false, ({ repo }) => repo.listUsers().then(u => [200, u])],

  // treinos
  ['GET', '/api/users/:uid/routines', true, async ({ repo, uid }) => [200, await repo.listRoutines(uid)]],
  ['POST', '/api/users/:uid/routines', true, async ({ repo, uid, body }) => [201, await repo.createRoutine(uid, validate.routine(await body()))]],
  ['GET', '/api/users/:uid/routines/:rid', true, async ({ repo, uid, params }) => [200, (await repo.getRoutine(uid, params.rid)) ?? nao('treino não encontrado')]],
  ['PUT', '/api/users/:uid/routines/:rid', true, async ({ repo, uid, params, body }) => {
    const r = validate.routine(await body());
    return [200, (await repo.updateRoutine(uid, params.rid, r)) ?? nao('treino não encontrado')];
  }],
  ['DELETE', '/api/users/:uid/routines/:rid', true, async ({ repo, uid, params }) => {
    if (!(await repo.deleteRoutine(uid, params.rid))) nao('treino não encontrado');
    return [204];
  }],

  // registros do calendário
  ['GET', '/api/users/:uid/logs', true, async ({ repo, uid, query }) => {
    const month = query.get('month');
    return [200, await repo.listLogs(uid, month === null ? null : validate.mes(month))];
  }],
  ['POST', '/api/users/:uid/logs', true, async ({ repo, uid, body }) => [201, await repo.createLog(uid, validate.log(await body()))]],
  ['GET', '/api/users/:uid/logs/:lid', true, async ({ repo, uid, params }) => [200, (await repo.getLog(uid, params.lid)) ?? nao('registro não encontrado')]],
  ['PUT', '/api/users/:uid/logs/:lid', true, async ({ repo, uid, params, body }) => {
    const l = validate.log(await body());
    return [200, (await repo.updateLog(uid, params.lid, l)) ?? nao('registro não encontrado')];
  }],
  ['DELETE', '/api/users/:uid/logs/:lid', true, async ({ repo, uid, params }) => {
    if (!(await repo.deleteLog(uid, params.lid))) nao('registro não encontrado');
    return [204];
  }],

  // treino em andamento
  ['GET', '/api/users/:uid/session', true, async ({ repo, uid }) => [200, (await repo.getSession(uid)) ?? nao('nenhum treino em andamento')]],
  ['PUT', '/api/users/:uid/session', true, async ({ repo, uid, body }) => [200, await repo.setSession(uid, validate.session(await body()))]],
  ['DELETE', '/api/users/:uid/session', true, async ({ repo, uid }) => {
    if (!(await repo.deleteSession(uid))) nao('nenhum treino em andamento');
    return [204];
  }],
];

const compiled = routes.map(([method, pattern, needsUser, handler]) => ({
  method, needsUser, handler,
  re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'),
}));

// Devolve { route, params } ou { allowed } (caminho existe, método não) ou null.
function find(method, pathname) {
  const allowed = [];
  for (const r of compiled) {
    const m = r.re.exec(pathname);
    if (!m) continue;
    if (r.method === method) return { route: r, params: { ...m.groups } };
    allowed.push(r.method);
  }
  return allowed.length ? { allowed } : null;
}

module.exports = { find };
