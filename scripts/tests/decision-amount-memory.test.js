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
