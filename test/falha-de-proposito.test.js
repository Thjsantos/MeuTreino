const { test } = require('node:test');
const assert = require('node:assert/strict');
test('falha de propósito (PR descartável para provar a trava do merge)', () => assert.equal(1 + 1, 3, 'a conta deveria dar 3'));
