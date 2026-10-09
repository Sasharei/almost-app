const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveAmountSliderStep, snapAmountSliderValue, amountSliderRatioFromX, amountSliderDragDelta } = require('../../src/utils/amountSlider');

test('currency steps scale from small purchases to large amounts', () => {
  assert.equal(resolveAmountSliderStep(20, 0.5), 0.5);
  assert.equal(resolveAmountSliderStep(120, 0.5), 1);
  assert.equal(resolveAmountSliderStep(12000, 5), 100);
  assert.equal(resolveAmountSliderStep(0.1, 0.01), 0.01);
  assert.equal(resolveAmountSliderStep(0.2, 0.5, 0.01), 0.01);
  assert.equal(resolveAmountSliderStep(2, 0.5, 0.01), 0.02);
});
test('both visible thumb endpoints map to the exact range endpoints', () => {
  assert.equal(amountSliderRatioFromX(16, 300), 0);
  assert.equal(amountSliderRatioFromX(284, 300), 1);
  assert.equal(amountSliderRatioFromX(150, 300), 0.5);
  assert.equal(amountSliderRatioFromX(-20, 300), 0);
  assert.equal(amountSliderRatioFromX(350, 300), 1);
});
test('tremor does not chatter, deliberate movement advances a currency step', () => {
  assert.equal(snapAmountSliderValue(10.29, 20, 0.5, 0.5, 10), 10);
  assert.equal(snapAmountSliderValue(10.31, 20, 0.5, 0.5, 10), 10.5);
  assert.equal(snapAmountSliderValue(10.24, 20, 0.5, 0.5, 10.5), 10.5);
  assert.equal(snapAmountSliderValue(10.19, 20, 0.5, 0.5, 10.5), 10);
});
test('minimum stays positive and a non-round maximum remains reachable', () => {
  assert.equal(snapAmountSliderValue(0, 19.73, 0.5, 0.5, 10), 0.5);
  assert.equal(snapAmountSliderValue(100, 19.73, 0.5, 0.5, 10), 19.73);
});
test('vertical fine adjustment preserves position and slows horizontal movement', () => {
  assert.equal(amountSliderDragDelta(0, 150, 300), 0);
  assert.equal(amountSliderDragDelta(26.8, 0, 300), 0.1);
  assert.equal(amountSliderDragDelta(26.8, 60, 300), 0.025);
  assert.equal(amountSliderDragDelta(26.8, 150, 300), 0.01);
  assert.equal(amountSliderDragDelta(-26.8, 150, 300), -0.01);
});

test('the all-cards slider uses currency steps and emits ticks only for changed amounts', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const source = fs.readFileSync(require.resolve('../../App.js'), 'utf8');
  const start = source.indexOf('    (nextValue, { fromUser = false, force = false } = {}) => {');
  const end = source.indexOf(',\n    [\n      amountSliderHapticCooldownMs', start);
  const ref = { current: 0.5 };
  let ticks = 0;
  const update = vm.runInNewContext('(' + source.slice(start, end) + ')', {
    snapAmountSliderValue, amountSliderLocalMinimum: 0, amountSliderLocalMaximum: 30,
    amountSliderCurrencyStep: 0.5, amountSliderStepCount: 60,
    amountSliderValueRef: ref, amountSliderManualUSDRef: { current: null },
    amountSliderStepRef: { current: 30 }, amountSliderHapticCooldownRef: { current: 0 },
    amountSliderHapticCooldownMs: 40, amountSliderRafRef: { current: null },
    amountSliderPendingValueRef: { current: null }, markAmountSliderInteracted: () => {},
    triggerHaptic: () => ticks++, triggerSelectionHaptic: () => ticks++, playSound: () => {},
    setAmountSliderValue: () => {}, cancelAnimationFrame: () => {},
  });
  update(0.505, { fromUser: true, force: true });
  assert.equal(ref.current, 0.5);
  assert.equal(ticks, 0);
  update(0.52, { fromUser: true, force: true });
  assert.ok(Math.abs(ref.current * 30 - 15.5) < 1e-9);
  assert.equal(ticks, 1);
  update(0, { fromUser: true, force: true });
  assert.equal(ref.current, 0);
  update(1, { fromUser: true, force: true });
  assert.equal(ref.current, 1);
});

test('slider labels reveal fractional steps while keeping whole amounts compact', () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const source = fs.readFileSync(require.resolve('../../App.js'), 'utf8');
  const start = source.indexOf('(valueLocal, currency) => {', source.indexOf('const formatAmountSliderCurrency'));
  const end = source.indexOf('\n};', start);
  const precision = currency => currency === 'JPY' ? 0 : 2;
  const format = vm.runInNewContext('(' + source.slice(start, end) + '\n})', {
    roundCurrencyValue: (value, currency) => Math.round(value * 10 ** precision(currency)) / 10 ** precision(currency),
    getCurrencyPrecision: precision,
    formatCurrency: (value, _currency, options) => ({ value, digits: options.precisionOverride }),
  });
  assert.deepEqual(format(15.5, 'USD'), { value: 15.5, digits: 2 });
  assert.deepEqual(format(15, 'USD'), { value: 15, digits: 0 });
  assert.deepEqual(format(0.01, 'USD'), { value: 0.01, digits: 2 });
  assert.deepEqual(format(15.000000001, 'USD'), { value: 15, digits: 0 });
  assert.deepEqual(format(152.4, 'JPY'), { value: 152, digits: 0 });
});
