const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const {
  TEMPTATION_SERIES_STATUS,
  applyTemptationSeriesAction,
  claimTemptationSeries,
  createInitialTemptationSeriesState,
  getLocalDayKey,
  getTemptationSeriesDisplayProgress,
  getTemptationSeriesProgress,
  getUncreditedTemptationSeriesCoins,
  normalizeTemptationSeriesState,
  reconcileTemptationSeriesTargets,
  repairPrematureTemptationSeriesClaim,
} = require("../../src/engagement/temptationSeries");

const DAY_ONE = new Date(2026, 7, 14, 9, 0, 0).getTime();
const DAY_TWO = new Date(2026, 7, 15, 9, 0, 0).getTime();

const buildPrematureClaim = () => {
  let state = null;
  for (const temptationId of ["coffee", "snack", "dessert"]) {
    state = applyTemptationSeriesAction(state, {
      availableIds: ["coffee", "snack", "dessert"], temptationId,
      action: "save", rewardCoins: 4, timestamp: DAY_ONE,
    }).state;
  }
  return claimTemptationSeries(state, DAY_ONE + 1_000).state;
};

test("the actual app recovery waits for hydration and persists one debit with the reopened series", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../App.js"), "utf8");
  const start = source.indexOf("  useEffect(() => {\n    if (!temptationSeriesHydrated || !temptationInteractionsHydrated || !historyHydrated) return;");
  const end = source.indexOf("  const registerTemptationSeriesAction", start);
  assert.ok(start >= 0 && end > start);
  const storage = new Map();
  const claimed = buildPrematureClaim();
  const ids = [...claimed.targetIds, "delivery", "games", "taxi", "shopping", "subscription"];
  const keys = { TEMPTATION_SERIES: "series", HEALTH: "wallet", HEALTH_BACKUP: "backup" };
  const gates = ["temptationSeriesHydrated", "temptationInteractionsHydrated", "historyHydrated",
    "healthHydrated", "quickTemptationsHydrated", "hiddenTemptationsHydrated", "archivedTemptationsHydrated"];
  const context = {
    ...Object.fromEntries(gates.map(key => [key, true])),
    normalizeTemptationSeriesState, repairPrematureTemptationSeriesClaim, reconcileTemptationSeriesTargets,
    products: ids.map(id => ({ id })), resolveTemptationTemplateId: item => item.id,
    temptationSeriesRef: { current: claimed }, healthPoints: 50,
    todayTemptationPlan: { dayKey: getLocalDayKey(DAY_ONE), targetIds: ids, resolutions: {} },
    todayTemptationMinuteTick: DAY_ONE + 2_000,
    STORAGE_KEYS: keys, serializeCoinBalanceBackup: value => JSON.stringify({ balance: value }),
    temptationSeriesReadyPresentedRef: { current: claimed.seriesId }, modalVisible: true,
    useEffect: callback => callback(),
    queuePersist: (key, value) => storage.set(key, value),
    updateTemptationSeries: state => {
      context.temptationSeriesRef.current = normalizeTemptationSeriesState(state);
      storage.set(keys.TEMPTATION_SERIES, JSON.stringify(state));
    },
    setHealthPoints: updater => { context.healthPoints = updater(context.healthPoints); },
    setTemptationSeriesModalVisible: value => { context.modalVisible = value; },
  };
  for (const gate of gates) {
    context[gate] = false;
    vm.runInNewContext(source.slice(start, end), context);
    assert.equal(storage.size, 0);
    assert.equal(context.healthPoints, 50);
    context[gate] = true;
  }
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(context.healthPoints, 38);
  assert.equal(storage.get(keys.HEALTH), "38");
  assert.equal(JSON.parse(storage.get(keys.HEALTH_BACKUP)).balance, 38);
  assert.equal(context.modalVisible, false);
  assert.equal(context.temptationSeriesReadyPresentedRef.current, null);
  const persisted = normalizeTemptationSeriesState(JSON.parse(storage.get(keys.TEMPTATION_SERIES)));
  assert.equal(persisted.deferredCoins, 12);
  assert.equal(getUncreditedTemptationSeriesCoins(persisted), 0);
  context.temptationSeriesRef.current = persisted;
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(context.healthPoints, 38);
});

test("a premature collected chest is withheld once, survives restart and is repaid only at real completion", () => {
  const claimed = buildPrematureClaim();
  const ids = [...claimed.targetIds, "delivery", "games", "taxi", "shopping", "subscription"];
  const options = { targetIds: ids, eligibleIds: ids, timestamp: DAY_ONE + 2_000 };
  const repair = repairPrematureTemptationSeriesClaim(claimed, options, 50);
  assert.equal(repair.repaired, true);
  assert.equal(repair.debitCoins, 12);
  assert.deepEqual(getTemptationSeriesProgress(repair.state), { completed: 3, total: 8, remaining: 5 });
  assert.equal(repair.state.status, TEMPTATION_SERIES_STATUS.ACTIVE);
  assert.equal(repair.state.claimedCoins, 0);
  assert.equal(repair.state.claimedAt, null);
  assert.equal(repair.state.completedAt, null);
  assert.equal(repair.state.deferredCoins, 12);
  assert.equal(claimTemptationSeries(repair.state, DAY_ONE + 3_000).payoutCoins, 0);

  let restored = normalizeTemptationSeriesState(JSON.parse(JSON.stringify(repair.state)));
  assert.equal(getUncreditedTemptationSeriesCoins(restored), 0);
  assert.equal(repairPrematureTemptationSeriesClaim(restored, options, 38).debitCoins, 0);
  let balance = 50 - repair.debitCoins;
  ids.slice(3).forEach((temptationId, index) => {
    const action = applyTemptationSeriesAction(restored, {
      availableIds: ids, temptationId, action: "save", rewardCoins: 2,
      timestamp: DAY_ONE + 4_000 + index * 1_000,
    });
    restored = action.state;
    balance += action.creditCoins;
    assert.equal(getUncreditedTemptationSeriesCoins(restored), 0);
    assert.equal(action.becameReady, index === 4);
  });
  const finalClaim = claimTemptationSeries(restored, DAY_ONE + 10_000);
  assert.equal(finalClaim.claimed, true);
  assert.equal(finalClaim.payoutCoins, 12);
  assert.equal(finalClaim.state.deferredCoins, 0);
  assert.equal(balance + finalClaim.payoutCoins, 60);
  assert.equal(claimTemptationSeries(finalClaim.state, DAY_ONE + 11_000).payoutCoins, 0);
  assert.equal(repairPrematureTemptationSeriesClaim(finalClaim.state, options, 60).repaired, false);
});

test("repair preserves valid claims, waits for the catalog, and never reopens yesterday", () => {
  const claimed = buildPrematureClaim();
  const timestamp = DAY_ONE + 2_000;
  assert.equal(repairPrematureTemptationSeriesClaim(claimed, {
    targetIds: claimed.targetIds, eligibleIds: claimed.targetIds, timestamp,
  }, 50).repaired, false);
  assert.equal(repairPrematureTemptationSeriesClaim(claimed, {
    targetIds: [...claimed.targetIds, "delivery"], timestamp,
  }, 50).repaired, false);
  const yesterday = repairPrematureTemptationSeriesClaim(claimed, {
    targetIds: ["delivery"], eligibleIds: ["delivery"], timestamp: DAY_TWO,
  }, 50);
  assert.equal(yesterday.debitCoins, 0);
  assert.equal(yesterday.repaired, false);
  assert.equal(yesterday.state.status, TEMPTATION_SERIES_STATUS.IDLE);
});

test("a spent chest never makes the wallet negative or repays more than was reclaimed", () => {
  const claimed = buildPrematureClaim();
  const ids = [...claimed.targetIds, "delivery"];
  const options = { targetIds: ids, eligibleIds: ids, timestamp: DAY_ONE + 2_000 };
  for (const balance of [0, 5]) {
    const repair = repairPrematureTemptationSeriesClaim(claimed, options, balance);
    assert.equal(repair.debitCoins, balance);
    assert.equal(repair.state.deferredCoins, balance);
    const complete = applyTemptationSeriesAction(repair.state, {
      availableIds: ids, temptationId: "delivery", action: "skip", timestamp: DAY_ONE + 3_000,
    });
    assert.equal(claimTemptationSeries(complete.state, DAY_ONE + 4_000).payoutCoins, balance);
  }
});

test("repair restores decisions logged after a premature claim without counting them twice", () => {
  const claimed = buildPrematureClaim();
  const ids = [...claimed.targetIds, "delivery", "games"];
  const timestamp = DAY_ONE + 2_000;
  const repair = repairPrematureTemptationSeriesClaim(claimed, {
    targetIds: ids, eligibleIds: ids, timestamp,
    historyResolutions: { delivery: {
      firstAction: "spend", lastAction: "spend", firstAt: timestamp, lastAt: timestamp, actionCount: 1,
    } },
  }, 50);
  assert.deepEqual(getTemptationSeriesProgress(repair.state), { completed: 4, total: 5, remaining: 1 });
  assert.equal(repair.debitCoins, 12);
});

test("rescheduling cannot close an eight-card series with five unchecked cards", () => {
  const ids = Array.from({ length: 8 }, (_, index) => `card-${index}`);
  let state = null;
  ids.slice(0, 3).forEach((temptationId, index) => {
    state = applyTemptationSeriesAction(state, {
      availableIds: ids, temptationId, action: "save", rewardCoins: 4,
      timestamp: DAY_ONE + index * 1_000,
    }).state;
  });
  // A schedule refresh must not discard the unresolved snapshot, even when
  // the new calendar plan only includes today's three recorded decisions.
  let refreshed = reconcileTemptationSeriesTargets(state, {
    targetIds: ids.slice(0, 3), eligibleIds: ids, timestamp: DAY_ONE + 4_000,
  });
  assert.deepEqual(getTemptationSeriesProgress(refreshed), { completed: 3, total: 8, remaining: 5 });
  assert.equal(refreshed.status, TEMPTATION_SERIES_STATUS.ACTIVE);
  assert.equal(refreshed.completedAt, null);
  assert.deepEqual(refreshed.resolutions, state.resolutions);
  assert.equal(refreshed.pendingCoins, 12);
  assert.equal(refreshed.creditedCoins, 12);
  assert.equal(claimTemptationSeries(refreshed, DAY_ONE + 5_000).claimed, false);

  let lastResult;
  ids.slice(3).forEach((temptationId, index) => {
    lastResult = applyTemptationSeriesAction(refreshed, {
      availableIds: ids, temptationId, action: "skip", timestamp: DAY_ONE + 6_000 + index * 1_000,
    });
    refreshed = lastResult.state;
    assert.equal(lastResult.becameReady, index === 4);
  });
  assert.equal(claimTemptationSeries(lastResult.state, DAY_ONE + 12_000).claimed, true);
});

test("newly due cards join the checklist before a decision can complete it", () => {
  let state = null;
  for (const temptationId of ["coffee", "snack"]) {
    state = applyTemptationSeriesAction(state, {
      availableIds: ["coffee", "snack", "dessert"], temptationId,
      action: "skip", timestamp: DAY_ONE,
    }).state;
  }
  const result = applyTemptationSeriesAction(state, {
    availableIds: ["coffee", "snack", "dessert", "delivery"],
    temptationId: "dessert", action: "skip", timestamp: DAY_ONE + 1_000,
  });
  assert.equal(result.becameReady, false);
  assert.equal(result.state.status, TEMPTATION_SERIES_STATUS.ACTIVE);
  assert.deepEqual(getTemptationSeriesProgress(result.state), { completed: 3, total: 4, remaining: 1 });
});

test("idle series exposes its pre-action progress without starting persisted state", () => {
  const idleState = createInitialTemptationSeriesState();
  const progress = getTemptationSeriesDisplayProgress(idleState, {
    targetIds: ["coffee", "delivery"],
    resolutions: {},
  });

  assert.deepEqual(progress, {
    completed: 0,
    total: 3,
    remaining: 3,
  });
  assert.equal(idleState.status, TEMPTATION_SERIES_STATUS.IDLE);
  assert.equal(idleState.seriesId, null);
});

test("pre-action progress uses all temptations already due today", () => {
  const progress = getTemptationSeriesDisplayProgress(null, {
    targetIds: ["coffee", "delivery", "games", "shopping"],
    resolutions: {},
  });

  assert.deepEqual(progress, {
    completed: 0,
    total: 4,
    remaining: 4,
  });
});

test("first action starts a stable series snapshot and credits its reward immediately", () => {
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
  assert.equal(result.state.creditedCoins, 7);
  assert.equal(result.rewardMode, "direct");
  assert.equal(result.creditCoins, 7);
  assert.equal(getUncreditedTemptationSeriesCoins(result.state), 0);
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
  assert.equal(repeated.state.creditedCoins, 8);
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
  assert.equal(nextDay.state.creditedCoins, 3);
  assert.deepEqual(Object.keys(nextDay.state.resolutions), ["delivery"]);
  assert.deepEqual(getTemptationSeriesProgress(nextDay.state), {
    completed: 1,
    total: 3,
    remaining: 2,
  });
});

test("midnight reconciliation clears yesterday's visuals without losing credited coins", () => {
  const yesterday = applyTemptationSeriesAction(null, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 5,
    timestamp: DAY_ONE,
  }).state;
  assert.equal(getUncreditedTemptationSeriesCoins(yesterday), 0);
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

test("claim never pays already credited rewards twice", () => {
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

  assert.equal(claimed.payoutCoins, 0);
  assert.equal(claimed.state.claimedCoins, 9);
  assert.equal(duplicateClaim.payoutCoins, 0);
  assert.equal(laterAction.rewardMode, "direct");
  assert.equal(laterAction.creditCoins, 9);
  assert.equal(laterAction.state.claimedCoins, 18);
  assert.equal(laterAction.state.postClaimActionCount, 1);
});

test("a save after the series is ready joins that chest instead of opening a separate reward", () => {
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
  const autosaveLikeAction = applyTemptationSeriesAction(ready.state, {
    availableIds: ["coffee", "delivery", "games"],
    temptationId: "coffee",
    action: "save",
    rewardCoins: 7,
    timestamp: DAY_ONE + 3_000,
  });

  assert.equal(autosaveLikeAction.state.status, TEMPTATION_SERIES_STATUS.READY);
  assert.equal(autosaveLikeAction.rewardMode, "direct");
  assert.equal(autosaveLikeAction.state.pendingCoins, 12);
  assert.equal(autosaveLikeAction.state.creditedCoins, 12);
  assert.equal(autosaveLikeAction.creditCoins, 7);
  assert.equal(autosaveLikeAction.becameReady, false);
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
  assert.equal(state.creditedCoins, 0);
  assert.equal(state.resolutions.coffee.firstAction, "save");
});

test("legacy pending rewards remain recoverable exactly once", () => {
  const legacyReady = {
    version: 1,
    status: TEMPTATION_SERIES_STATUS.READY,
    dayKey: "2026-08-14",
    seriesId: "legacy-series",
    targetIds: ["coffee", "delivery", "games"],
    resolutions: {
      coffee: {
        firstAction: "save",
        lastAction: "save",
        firstAt: DAY_ONE,
        lastAt: DAY_ONE,
      },
      delivery: {
        firstAction: "skip",
        lastAction: "skip",
        firstAt: DAY_ONE,
        lastAt: DAY_ONE,
      },
      games: {
        firstAction: "skip",
        lastAction: "skip",
        firstAt: DAY_ONE,
        lastAt: DAY_ONE,
      },
    },
    pendingCoins: 9,
  };

  assert.equal(getUncreditedTemptationSeriesCoins(legacyReady), 9);
  const claimed = claimTemptationSeries(legacyReady, DAY_ONE + 5_000);
  assert.equal(claimed.payoutCoins, 9);
  assert.equal(claimed.state.claimedCoins, 9);
  assert.equal(getUncreditedTemptationSeriesCoins(claimed.state), 0);
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


test("reconciliation excludes retired and unrelated IDs without changing earned coins", () => {
  const timestamp = new Date(2026, 9, 1, 12).getTime();
  const dayKey = getLocalDayKey(timestamp);
  const resolution = { firstAction: "save", lastAction: "save", firstAt: timestamp, lastAt: timestamp, actionCount: 1 };
  const state = { ...createInitialTemptationSeriesState(), dayKey, startedAt: timestamp, status: TEMPTATION_SERIES_STATUS.ACTIVE, targetIds: ["coffee", "retired"], resolutions: { retired: resolution }, pendingCoins: 30, creditedCoins: 30 };
  const result = reconcileTemptationSeriesTargets(state, { dayKey, timestamp, targetIds: ["coffee"], eligibleIds: ["coffee"], historyResolutions: { external: resolution } });
  assert.deepEqual(result.targetIds, ["coffee"]);
  assert.equal(result.pendingCoins, 30);
  assert.equal(result.creditedCoins, 30);
});

const { rollbackHistoryDecisionSeries, rollbackHistoryDecisionInteractions } = require("../../src/utils/historyDecisionRollback");
const historyDecision = (id, kind = "refuse_spend", timestamp = DAY_ONE, templateId = "coffee") =>
  ({ id, kind, timestamp, meta: { templateId, amountUSD: 5 } });

test("deleting the final decision restores an unchecked card, its feed position and series progress after restart", () => {
  const { buildTodayTemptationPlan, partitionUnifiedTemptationFeed } = require("../../src/engagement/todayTemptations");
  const products = ["coffee", "delivery", "games"].map(id => ({ id }));
  let state = null;
  const history = products.map((item, index) => historyDecision(item.id, "refuse_spend", DAY_ONE + index * 1000, item.id));
  products.forEach((item, index) => {
    state = applyTemptationSeriesAction(state, { availableIds: products.map(p => p.id), temptationId: item.id,
      action: "save", rewardCoins: 5, timestamp: history[index].timestamp }).state;
  });
  for (const initial of [state, claimTemptationSeries(state, DAY_ONE + 4000).state]) {
    const undone = rollbackHistoryDecisionSeries(initial, history[0], history);
    const persisted = normalizeTemptationSeriesState(JSON.parse(JSON.stringify(undone)));
    const plan = buildTodayTemptationPlan({ products, historyEvents: history.slice(1), activeTargetIds: persisted.targetIds, timestamp: DAY_ONE + 5000 });
    const reconciled = reconcileTemptationSeriesTargets(persisted, { ...plan, historyResolutions: plan.resolutions, eligibleIds: products.map(p => p.id), timestamp: DAY_ONE + 5000 });
    assert.equal(reconciled.status, TEMPTATION_SERIES_STATUS.ACTIVE);
    assert.deepEqual(getTemptationSeriesProgress(reconciled), { completed: 2, total: 3, remaining: 1 });
    assert.equal(reconciled.resolutions.coffee, undefined);
    assert.deepEqual(partitionUnifiedTemptationFeed({ items: products, todayTargetIds: plan.targetIds, resolvedTodayIds: Object.keys(reconciled.resolutions) }).uncheckedToday, [products[0]]);
    const redone = applyTemptationSeriesAction(reconciled, { availableIds: persisted.targetIds, temptationId: "coffee", action: "save", rewardCoins: 5, timestamp: DAY_ONE + 6000 });
    assert.equal(redone.becameReady, true);
    assert.equal(claimTemptationSeries(redone.state, DAY_ONE + 7000).payoutCoins, 0);
  }
});

test("history undo retains other decisions for the same card and handles legacy aliases", () => {
  const first = historyDecision("first");
  const last = historyDecision("last", "spend", DAY_ONE + 1000, "legacy-coffee");
  let state = applyTemptationSeriesAction(null, { availableIds: ["coffee", "delivery", "games"], temptationId: "coffee", action: "save", timestamp: DAY_ONE }).state;
  state = applyTemptationSeriesAction(state, { temptationId: "coffee", action: "spend", timestamp: last.timestamp }).state;
  const result = rollbackHistoryDecisionSeries(state, last, [last, first], ["coffee"]);
  assert.equal(result.resolutions.coffee.firstAction, "save");
  assert.equal(result.resolutions.coffee.lastAction, "save");
  assert.equal(result.resolutions.coffee.actionCount, 1);
  assert.equal(getTemptationSeriesProgress(result).completed, 1);
  assert.equal(rollbackHistoryDecisionSeries(state, { ...last, timestamp: DAY_TWO }, [] ).resolutions.coffee.lastAction, "spend");
});

test("undo preserves independent skips and unrelated cards", () => {
  const entry = historyDecision("save");
  let state = applyTemptationSeriesAction(null, { availableIds: ["coffee", "delivery", "games"], temptationId: "coffee", action: "save", timestamp: DAY_ONE }).state;
  state = applyTemptationSeriesAction(state, { temptationId: "coffee", action: "skip", timestamp: DAY_ONE + 1000 }).state;
  state = applyTemptationSeriesAction(state, { temptationId: "delivery", action: "pause", timestamp: DAY_ONE + 2000 }).state;
  const result = rollbackHistoryDecisionSeries(state, entry, [entry]);
  assert.equal(result.resolutions.coffee.firstAction, "skip");
  assert.equal(result.resolutions.delivery.firstAction, "pause");
});

test("undo restores interaction timestamps without removing configured reminders or lifetime totals", () => {
  const first = historyDecision("first");
  const latest = historyDecision("latest", "spend", DAY_ONE + 1000);
  const stats = { coffee: { lastInteractionAt: latest.timestamp, saveCount: 40, spendCount: 5, frequency: "weekly", nextCheckAt: DAY_TWO }, taxi: { saveCount: 3 } };
  const result = rollbackHistoryDecisionInteractions(stats, latest, [first, latest]);
  assert.equal(result.coffee.lastInteractionAt, first.timestamp);
  assert.equal(result.coffee.lastSavedAt, first.timestamp);
  assert.equal(result.coffee.lastSpentAt, null);
  assert.equal(result.coffee.saveCount, 40);
  assert.equal(result.coffee.nextCheckAt, DAY_TWO);
  assert.equal(result.taxi, stats.taxi);
  assert.equal(rollbackHistoryDecisionInteractions(result, first, [first]).coffee.lastInteractionAt, null);
});

test("the actual history delete handler persists the reopened series and keeps existing accounting wired", () => {
  const { decrementTemptationLifetimeInteractionStats, decrementTemptationLifetimeRefuseStats } = require("../../src/utils/temptationLifetimeStats");
  const source = fs.readFileSync(path.join(__dirname, "../../App.js"), "utf8");
  const start = source.indexOf("  const handleHistoryDelete = useCallback(");
  const end = source.indexOf("\n  useEffect", start);
  const entry = historyDecision("save");
  const storage = new Map();
  let state = applyTemptationSeriesAction(null, { availableIds: ["coffee", "delivery", "games"], temptationId: "coffee", action: "save", timestamp: DAY_ONE }).state;
  let interactions = { coffee: { saveCount: 1, lastSavedAt: DAY_ONE, lastInteractionAt: DAY_ONE, savedAmountUSD: 5 } };
  let refuses = { coffee: { count: 1, totalUSD: 5 } };
  let saved = 5;
  let progressSaved = 5;
  let declines = 1;
  const context = {
    useCallback: callback => callback, bankExpenses: {},
    historyEvents: [entry], rollbackHistoryDecisionSeries, rollbackHistoryDecisionInteractions,
    decrementTemptationLifetimeInteractionStats, decrementTemptationLifetimeRefuseStats,
    TEMPTATION_SERIES_STATUS, temptationSeriesReadyPresentedRef: { current: "ready" },
    resolveTemplateCard: () => ({ id: "coffee" }), resolveTemptationGoalId: () => null,
    applyHistoryGoalDelta: () => {}, setPendingList: () => {}, setWishes: () => {},
    setDeclineCount: updater => { declines = updater(declines); },
    setRefuseStats: updater => { refuses = updater(refuses); },
    setTemptationInteractions: updater => { interactions = updater(interactions); },
    setSavedTotalUSD: updater => { saved = updater(saved); },
    setProgressSavedTotalUSD: updater => { progressSaved = updater(progressSaved); },
    clampSavedBalanceUSD: value => Math.max(0, value), spendReducesSavings: true,
    updateTemptationSeries: updater => {
      state = updater(state);
      storage.set("series", JSON.stringify(state));
      return state;
    },
    setTemptationSeriesModalVisible: () => {},
    AsyncStorage: { setItem: (key, value) => { storage.set(key, value); return Promise.resolve(); } },
    STORAGE_KEYS: { HISTORY: "history" }, setChallengesState: updater => updater({}),
    rebuildChallengeProgressFromHistory: () => ({}),
    setHistoryEvents: updater => { context.historyEvents = updater(context.historyEvents); },
  };
  vm.runInNewContext(source.slice(start, end) + "\nthis.deleteEntry = handleHistoryDelete;", context);
  context.deleteEntry(entry);
  assert.equal(getTemptationSeriesProgress(state).completed, 0);
  assert.equal(JSON.parse(storage.get("series")).resolutions.coffee, undefined);
  assert.deepEqual(JSON.parse(storage.get("history")), []);
  assert.equal(interactions.coffee.lastInteractionAt, null);
  assert.equal(interactions.coffee.saveCount, 0);
  assert.equal(refuses.coffee.count, 0);
  assert.equal(saved, 0);
  assert.equal(progressSaved, 0);
  assert.equal(declines, 0);
  context.deleteEntry(entry);
  assert.equal(declines, 0);
});
