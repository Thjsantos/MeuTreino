// Validação dos corpos de requisição. Cada função devolve o valor limpo ou lança HttpError(400).
const { HttpError } = require('./errors');

const bad = msg => { throw new HttpError(400, msg); };
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

function texto(v, campo, max = 100) {
  if (typeof v !== 'string' || !v.trim()) bad(`${campo} é obrigatório`);
  const t = v.trim();
  if (t.length > max) bad(`${campo} deve ter no máximo ${max} caracteres`);
  return t;
}
function inteiro(v, campo, min, max) {
  if (!Number.isInteger(v) || v < min || v > max) bad(`${campo} deve ser um inteiro entre ${min} e ${max}`);
  return v;
}
function numero(v, campo, min, max) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) bad(`${campo} deve ser um número entre ${min} e ${max}`);
  return v;
}

function itens(lista, comDone) {
  if (!Array.isArray(lista)) bad('items deve ser uma lista');
  if (lista.length > 100) bad('items aceita no máximo 100 exercícios');
  return lista.map((it, i) => {
    if (!isObj(it)) bad(`items[${i}] inválido`);
    const out = {
      exId: texto(it.exId, `items[${i}].exId`),
      sets: inteiro(it.sets, `items[${i}].sets`, 1, 999),
      reps: inteiro(it.reps, `items[${i}].reps`, 1, 999),
      weight: numero(it.weight ?? 0, `items[${i}].weight`, 0, 9999),
    };
    if (comDone) {
      if (typeof it.done !== 'boolean') bad(`items[${i}].done deve ser verdadeiro ou falso`);
      out.done = it.done;
    }
    return out;
  });
}

function data(v, campo = 'date') {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v + 'T00:00:00Z')) ||
      new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) !== v) bad(`${campo} deve estar no formato AAAA-MM-DD`);
  return v;
}

function routine(b) {
  if (!isObj(b)) bad('corpo inválido');
  return { name: texto(b.name, 'name'), items: itens(b.items ?? [], false) };
}
function log(b) {
  if (!isObj(b)) bad('corpo inválido');
  return {
    date: data(b.date),
    name: texto(b.name, 'name'),
    minutes: inteiro(b.minutes ?? 0, 'minutes', 0, 1440),
    items: itens(b.items ?? [], true),
  };
}
function session(b) {
  if (!isObj(b)) bad('corpo inválido');
  return {
    name: texto(b.name, 'name'),
    start: inteiro(b.start, 'start', 0, Number.MAX_SAFE_INTEGER),
    items: itens(b.items, true),
  };
}
function mes(v) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) bad('month deve estar no formato AAAA-MM');
  return v;
}

module.exports = { routine, log, session, mes };
