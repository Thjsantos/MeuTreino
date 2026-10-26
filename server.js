// Servidor do Meu Treino: serve o site e guarda os dados em SQLite, fora da pasta do projeto.
// Uso: node server.js   (abre em http://localhost:3000)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.MEUTREINO_DB || path.join(os.homedir(), 'MeuTreinoDados', 'treino.db');
const USERS = ['Thiago', 'Carla'];

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
  CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, items TEXT NOT NULL, pos INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL, name TEXT NOT NULL, minutes INTEGER NOT NULL, items TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS logs_user_date ON logs(user_id, date);
  CREATE TABLE IF NOT EXISTS sessions (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL);
`);
for (const n of USERS) db.prepare('INSERT OR IGNORE INTO users (name) VALUES (?)').run(n);

const q = {
  users: db.prepare('SELECT id, name FROM users ORDER BY id'),
  routines: db.prepare('SELECT id, name, items FROM routines WHERE user_id = ? ORDER BY pos'),
  logs: db.prepare('SELECT id, date, name, minutes, items FROM logs WHERE user_id = ? ORDER BY date, rowid'),
  session: db.prepare('SELECT data FROM sessions WHERE user_id = ?'),
  delRoutines: db.prepare('DELETE FROM routines WHERE user_id = ?'),
  delLogs: db.prepare('DELETE FROM logs WHERE user_id = ?'),
  delSession: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
  insRoutine: db.prepare('INSERT INTO routines (id, user_id, name, items, pos) VALUES (?, ?, ?, ?, ?)'),
  insLog: db.prepare('INSERT INTO logs (id, user_id, date, name, minutes, items) VALUES (?, ?, ?, ?, ?, ?)'),
  insSession: db.prepare('INSERT INTO sessions (user_id, data) VALUES (?, ?)'),
};

function getState(uid) {
  const s = q.session.get(uid);
  return {
    routines: q.routines.all(uid).map(r => ({ id: r.id, name: r.name, items: JSON.parse(r.items) })),
    logs: q.logs.all(uid).map(l => ({ id: l.id, date: l.date, name: l.name, minutes: l.minutes, items: JSON.parse(l.items) })),
    session: s ? JSON.parse(s.data) : null,
  };
}
function setState(uid, st) {
  db.exec('BEGIN');
  try {
    q.delRoutines.run(uid); q.delLogs.run(uid); q.delSession.run(uid);
    (st.routines || []).forEach((r, i) => q.insRoutine.run(String(r.id), uid, String(r.name), JSON.stringify(r.items || []), i));
    (st.logs || []).forEach(l => q.insLog.run(String(l.id), uid, String(l.date), String(l.name), Number(l.minutes) || 0, JSON.stringify(l.items || [])));
    if (st.session) q.insSession.run(uid, JSON.stringify(st.session));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.ico': 'image/x-icon' };
const PUBLIC = new Set(['index.html', 'app.js', 'style.css', 'exercises.js', 'exercises_pt.js']);
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const m = url.pathname.match(/^\/api\/users\/(\d+)\/state$/);
  try {
    if (url.pathname === '/api/users' && req.method === 'GET') return json(res, 200, q.users.all());
    if (m) {
      const uid = Number(m[1]);
      if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(uid)) return json(res, 404, { erro: 'usuário não encontrado' });
      if (req.method === 'GET') return json(res, 200, getState(uid));
      if (req.method === 'PUT') {
        let body = '';
        req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
        req.on('end', () => { try { setState(uid, JSON.parse(body)); json(res, 200, { ok: true }); } catch (e) { json(res, 400, { erro: e.message }); } });
        return;
      }
    }
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (PUBLIC.has(name)) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(name)] || 'application/octet-stream' });
      return fs.createReadStream(path.join(__dirname, name)).pipe(res);
    }
    json(res, 404, { erro: 'não encontrado' });
  } catch (e) { json(res, 500, { erro: e.message }); }
}).listen(PORT, () => console.log(`Meu Treino rodando em http://localhost:${PORT}\nBanco de dados: ${DB_FILE}`));
