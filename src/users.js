// Lista de usuários a partir da variável de ambiente USERS (nomes separados por vírgula).
const PADRAO = ['Thiago', 'Carla'];
const MAX = 50;

function parseUsers(valor) {
  if (valor === undefined || !valor.trim()) return PADRAO;
  const vistos = new Set();
  const nomes = [];
  for (const bruto of valor.split(',')) {
    const nome = bruto.trim().replace(/\s+/g, ' ');
    if (!nome) continue;
    if (nome.length > MAX) throw new Error(`USERS: o nome "${nome.slice(0, 20)}…" passa de ${MAX} caracteres`);
    const chave = nome.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    nomes.push(nome);
  }
  return nomes.length ? nomes : PADRAO;
}

module.exports = { parseUsers, PADRAO };
