const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
require('../public/corpo.js');
const { corpoSVG } = global.window;

const s = fs.readFileSync(path.join(__dirname, '..', 'public', 'dados', 'exercises.js'), 'utf8');
const exercicios = JSON.parse(s.slice(s.indexOf('=') + 1, s.lastIndexOf(';')));
const musculos = [...new Set(exercicios.flatMap(e => [...e.primaryMuscles, ...e.secondaryMuscles]))];

test('todo músculo usado na base tem forma no desenho', () => {
  for (const m of musculos) {
    assert.ok(corpoSVG([m]).includes(`class="mus p" data-m="${m}"`), `sem forma para "${m}"`);
  }
});

test('destaca principal e secundário, e deixa os demais neutros', () => {
  const svg = corpoSVG(['chest'], ['triceps']);
  assert.ok(svg.includes('class="mus p" data-m="chest"'));
  assert.ok(svg.includes('class="mus s" data-m="triceps"'));
  assert.ok(svg.includes('class="mus" data-m="calves"'));
});

test('músculo principal não aparece também como secundário', () => {
  const svg = corpoSVG(['biceps'], ['biceps']);
  assert.ok(!svg.includes('class="mus s" data-m="biceps"'));
});

test('sem músculos o desenho continua válido', () => {
  const svg = corpoSVG();
  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'));
});
