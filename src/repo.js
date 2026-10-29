// Acesso ao banco (SQLite/Turso). Nenhuma regra de negócio aqui, só SQL.
const crypto = require('node:crypto');

const rotina = r => ({ id: r.id, name: r.name, items: JSON.parse(r.items) });
const registro = l => ({ id: l.id, date: l.date, name: l.name, minutes: Number(l.minutes), items: JSON.parse(l.items) });

async function init(db, users) {
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
    ...users.map(n => ({ sql: 'INSERT OR IGNORE INTO users (name) VALUES (?)', args: [n] })),
  ], 'write');
}

function makeRepo(db) {
  const run = (sql, args = []) => db.execute({ sql, args });
  return {
    // usuários
    async listUsers() { return (await run('SELECT id, name FROM users ORDER BY id')).rows.map(x => ({ id: Number(x.id), name: x.name })); },
    async userExists(uid) { return (await run('SELECT 1 FROM users WHERE id = ?', [uid])).rows.length > 0; },

    // treinos
    async listRoutines(uid) { return (await run('SELECT id, name, items FROM routines WHERE user_id = ? ORDER BY pos', [uid])).rows.map(rotina); },
    async getRoutine(uid, rid) { const r = (await run('SELECT id, name, items FROM routines WHERE user_id = ? AND id = ?', [uid, rid])).rows[0]; return r ? rotina(r) : null; },
    async createRoutine(uid, { name, items }) {
      const id = crypto.randomUUID();
      await run('INSERT INTO routines (id, user_id, name, items, pos) SELECT ?, ?, ?, ?, COALESCE(MAX(pos), -1) + 1 FROM routines WHERE user_id = ?',
        [id, uid, name, JSON.stringify(items), uid]);
      return { id, name, items };
    },
    async updateRoutine(uid, rid, { name, items }) {
      const r = await run('UPDATE routines SET name = ?, items = ? WHERE user_id = ? AND id = ?', [name, JSON.stringify(items), uid, rid]);
      return r.rowsAffected > 0 ? { id: rid, name, items } : null;
    },
    async deleteRoutine(uid, rid) { return (await run('DELETE FROM routines WHERE user_id = ? AND id = ?', [uid, rid])).rowsAffected > 0; },

    // registros do calendário
    async listLogs(uid, month) {
      const r = month
        ? await run("SELECT id, date, name, minutes, items FROM logs WHERE user_id = ? AND substr(date, 1, 7) = ? ORDER BY date, rowid", [uid, month])
        : await run('SELECT id, date, name, minutes, items FROM logs WHERE user_id = ? ORDER BY date, rowid', [uid]);
      return r.rows.map(registro);
    },
    async getLog(uid, lid) { const r = (await run('SELECT id, date, name, minutes, items FROM logs WHERE user_id = ? AND id = ?', [uid, lid])).rows[0]; return r ? registro(r) : null; },
    async createLog(uid, l) {
      const id = crypto.randomUUID();
      await run('INSERT INTO logs (id, user_id, date, name, minutes, items) VALUES (?, ?, ?, ?, ?, ?)', [id, uid, l.date, l.name, l.minutes, JSON.stringify(l.items)]);
      return { id, ...l };
    },
    async updateLog(uid, lid, l) {
      const r = await run('UPDATE logs SET date = ?, name = ?, minutes = ?, items = ? WHERE user_id = ? AND id = ?', [l.date, l.name, l.minutes, JSON.stringify(l.items), uid, lid]);
      return r.rowsAffected > 0 ? { id: lid, ...l } : null;
    },
    async deleteLog(uid, lid) { return (await run('DELETE FROM logs WHERE user_id = ? AND id = ?', [uid, lid])).rowsAffected > 0; },

    // treino em andamento (no máximo um por usuário)
    async getSession(uid) { const r = (await run('SELECT data FROM sessions WHERE user_id = ?', [uid])).rows[0]; return r ? JSON.parse(r.data) : null; },
    async setSession(uid, s) { await run('INSERT INTO sessions (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data', [uid, JSON.stringify(s)]); return s; },
    async deleteSession(uid) { return (await run('DELETE FROM sessions WHERE user_id = ?', [uid])).rowsAffected > 0; },
  };
}

module.exports = { init, makeRepo };
