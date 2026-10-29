// Servidor HTTP: autenticação por senha, rotas /api, documentação e arquivos estáticos.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { find } = require('./routes');
const { HttpError } = require('./errors');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.yaml': 'text/yaml; charset=utf-8' };
const PUBLIC = new Set(['index.html', 'app.js', 'corpo.js', 'style.css', 'exercises.js', 'exercises_pt.js', 'manifest.webmanifest', 'icon.svg', 'openapi.yaml']);
const MAX_BODY = 1e6;

function createServer({ repo, password = '' }) {
  // cookie de acesso: HMAC da senha (a senha em si nunca é guardada no navegador)
  const authValue = password ? crypto.createHmac('sha256', password).update('meutreino').digest('hex') : '';
  const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const hash = s => crypto.createHash('sha256').update(s).digest('hex');
  const autorizado = req => {
    if (!password) return true;
    const m = /(?:^|;\s*)mt_auth=([a-f0-9]+)/.exec(req.headers.cookie || '');
    return !!m && same(m[1], authValue);
  };

  const send = (res, code, obj, headers = {}) => {
    if (code === 204) { res.writeHead(204, headers); return res.end(); }
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(obj));
  };
  const lerCorpo = req => new Promise((ok, no) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > MAX_BODY) { req.destroy(); no(new HttpError(413, 'corpo grande demais')); } });
    req.on('end', () => {
      try { ok(b ? JSON.parse(b) : {}); } catch { no(new HttpError(400, 'JSON inválido')); }
    });
    req.on('error', no);
  });
  const arquivo = (res, file, type) => {
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(path.join(ROOT, file)).pipe(res);
  };

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname === '/api/login' && req.method === 'POST') {
        const { senha } = await lerCorpo(req);
        if (password && !(typeof senha === 'string' && same(hash(senha), hash(password)))) throw new HttpError(401, 'senha incorreta');
        const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
        return send(res, 200, { ok: true }, password ? { 'Set-Cookie': `mt_auth=${authValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}` } : {});
      }

      if (url.pathname.startsWith('/api/')) {
        if (!autorizado(req)) throw new HttpError(401, 'acesso negado');
        const hit = find(req.method, url.pathname);
        if (!hit) throw new HttpError(404, 'não encontrado');
        if (hit.allowed) return send(res, 405, { erro: 'método não permitido' }, { Allow: hit.allowed.join(', ') });
        const { route, params } = hit;
        let uid;
        if (route.needsUser) {
          uid = Number(params.uid);
          if (!Number.isInteger(uid) || !(await repo.userExists(uid))) throw new HttpError(404, 'usuário não encontrado');
        }
        const [status, corpo] = await route.handler({ repo, uid, params, query: url.searchParams, body: () => lerCorpo(req) });
        return send(res, status, corpo);
      }

      if (url.pathname === '/docs') return arquivo(res, 'docs.html', TYPES['.html']);
      const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (PUBLIC.has(name)) return arquivo(res, name, TYPES[path.extname(name)] || 'application/octet-stream');
      send(res, 404, { erro: 'não encontrado' });
    } catch (e) {
      if (e instanceof HttpError) return send(res, e.status, { erro: e.message });
      console.error(e);
      send(res, 500, { erro: 'erro interno' });
    }
  });
}

module.exports = { createServer };
