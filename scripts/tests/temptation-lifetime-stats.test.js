const test = require("node:test");
const assert = require("node:assert/strict");

const {
  decrementTemptationLifetimeInteractionStats,
  decrementTemptationLifetimeRefuseStats,
  reconcileTemptationLifetimeInteractionAmounts,
  reconcileTemptationLifetimeStats,
} = require("../../src/utils/temptationLifetimeStats");

test("lifetime card totals recover from interaction counts beyond the retained history window", () => {
  const result = reconcileTemptationLifetimeStats(
    {
      coffee: {
        count: 4,
        totalUSD: 20,
        lastSavedAt: 100,
        lastSavedAmountUSD: 5,
      },
    },
    {
      coffee: {
        saveCount: 12,
        spendCount: 2,
        lastAmountUSD: 5,
      },
    }
  );

  assert.equal(result.coffee.count, 12);
  assert.equal(result.coffee.totalUSD, 60);
});

test("a shorter retained history never lowers an existing lifetime total", () => {
  const source = {
    coffee: {
      count: 12,
      totalUSD: 60,
      lastSavedAt: 100,
      lastSavedAmountUSD: 5,
    },
  };
  const result = reconcileTemptationLifetimeStats(source, {
    coffee: { saveCount: 4, savedAmountUSD: 20 },
  });

  assert.equal(result, source);
  assert.equal(result.coffee.count, 12);
  assert.equal(result.coffee.totalUSD, 60);
});

test("manual history deletion decrements the matching lifetime count and amount", () => {
  const entry = {
    kind: "refuse_spend",
    timestamp: 200,
    meta: { templateId: "coffee", amountUSD: 5 },
  };
  const refuseStats = decrementTemptationLifetimeRefuseStats(
    {
      coffee: {
        count: 12,
        totalUSD: 60,
        lastSavedAt: 200,
        lastSavedAmountUSD: 5,
      },
    },
    entry
  );
  const interactionStats = decrementTemptationLifetimeInteractionStats(
    {
      coffee: { saveCount: 12, spendCount: 2, savedAmountUSD: 60 },
    },
    entry
  );

  assert.equal(refuseStats.coffee.count, 11);
  assert.equal(refuseStats.coffee.totalUSD, 55);
  assert.equal(interactionStats.coffee.saveCount, 11);
  assert.equal(interactionStats.coffee.savedAmountUSD, 55);
});

test("non-decision history deletion leaves lifetime card totals unchanged", () => {
  const refuseStats = { coffee: { count: 12, totalUSD: 60 } };
  const interactionStats = { coffee: { saveCount: 12, spendCount: 2 } };
  const entry = {
    kind: "pending_added",
    meta: { templateId: "coffee", amountUSD: 5 },
  };

  assert.equal(
    decrementTemptationLifetimeRefuseStats(refuseStats, entry),
    refuseStats
  );
  assert.equal(
    decrementTemptationLifetimeInteractionStats(interactionStats, entry),
    interactionStats
  );
});

test("lifetime spend amount is recovered once from retained per-card history", () => {
  const result = reconcileTemptationLifetimeInteractionAmounts(
    {
      coffee: { spendCount: 4, lastAmountUSD: 5 },
      taxi: { spendCount: 1, lastAmountUSD: 40 },
    },
    [
      { kind: "spend", meta: { templateId: "coffee", amountUSD: 5 } },
      { kind: "spend", meta: { templateId: "coffee", amountUSD: 7 } },
      { kind: "spend", meta: { templateId: "taxi", amountUSD: 40 } },
    ]
  );

  assert.equal(result.coffee.spentAmountUSD, 24);
  assert.equal(result.taxi.spentAmountUSD, 40);
});

test("existing lifetime spend amount never falls with a shorter history window", () => {
  const source = {
    coffee: { spendCount: 12, spentAmountUSD: 90, lastAmountUSD: 5 },
  };
  const result = reconcileTemptationLifetimeInteractionAmounts(source, [
    { kind: "spend", meta: { templateId: "coffee", amountUSD: 5 } },
  ]);

  assert.equal(result, source);
  assert.equal(result.coffee.spentAmountUSD, 90);
});

test("retained spend history seeds a missing per-card interaction record", () => {
  const result = reconcileTemptationLifetimeInteractionAmounts({}, [
    { kind: "spend", meta: { templateId: "coffee", amountUSD: 5 } },
    { kind: "spend", meta: { templateId: "coffee", amountUSD: 7 } },
  ]);

  assert.equal(result.coffee.spendCount, 2);
  assert.equal(result.coffee.spentAmountUSD, 12);
});

test("manual spend history deletion decrements only the matching card lifetime total", () => {
  const result = decrementTemptationLifetimeInteractionStats(
    {
      coffee: { spendCount: 3, spentAmountUSD: 21 },
      taxi: { spendCount: 2, spentAmountUSD: 80 },
    },
    { kind: "spend", meta: { templateId: "coffee", amountUSD: 7 } }
  );

  assert.equal(result.coffee.spendCount, 2);
  assert.equal(result.coffee.spentAmountUSD, 14);
  assert.equal(result.taxi.spendCount, 2);
  assert.equal(result.taxi.spentAmountUSD, 80);
});
