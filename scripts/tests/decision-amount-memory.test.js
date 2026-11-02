const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDecisionAmountStats, resolveRememberedAmount, recordAmountSample } = require('../../src/utils/decisionAmountMemory');
const event = (amount, timestamp, kind = 'spend') => ({ kind, timestamp, meta: { templateId: 'coffee', id: 'coffee', amountUSD: amount } });
test('latest confirmed amount wins regardless of history ordering and duplicate aliases', () => {
  for (const events of [[event(12, 100), event(24, 300), event(18, 200)], [event(24, 300), event(18, 200), event(12, 100)]]) {
    const stats = buildDecisionAmountStats(events);
    assert.equal(stats.coffee.sampleCount, 3);
    assert.equal(resolveRememberedAmount({ lastAmountUSD: 1 }, stats.coffee, 1), 24);
  }
});
test('new confirmation wins before history updates and survives restart with decimals', () => {
  let interaction = recordAmountSample({}, 0.75);
  assert.equal(resolveRememberedAmount(interaction, null, 1), 0.75);
  interaction = { ...recordAmountSample(interaction, 2.25), lastSavedAt: 400 };
  assert.equal(resolveRememberedAmount(JSON.parse(JSON.stringify(interaction)), buildDecisionAmountStats([event(10, 300)]).coffee, 1), 2.25);
});
test('invalid amounts and unrelated events never replace the default', () => {
  const stats = buildDecisionAmountStats([event(0, 500), event(-1, 500), event(Infinity, 500), event(25, 500, 'income'), event(7.25, 100)]);
  assert.equal(resolveRememberedAmount(null, stats.coffee, 1), 7.25);
  assert.equal(resolveRememberedAmount({lastAmountUSD: 9}, null, 1), 9);
  assert.equal(resolveRememberedAmount(null, null, 0), 0);
});
test('legacy averages are only a fallback when no last amount exists', () => {
  assert.equal(resolveRememberedAmount({averageAmountUSD: 20}, null, 1), 20);
  assert.equal(resolveRememberedAmount({averageAmountUSD: 20, lastAmountUSD: 30}, null, 1), 30);
});
test('sampling retains accounting average separately from the next default', () => {
  assert.deepEqual(recordAmountSample({}, 30, {totalAmountUSD:30,sampleCount:2}), {lastAmountUSD:30,averageAmountUSD:20,amountSampleCount:3});
});

test('confirmed local amount survives relaunch and exchange-rate refresh', () => {
  const interaction = JSON.parse(JSON.stringify({
    ...recordAmountSample({}, 6 / 0.853304, null, { currency: 'EUR', localAmount: 6 }),
    lastSavedAt: 400,
  }));
  const history = buildDecisionAmountStats([event(interaction.lastAmountUSD, 401)]).coffee;
  assert.equal(resolveRememberedAmount(interaction, history, 5, { currency: 'EUR', rate: 0.9 }) * 0.9, 6);
  assert.equal(resolveRememberedAmount(interaction, history, 5, { currency: 'USD', rate: 1 }), interaction.lastAmountUSD);
  assert.equal(resolveRememberedAmount(interaction, buildDecisionAmountStats([event(10, 500)]).coffee, 5, { currency: 'EUR', rate: 0.9 }), 10);
  const next = { ...interaction, ...recordAmountSample(interaction, 8) };
  assert.equal(resolveRememberedAmount(next, null, 5, { currency: 'EUR', rate: 0.9 }), 8);
});

function autosaveAPI() {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const { parse } = require('@babel/parser');
  const app = fs.readFileSync(require.resolve('../../App.js'), 'utf8');
  const names = ['convertToCurrency', 'convertFromCurrency', 'getCurrencyPrecision', 'getCurrencyFineStep', 'roundCurrencyValue', 'getTemptationPrice', 'getTemptationPricePrecision', 'resolveAutosaveCardAmountUSD'];
  const declarations = parse(app, { sourceType: 'module', plugins: ['jsx'] }).program.body
    .filter(node => node.type === 'VariableDeclaration' && names.includes(node.declarations[0].id.name))
    .map(node => app.slice(node.start, node.end)).join('\n');
  const economy = fs.readFileSync(require.resolve('../../src/constants/economyConfig.js'), 'utf8').replace(/export /g, '');
  return vm.runInNewContext(`${economy}\n${declarations}\n({ resolveAutosaveCardAmountUSD, CURRENCY_RATES, CURRENCY_FINE_STEPS, getCurrencyPrecision })`, { resolveRememberedAmount });
}

test('autosave suggestions use round local amounts for every selectable currency', () => {
  const api = autosaveAPI();
  for (const [currency, rate] of Object.entries(api.CURRENCY_RATES)) {
    for (const amount of [5.02, 13.11, 1234.56]) {
      const step = Math.max(1, api.CURRENCY_FINE_STEPS[currency]);
      const expected = Math.max(1, Math.round(amount / step) * step);
      const result = api.resolveAutosaveCardAmountUSD({ priceUSD: amount / rate }, null, null, undefined, currency) * rate;
      assert.ok(Math.abs(result - expected) < 1e-8, `${currency}: ${result} vs ${expected}`);
    }
    if (api.getCurrencyPrecision(currency) === 2) {
      const small = api.resolveAutosaveCardAmountUSD({ priceUSD: 0.12 / rate }, null, null, undefined, currency) * rate;
      assert.ok(Math.abs(small - 0.12) < 1e-8, currency);
    }
  }
});

test('autosave preserves chosen prices, cents and the confirmed 5 to 6 adjustment', () => {
  const api = autosaveAPI();
  for (const [currency, rate] of Object.entries(api.CURRENCY_RATES)) {
    const card = { priceUSD: 5 / rate };
    const interaction = { ...recordAmountSample({}, 6 / rate, null, { currency, localAmount: 6 }), lastSpentAt: 300 };
    const history = buildDecisionAmountStats([event(5 / rate, 100), event(6 / rate, 301)]).coffee;
    const remembered = api.resolveAutosaveCardAmountUSD(card, JSON.parse(JSON.stringify(interaction)), history, undefined, currency) * rate;
    assert.ok(Math.abs(remembered - 6) < 1e-8, currency);
    assert.equal(api.resolveAutosaveCardAmountUSD({ priceUSD: 13.11 / rate, pricePrecision: 2 }, null, null, undefined, currency), 13.11 / rate);
    assert.equal(api.resolveAutosaveCardAmountUSD(card, null, null, 5.25 / rate, currency), 5.25 / rate);
  }
});
