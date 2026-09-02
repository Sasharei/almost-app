const test = require("node:test");
const assert = require("node:assert/strict");

const {
  decrementTemptationLifetimeInteractionStats,
  decrementTemptationLifetimeRefuseStats,
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

test("non-save history deletion leaves lifetime card totals unchanged", () => {
  const refuseStats = { coffee: { count: 12, totalUSD: 60 } };
  const interactionStats = { coffee: { saveCount: 12, spendCount: 2 } };
  const entry = {
    kind: "spend",
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
