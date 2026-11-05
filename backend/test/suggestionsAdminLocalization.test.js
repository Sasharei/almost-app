import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { messages, languages } from '../admin/suggestions/i18n.js';
test('moderation UI copy covers all twelve shipping locales and every literal UI key', () => {
  const expected = [
    'en',
    'es',
    'fr',
    'ru',
    'de',
    'pt',
    'it',
    'ar',
    'zh',
    'zh-Hant',
    'ko',
    'ja',
  ];
  assert.deepEqual(Object.keys(messages).sort(), expected.sort());
  assert.deepEqual(Object.keys(languages).sort(), expected.sort());
  const keys = Object.keys(messages.en).sort();
  for (const locale of expected) {
    assert.deepEqual(Object.keys(messages[locale]).sort(), keys);
    for (const value of Object.values(messages[locale])) {
      assert.equal(typeof value, 'string');
      assert.ok(value.trim().length);
      assert.ok(!/[\u2013\u2014]/u.test(value));
    }
  }
  const app = fs.readFileSync(
    new URL('../admin/suggestions/app.js', import.meta.url),
    'utf8',
  );
  const html = fs.readFileSync(
    new URL('../admin/suggestions/index.html', import.meta.url),
    'utf8',
  );
  for (const match of [
    ...app.matchAll(/\bt\('([a-zA-Z_]+)'\)/g),
    ...html.matchAll(/data-t="([a-zA-Z_]+)"/g),
  ])
    assert.ok(keys.includes(match[1]), match[1]);
});
