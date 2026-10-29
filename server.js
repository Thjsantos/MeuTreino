// Meu Treino: serve o site e a API, guardando os dados em SQLite/Turso (libSQL), fora do projeto.
// Local:   node server.js            -> banco em ~/MeuTreinoDados/treino.db
// Nuvem:   defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN (e APP_PASSWORD para proteger o acesso)
// Usuários: USERS="Ana,Bruno" (padrão: Thiago,Carla)
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createClient } = require('@libsql/client');
const { init, makeRepo } = require('./src/repo');
const { createServer } = require('./src/http');
const { parseUsers } = require('./src/users');

const PORT = process.env.PORT || 3000;
const USERS = parseUsers(process.env.USERS);
const PASSWORD = process.env.APP_PASSWORD || '';

let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const file = process.env.MEUTREINO_DB || path.join(os.homedir(), 'MeuTreinoDados', 'treino.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  url = 'file:' + file.replace(/\\/g, '/');
}
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

createServer({ repo: makeRepo(db), password: PASSWORD }).listen(PORT, async () => {
  try {
    await init(db, USERS);
    console.log(`Meu Treino rodando em http://localhost:${PORT}  (documentação da API: /docs)\nBanco: ${url.startsWith('file:') ? url : 'Turso (nuvem)'}${PASSWORD ? ' | acesso protegido por senha' : ' | sem senha'}`);
  } catch (e) { console.error('Falha ao iniciar o banco:', e.message); process.exit(1); }
});
