const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TEMPTATION_SERIES_STATUS,
  applyTemptationSeriesAction,
  claimTemptationSeries,
  createInitialTemptationSeriesState,
  getTemptationSeriesProgress,
  normalizeTemptationSeriesState,
  reconcileTemptationSeriesTargets,
} = require("../../src/engagement/temptationSeries");

const DAY_ONE = new Date(2026, 7, 14, 9, 0, 0).getTime();
const DAY_TWO = new Date(2026, 7, 15, 9, 0, 0).getTime();

test("first action starts a stable series snapshot and deposits its reward", () => {
  const result = applyTemptationSeriesAction(createInitialTemptationSeriesState(), {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 7,
    timestamp: DAY_ONE,
  });

  assert.equal(result.state.status, TEMPTATION_SERIES_STATUS.ACTIVE);
  assert.deepEqual(result.state.targetIds, ["coffee", "delivery", "games"]);
  assert.equal(result.state.pendingCoins, 7);
  assert.equal(result.rewardMode, "pending");
  assert.deepEqual(getTemptationSeriesProgress(result.state), {
    completed: 1,
    total: 3,
    remaining: 2,
  });
});

test("repeated actions reward again without advancing unique progress", () => {
  const first = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "delivery"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 4,
    timestamp: DAY_ONE,
  });
  const repeated = applyTemptationSeriesAction(first.state, {
    availableIds: ["coffee", "delivery"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 4,
    timestamp: DAY_ONE + 1_000,
  });

  assert.equal(repeated.state.pendingCoins, 8);
  assert.equal(repeated.state.resolutions.coffee.actionCount, 2);
  assert.equal(repeated.isFirstResolution, false);
  assert.equal(getTemptationSeriesProgress(repeated.state).completed, 1);
});

test("three distinct non-reward actions complete the checklist without inventing rewards", () => {
  const first = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "coffee",
    action: "skip",
    timestamp: DAY_ONE,
  });
  const second = applyTemptationSeriesAction(first.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "delivery",
    action: "archive",
    timestamp: DAY_ONE + 1_000,
  });
  const completed = applyTemptationSeriesAction(second.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "games",
    action: "pause",
    timestamp: DAY_ONE + 2_000,
  });

  assert.equal(completed.state.status, TEMPTATION_SERIES_STATUS.READY);
  assert.equal(completed.state.pendingCoins, 0);
  assert.equal(completed.becameReady, true);
});

test("an unfinished series resets at local midnight before the next decision", () => {
  const first = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "delivery"],
    temptationId: "coffee",
    action: "spend",
    rewardCoins: 7,
    timestamp: DAY_ONE,
  });
  const nextDay = applyTemptationSeriesAction(first.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "delivery",
    action: "save",
    rewardCoins: 3,
    timestamp: DAY_TWO,
  });

  assert.notEqual(nextDay.state.seriesId, first.state.seriesId);
  assert.deepEqual(nextDay.state.targetIds, ["coffee", "delivery", "games"]);
  assert.equal(nextDay.state.status, TEMPTATION_SERIES_STATUS.ACTIVE);
  assert.equal(nextDay.state.pendingCoins, 3);
  assert.deepEqual(Object.keys(nextDay.state.resolutions), ["delivery"]);
  assert.deepEqual(getTemptationSeriesProgress(nextDay.state), {
    completed: 1,
    total: 3,
    remaining: 2,
  });
});

test("midnight reconciliation clears yesterday's checked rows and unopened chest", () => {
  const yesterday = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 5,
    timestamp: DAY_ONE,
  }).state;
  const reset = reconcileTemptationSeriesTargets(yesterday, {
    dayKey: "2026-08-15",
    targetIds: ["delivery"],
    timestamp: DAY_TWO,
  });

  assert.deepEqual(reset, createInitialTemptationSeriesState());
});

test("a ready chest from yesterday cannot be claimed after midnight", () => {
  const first = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 5,
    timestamp: DAY_ONE,
  });
  const second = applyTemptationSeriesAction(first.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "delivery",
    action: "skip",
    timestamp: DAY_ONE + 1_000,
  });
  const ready = applyTemptationSeriesAction(second.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "games",
    action: "skip",
    timestamp: DAY_ONE + 2_000,
  });
  const expiredClaim = claimTemptationSeries(ready.state, DAY_TWO);

  assert.equal(expiredClaim.claimed, false);
  assert.equal(expiredClaim.payoutCoins, 0);
  assert.deepEqual(expiredClaim.state, createInitialTemptationSeriesState());
});

test("claim pays once and later same-day rewards go directly to balance", () => {
  const first = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 9,
    timestamp: DAY_ONE,
  });
  const second = applyTemptationSeriesAction(first.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "delivery",
    action: "skip",
    timestamp: DAY_ONE + 1_000,
  });
  const ready = applyTemptationSeriesAction(second.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "games",
    action: "archive",
    timestamp: DAY_ONE + 2_000,
  });
  const claimed = claimTemptationSeries(ready.state, DAY_ONE + 3_000);
  const duplicateClaim = claimTemptationSeries(claimed.state, DAY_ONE + 4_000);
  const laterAction = applyTemptationSeriesAction(claimed.state, {
    availableIds: ["coffee"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 9,
    timestamp: DAY_ONE + 5_000,
  });

  assert.equal(claimed.payoutCoins, 9);
  assert.equal(duplicateClaim.payoutCoins, 0);
  assert.equal(laterAction.rewardMode, "direct");
  assert.equal(laterAction.state.claimedCoins, 9);
  assert.equal(laterAction.state.postClaimActionCount, 1);
});

test("the next day starts a fresh series after a previous claim", () => {
  const first = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 2,
    timestamp: DAY_ONE,
  });
  const second = applyTemptationSeriesAction(first.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "delivery",
    action: "skip",
    timestamp: DAY_ONE + 1_000,
  });
  const ready = applyTemptationSeriesAction(second.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "games",
    action: "skip",
    timestamp: DAY_ONE + 2_000,
  });
  const claimed = claimTemptationSeries(ready.state, DAY_ONE + 3_000);
  const nextDay = applyTemptationSeriesAction(claimed.state, {
    availableIds: ["coffee", "delivery"],
    temptationId: "delivery",
    action: "spend",
    timestamp: DAY_TWO,
  });

  assert.notEqual(nextDay.state.seriesId, claimed.state.seriesId);
  assert.equal(nextDay.state.status, TEMPTATION_SERIES_STATUS.ACTIVE);
  assert.equal(nextDay.state.claimedCoins, 0);
  assert.deepEqual(nextDay.state.targetIds, ["coffee", "delivery"]);
});

test("normalization rejects corrupt pending values without losing a valid checklist", () => {
  const state = normalizeTemptationSeriesState({
    status: "active",
    dayKey: "2026-08-14",
    startedAt: DAY_ONE,
    targetIds: ["coffee", "coffee", ""],
    resolutions: {
      coffee: {
        firstAction: "save",
        lastAction: "save",
        firstAt: DAY_ONE,
        lastAt: DAY_ONE,
        actionCount: 1,
      },
    },
    pendingCoins: -50,
  });

  assert.deepEqual(state.targetIds, ["coffee"]);
  assert.equal(state.pendingCoins, 0);
  assert.equal(state.resolutions.coffee.firstAction, "save");
});

test("a legacy all-cards series is narrowed to today's targets without changing its economy", () => {
  const legacy = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "subscription", "games", "delivery"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 5,
    timestamp: DAY_ONE,
  }).state;
  const reconciled = reconcileTemptationSeriesTargets(legacy, {
    dayKey: "2026-08-14",
    targetIds: ["coffee", "delivery"],
    timestamp: DAY_ONE + 2_000,
  });

  assert.deepEqual(reconciled.targetIds, ["coffee", "delivery"]);
  assert.equal(reconciled.pendingCoins, 5);
  assert.equal(reconciled.status, TEMPTATION_SERIES_STATUS.ACTIVE);
  assert.deepEqual(getTemptationSeriesProgress(reconciled), {
    completed: 1,
    total: 3,
    remaining: 2,
  });
});

test("today's history restores a checked target and can complete a reconciled series", () => {
  const active = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "delivery", "subscription"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 3,
    timestamp: DAY_ONE,
  }).state;
  const reconciled = reconcileTemptationSeriesTargets(active, {
    dayKey: "2026-08-14",
    targetIds: ["coffee", "delivery", "games"],
    historyResolutions: {
      delivery: {
        firstAction: "spend",
        lastAction: "spend",
        firstAt: DAY_ONE + 1_000,
        lastAt: DAY_ONE + 1_000,
        actionCount: 1,
      },
      games: {
        firstAction: "skip",
        lastAction: "skip",
        firstAt: DAY_ONE + 1_500,
        lastAt: DAY_ONE + 1_500,
        actionCount: 1,
      },
    },
    timestamp: DAY_ONE + 2_000,
  });

  assert.equal(reconciled.status, TEMPTATION_SERIES_STATUS.READY);
  assert.equal(reconciled.pendingCoins, 3);
  assert.equal(reconciled.resolutions.delivery.firstAction, "spend");
  assert.equal(getTemptationSeriesProgress(reconciled).remaining, 0);
});

test("one-of-one never completes and later distinct actions grow the series to three", () => {
  const first = applyTemptationSeriesAction(null, {
    availableIds: ["coffee"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 2,
    timestamp: DAY_ONE,
  });
  const earlyClaim = claimTemptationSeries(first.state, DAY_ONE + 500);
  const second = applyTemptationSeriesAction(first.state, {
    availableIds: ["coffee"],
    temptationId: "delivery",
    action: "spend",
    timestamp: DAY_ONE + 1_000,
  });
  const third = applyTemptationSeriesAction(second.state, {
    availableIds: ["coffee"],
    temptationId: "games",
    action: "skip",
    timestamp: DAY_ONE + 2_000,
  });

  assert.equal(first.state.status, TEMPTATION_SERIES_STATUS.ACTIVE);
  assert.deepEqual(getTemptationSeriesProgress(first.state), {
    completed: 1,
    total: 3,
    remaining: 2,
  });
  assert.equal(earlyClaim.claimed, false);
  assert.deepEqual(second.state.targetIds, ["coffee", "delivery"]);
  assert.equal(second.state.status, TEMPTATION_SERIES_STATUS.ACTIVE);
  assert.deepEqual(third.state.targetIds, ["coffee", "delivery", "games"]);
  assert.equal(third.state.status, TEMPTATION_SERIES_STATUS.READY);
});
