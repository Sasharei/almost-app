const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { confirmationAmountPrecision } = require('../../src/utils/confirmationAmount');
const app = fs.readFileSync(path.join(__dirname, '../../App.js'), 'utf8');

test('all currencies hide conversion residue at tiny, typical and maximum amounts', () => {
  for (const precision of [0, 2, 3]) for (const value of [0, 0.000574, 15.000574, 9999999.999999, 1e9, NaN, Infinity]) {
    const digits = confirmationAmountPrecision(value, precision);
    assert.equal(digits, precision);
    if (Number.isFinite(value)) assert.ok(value.toFixed(digits).split('.')[1]?.length <= precision || precision === 0);
  }
});

test("CTA counts today’s pending cards and only suggests finishing after real progress", () => {
  const expression = app.match(/\{t\(completedToday > 0 && remainingEntries.length === 1[^\n]+\)\}/)[0].slice(1, -1);
  for (const completedToday of [0, 1, 6]) {
    for (const count of [0, 1, 2, 3, 4, 8, 10000]) {
      const key = !count ? 'redesignTodayDecide' : completedToday && count === 1 ? 'todayDecisionLast' : completedToday && count <= 3 ? 'todayDecisionFew' : 'todayDecisionReview';
      const result = vm.runInNewContext(expression, { completedToday, remainingEntries: new Array(count), t: (name, params) => ({ name, count: params.count }) });
      assert.equal(result.name, key);
      assert.equal(result.count, count);
    }
  }
});

test('opting out updates every control, survives reload and wins over a delayed hydration', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../../src/utils/almostPayPreference.js'), 'utf8')
    .replace(/^import .*;\n/, '').replace(/export /g, '');
  let stored = null, finishRead;
  const storage = { getItem: () => new Promise((resolve) => { finishRead = resolve; }), setItem: async (_key, value) => { stored = value; } };
  const create = () => vm.runInNewContext(`${code}\n({ subscribeAlmostPayPreference, disableAlmostPayBiometrics })`, { AsyncStorage: storage });
  const preference = create();
  const first = [], second = [];
  const a = preference.subscribeAlmostPayPreference((value) => first.push(value));
  const b = preference.subscribeAlmostPayPreference((value) => second.push(value));
  await preference.disableAlmostPayBiometrics();
  finishRead(null); await a.ready;
  assert.equal(stored, '1'); assert.equal(first.at(-1), true); assert.equal(second.at(-1), true);
  a.unsubscribe(); b.unsubscribe();
  const reloaded = create(); const values = [];
  const c = reloaded.subscribeAlmostPayPreference((value) => values.push(value));
  finishRead(stored); await c.ready; assert.equal(values.at(-1), true); c.unsubscribe();
});

test('failed persistence never tells mounted controls that permanent opt-out succeeded', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../../src/utils/almostPayPreference.js'), 'utf8').replace(/^import .*;\n/, '').replace(/export /g, '');
  const preference = vm.runInNewContext(`${code}\n({ subscribeAlmostPayPreference, disableAlmostPayBiometrics })`, { AsyncStorage: { getItem: async () => null, setItem: async () => { throw Error('disk'); } } });
  const values = []; const sub = preference.subscribeAlmostPayPreference((value) => values.push(value));
  await sub.ready;
  await assert.rejects(preference.disableAlmostPayBiometrics(), /disk/);
  assert.equal(values.at(-1), false); sub.unsubscribe();
});

test('display boundaries retain full accessible titles and native widgets constrain long content', () => {
  const sheet = fs.readFileSync(path.join(__dirname, '../../src/components/AlmostPay.js'), 'utf8');
  assert.match(sheet, /numberOfLines=\{3\} accessibilityLabel=\{request\?\.title\}/);
  assert.match(app, /numberOfLines=\{3\} accessibilityLabel=\{displayTitle\}/);
  for (const layout of ['almost_widget.xml', 'almost_widget_small.xml']) {
    const xml = fs.readFileSync(path.join(__dirname, '../../android/app/src/main/res/layout', layout), 'utf8');
    assert.match(xml, /autoSizeTextType="uniform"/); assert.match(xml, /ellipsize="end"/);
  }
  const widget = fs.readFileSync(path.join(__dirname, '../../ios/Almost Widget/Almost_Widget.swift'), 'utf8');
  assert.match(widget, /\.lineLimit\(1\)/); assert.match(widget, /\.minimumScaleFactor\(0.5\)/);
});
