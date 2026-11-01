import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const qs = require('qs');

test('bounded collection validation rejects oversized invalid input without per-element issue amplification', () => {
  const result = z.array(z.number()).max(4).safeParse(Array(50000).fill('invalid'));
  assert.equal(result.success, false);
  assert.equal(result.error.issues.length, 1);
  assert.equal(result.error.issues[0].code, 'too_big');
});

test('comma query serialization handles untrusted own toString values and retains valid query encoding', () => {
  assert.doesNotThrow(() => qs.stringify({ values: [{ toString: null }] }, { arrayFormat: 'comma' }));
  assert.equal(qs.stringify({ values: ['a', 'b'] }, { arrayFormat: 'comma' }), 'values=a%2Cb');
  assert.deepEqual(qs.parse('safe[value]=1'), { safe: { value: '1' } });
  assert.equal(qs.parse('__proto__[polluted]=1').polluted, undefined);
});
