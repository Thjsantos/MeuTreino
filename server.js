// Servidor do Meu Treino: serve o site e guarda os dados em SQLite/Turso (libSQL), fora do projeto.
// Local:   node server.js            -> banco em ~/MeuTreinoDados/treino.db
// Nuvem:   defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN (e APP_PASSWORD para proteger o acesso)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { createClient } = require('@libsql/client');

const PORT = process.env.PORT || 3000;
const USERS = ['Thiago', 'Carla'];
const PASSWORD = process.env.APP_PASSWORD || '';

let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const file = process.env.MEUTREINO_DB || path.join(os.homedir(), 'MeuTreinoDados', 'treino.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  url = 'file:' + file.replace(/\\/g, '/');
}
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

// cookie de acesso: HMAC da senha (a senha em si nunca é guardada no navegador)
const authValue = PASSWORD ? crypto.createHmac('sha256', PASSWORD).update('meutreino').digest('hex') : '';
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const autorizado = req => {
  if (!PASSWORD) return true;
  const m = /(?:^|;\s*)mt_auth=([a-f0-9]+)/.exec(req.headers.cookie || '');
  return !!m && same(m[1], authValue);
};

async function init() {
  await db.batch([
    'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL)',
    `CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, items TEXT NOT NULL, pos INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL, name TEXT NOT NULL, minutes INTEGER NOT NULL, items TEXT NOT NULL)`,
    'CREATE INDEX IF NOT EXISTS logs_user_date ON logs(user_id, date)',
    `CREATE TABLE IF NOT EXISTS sessions (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL)`,
    ...USERS.map(n => ({ sql: 'INSERT OR IGNORE INTO users (name) VALUES (?)', args: [n] })),
  ], 'write');
}

async function getState(uid) {
  const [r, l, s] = await Promise.all([
    db.execute({ sql: 'SELECT id, name, items FROM routines WHERE user_id = ? ORDER BY pos', args: [uid] }),
    db.execute({ sql: 'SELECT id, date, name, minutes, items FROM logs WHERE user_id = ? ORDER BY date, rowid', args: [uid] }),
    db.execute({ sql: 'SELECT data FROM sessions WHERE user_id = ?', args: [uid] }),
  ]);
  return {
    routines: r.rows.map(x => ({ id: x.id, name: x.name, items: JSON.parse(x.items) })),
    logs: l.rows.map(x => ({ id: x.id, date: x.date, name: x.name, minutes: Number(x.minutes), items: JSON.parse(x.items) })),
    session: s.rows[0] ? JSON.parse(s.rows[0].data) : null,
  };
}
async function setState(uid, st) {
  const ops = [
    { sql: 'DELETE FROM routines WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM logs WHERE user_id = ?', args: [uid] },
    { sql: 'DELETE FROM sessions WHERE user_id = ?', args: [uid] },
    ...(st.routines || []).map((r, i) => ({ sql: 'INSERT INTO routines (id, user_id, name, items, pos) VALUES (?, ?, ?, ?, ?)', args: [String(r.id), uid, String(r.name), JSON.stringify(r.items || []), i] })),
    ...(st.logs || []).map(l => ({ sql: 'INSERT INTO logs (id, user_id, date, name, minutes, items) VALUES (?, ?, ?, ?, ?, ?)', args: [String(l.id), uid, String(l.date), String(l.name), Number(l.minutes) || 0, JSON.stringify(l.items || [])] })),
  ];
  if (st.session) ops.push({ sql: 'INSERT INTO sessions (user_id, data) VALUES (?, ?)', args: [uid, JSON.stringify(st.session)] });
  await db.batch(ops, 'write'); // atômico
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const PUBLIC = new Set(['index.html', 'app.js', 'style.css', 'exercises.js', 'exercises_pt.js', 'manifest.webmanifest', 'icon.svg']);
const json = (res, code, obj, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...headers }); res.end(JSON.stringify(obj)); };
const lerCorpo = req => new Promise((ok, no) => {
  let b = '';
  req.on('data', c => { b += c; if (b.length > 5e6) { req.destroy(); no(new Error('corpo grande demais')); } });
  req.on('end', () => ok(b));
  req.on('error', no);
});

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname === '/api/login' && req.method === 'POST') {
      const { senha } = JSON.parse(await lerCorpo(req) || '{}');
      if (PASSWORD && !(typeof senha === 'string' && same(crypto.createHash('sha256').update(senha).digest('hex'), crypto.createHash('sha256').update(PASSWORD).digest('hex'))))
        return json(res, 401, { erro: 'senha incorreta' });
      return json(res, 200, { ok: true }, PASSWORD ? { 'Set-Cookie': `mt_auth=${authValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}` } : {});
    }
    if (u.pathname.startsWith('/api/')) {
      if (!autorizado(req)) return json(res, 401, { erro: 'acesso negado' });
      if (u.pathname === '/api/users' && req.method === 'GET') return json(res, 200, (await db.execute('SELECT id, name FROM users ORDER BY id')).rows.map(x => ({ id: Number(x.id), name: x.name })));
      const m = u.pathname.match(/^\/api\/users\/(\d+)\/state$/);
      if (m) {
        const uid = Number(m[1]);
        if (!(await db.execute({ sql: 'SELECT 1 FROM users WHERE id = ?', args: [uid] })).rows.length) return json(res, 404, { erro: 'usuário não encontrado' });
        if (req.method === 'GET') return json(res, 200, await getState(uid));
        if (req.method === 'PUT') { await setState(uid, JSON.parse(await lerCorpo(req))); return json(res, 200, { ok: true }); }
      }
      return json(res, 404, { erro: 'não encontrado' });
    }
    const name = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
    if (PUBLIC.has(name)) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(name)] || 'application/octet-stream' });
      return fs.createReadStream(path.join(__dirname, name)).pipe(res);
    }
    json(res, 404, { erro: 'não encontrado' });
  } catch (e) { console.error(e); json(res, 500, { erro: 'erro interno' }); }
}).listen(PORT, async () => {
  try { await init(); console.log(`Meu Treino rodando em http://localhost:${PORT}\nBanco: ${url.startsWith('file:') ? url : 'Turso (nuvem)'}${PASSWORD ? ' | acesso protegido por senha' : ' | sem senha'}`); }
  catch (e) { console.error('Falha ao iniciar o banco:', e.message); process.exit(1); }
});
