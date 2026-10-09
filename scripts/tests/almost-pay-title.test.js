const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the shipped title precedence, including the empty/closed sheet.
const source = readFileSync(path.join(__dirname, '../../App.js'), 'utf8');
const resolver = source.slice(source.indexOf('const resolveTemptationTitle ='), source.indexOf('const buildTemptationDisplayTitle ='));
const sheet = source.slice(source.indexOf('function SpendConfirmSheet('), source.indexOf('function StormOverlay('));
const expression = sheet.match(/const displayTitle =\s*([^;]+);/)[1];
const title = (item, titleOverride, language = 'en') => vm.runInNewContext(`${resolver}\n${expression}`, {
  item, titleOverride, language, t: () => 'Fallback', resolveLanguageMapValue: (map, lang) => map?.[lang],
});
test('Almost Pay uses the renamed card instead of its original template title', () => {
  assert.equal(title({ title: { en: 'Matcha latte' }, emoji: '🚬' }, 'Cigarettes'), 'Cigarettes');
  assert.equal(title({ title: { en: 'Matcha latte' }, titleOverride: 'My cigarettes' }, null), 'My cigarettes');
});
test('Almost Pay retains localized and user-entered titles and tolerates a closed sheet', () => {
  assert.equal(title({ title: { en: 'Coffee', ru: 'Кофе' } }, null, 'ru'), 'Кофе');
  assert.equal(title({ title: 'User-entered العربية' }, null), 'User-entered العربية');
  assert.equal(title(null, null), 'Fallback');
});
