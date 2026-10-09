/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { HOUR, resolve, timeline, SCENE_TTL } = require('./guardian');
const copy = require('./widget-copy.json');
const anchor = 1700000000000;

test('absence always returns to balance/input controls after six hours', () => {
  for (let day = 1; day <= 365; day += 1) {
    assert.equal(resolve({ lastOpenedAt: anchor }, anchor + day * 24 * HOUR).scene, 'neglected');
    assert.equal(resolve({ lastOpenedAt: anchor }, anchor + (day * 24 + 6) * HOUR).scene, 'balance');
    assert.equal(resolve({ lastOpenedAt: anchor }, anchor + (day * 24 + 23) * HOUR).scene, 'balance');
  }
});
test('financial TTL expires from original event, never from widget reload', () => {
  for (const [scene, ttl] of Object.entries(SCENE_TTL)) {
    const snapshot = { financialUpdatedAt: anchor, eventAt: anchor, eventScene: scene, lastOpenedAt: anchor };
    assert.equal(resolve(snapshot, anchor + ttl - 1).scene, scene);
    assert.equal(resolve(snapshot, anchor + ttl).scene, 'balance');
    // A later data sync cannot extend the same event's lifetime.
    assert.equal(resolve({ ...snapshot, financialUpdatedAt: anchor + ttl }, anchor + ttl).scene, 'balance');
  }
});
test('stale, missing, future or corrupt data cannot fabricate a financial scene', () => {
  const now = anchor + 25 * HOUR;
  for (const financialUpdatedAt of [undefined, NaN, Infinity, -1, now + HOUR, anchor]) {
    assert.equal(resolve({ financialUpdatedAt, eventAt: now, eventScene: 'empty_treasury' }, now).scene, 'balance');
  }
  assert.equal(resolve({ lastOpenedAt: now + HOUR }, now).scene, 'balance');
  assert.equal(resolve({}, NaN).scene, 'balance');
  assert.equal(resolve(null, now).scene, 'balance');
  assert.deepEqual(timeline({}, NaN), { entries: [], reloadAt: null });
});
test('seven-day timeline includes balance windows and a finite refresh', () => {
  const start = anchor + 24 * HOUR;
  const schedule = timeline({ lastOpenedAt: anchor }, start);
  assert.equal(schedule.entries[0].scene, 'neglected');
  assert.equal(schedule.entries[1].scene, 'balance');
  assert.ok(schedule.entries.length >= 12);
  assert.equal(schedule.entries.at(-1).scene, 'balance');
  assert.equal(schedule.entries.at(-1).date, start + 168 * HOUR);
  assert.ok(schedule.reloadAt > start && schedule.reloadAt < start + 168 * HOUR);
  for (let index = 1; index < schedule.entries.length; index += 1) {
    assert.ok(schedule.entries[index].date > schedule.entries[index - 1].date);
  }
});
test('fresh user return immediately removes the absence reaction', () => {
  const now = anchor + 100 * HOUR;
  assert.equal(resolve({ lastOpenedAt: now }, now).scene, 'balance');
});
test('widget copy covers actual app locales, key parity and placeholders', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../../src/utils/language.js'), 'utf8');
  const languages = [...source.match(/SUPPORTED_LANGUAGES = \[([\s\S]*?)\]/)[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
  const keys = Object.keys(copy.en).sort();
  const html = fs.readFileSync(require('node:path').join(__dirname, 'review.html'), 'utf8');
  const embedded = JSON.parse(html.match(/<script id="widget-copy" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(embedded, copy, 'offline review copy stays synchronized');
  for (const language of languages) {
    const dictionary = copy[language.startsWith('ar-') ? 'ar' : language];
    assert.ok(dictionary, language);
    assert.deepEqual(Object.keys(dictionary).sort(), keys, language);
    for (const key of keys) {
      assert.ok(typeof dictionary[key] === 'string' && dictionary[key].trim(), `${language}.${key}`);
      assert.deepEqual(dictionary[key].match(/\{\{.*?\}\}/g) || [], copy.en[key].match(/\{\{.*?\}\}/g) || []);
    }
  }
});
