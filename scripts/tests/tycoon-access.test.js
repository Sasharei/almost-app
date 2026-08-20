const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TYCOON_SETTINGS_VERSION,
  expireStalePendingTycoonAutosaves,
  getTycoonAutosaveEventDayKey,
  isTycoonAutosaveEnabled,
  isTycoonAutosaveTimestampInDay,
  normalizeTycoonSettings,
  retireLegacyTycoonRewards,
  resetLegacyTycoonPendingEvents,
  skipPendingTycoonAutosaveForCards,
  summarizeTycoonAutosaveSaveResults,
  shouldResetLegacyTycoonPendingEvents,
} = require("../../src/engagement/tycoonAccess");

test("auto-collect defaults off and legacy default-on settings are reset", () => {
  assert.deepEqual(normalizeTycoonSettings(null), {
    version: TYCOON_SETTINGS_VERSION,
    enabled: false,
  });
  assert.deepEqual(normalizeTycoonSettings({ enabled: true }), {
    version: TYCOON_SETTINGS_VERSION,
    enabled: false,
  });
  assert.equal(shouldResetLegacyTycoonPendingEvents({ enabled: true }), true);
});

test("only a premium user with the current opt-in can run auto-collect", () => {
  const settings = { version: TYCOON_SETTINGS_VERSION, enabled: true };
  assert.equal(isTycoonAutosaveEnabled({ isPremium: true, settings }), true);
  assert.equal(isTycoonAutosaveEnabled({ isPremium: false, settings }), false);
  assert.equal(
    isTycoonAutosaveEnabled({
      isPremium: true,
      settings: { version: TYCOON_SETTINGS_VERSION, enabled: false },
    }),
    false
  );
});

test("premium-gate migration preserves history and archives only stale pending items", () => {
  const entries = [
    { id: "pending", status: "pending", rewardClaimed: false },
    { id: "saved", status: "saved", rewardClaimed: false },
  ];
  const migrated = resetLegacyTycoonPendingEvents(entries, 1234);

  assert.deepEqual(migrated[0], {
    id: "pending",
    status: "skipped",
    rewardClaimed: true,
    skippedAt: 1234,
    skipReason: "premium_gate_migration",
  });
  assert.deepEqual(migrated[1], entries[1]);
});

test("legacy auto-collect rewards are retired because the daily series owns payout", () => {
  const entries = [
    { id: "unclaimed", status: "saved", rewardAmount: 4, rewardClaimed: false },
    { id: "claimed", status: "saved", rewardAmount: 5, rewardClaimed: true },
    { id: "pending", status: "pending", rewardAmount: 0, rewardClaimed: false },
  ];
  const migrated = retireLegacyTycoonRewards(entries, 5678);

  assert.deepEqual(migrated[0], {
    id: "unclaimed",
    status: "saved",
    rewardAmount: 4,
    rewardClaimed: true,
    rewardRetiredAt: 5678,
    rewardRoute: "temptation_series",
  });
  assert.equal(migrated[1], entries[1]);
  assert.equal(migrated[2], entries[2]);
  assert.equal(retireLegacyTycoonRewards(migrated, 9999), migrated);
});

test("a manual card action durably skips only its matching pending auto-collect entries", () => {
  const entries = [
    { id: "target", cardId: "coffee", source: "autosave", status: "pending" },
    { id: "other", cardId: "snacks", source: "autosave", status: "pending" },
    { id: "history", cardId: "coffee", source: "autosave", status: "saved" },
    { id: "manual", cardId: "coffee", source: "manual", status: "pending" },
  ];
  const reconciled = skipPendingTycoonAutosaveForCards(entries, [" coffee "], 6789);

  assert.deepEqual(reconciled[0], {
    id: "target",
    cardId: "coffee",
    source: "autosave",
    status: "skipped",
    skippedAt: 6789,
    skipReason: "manual_interaction",
    rewardClaimed: true,
  });
  assert.equal(reconciled[1], entries[1]);
  assert.equal(reconciled[2], entries[2]);
  assert.equal(reconciled[3], entries[3]);
  assert.equal(skipPendingTycoonAutosaveForCards(entries, ["missing"], 9999), entries);
});

test("auto-collect archives yesterday's pending cards at local day rollover", () => {
  const todayKey = "2026-08-20";
  const rolloverAt = new Date(2026, 7, 20, 0, 0, 1).getTime();
  const entries = [
    {
      id: "today",
      dayKey: todayKey,
      source: "autosave",
      status: "pending",
      rewardClaimed: false,
    },
    {
      id: "yesterday",
      dayKey: "2026-08-19",
      source: "autosave",
      status: "pending",
      rewardClaimed: false,
    },
    {
      id: "resolved",
      dayKey: "2026-08-19",
      source: "autosave",
      status: "saved",
      rewardClaimed: true,
    },
  ];

  const expired = expireStalePendingTycoonAutosaves(entries, todayKey, rolloverAt);

  assert.equal(expired[0], entries[0]);
  assert.deepEqual(expired[1], {
    ...entries[1],
    status: "skipped",
    skippedAt: rolloverAt,
    skipReason: "day_rollover",
    rewardClaimed: true,
  });
  assert.equal(expired[2], entries[2]);
  assert.equal(expireStalePendingTycoonAutosaves(expired, todayKey, rolloverAt), expired);
});

test("auto-collect derives a legacy pending card's day from its timer window", () => {
  const yesterdayWindow = new Date(2026, 7, 19, 21, 30, 0).getTime();
  assert.equal(
    getTycoonAutosaveEventDayKey({ timerWindowEnd: yesterdayWindow }),
    "2026-08-19"
  );
  assert.equal(getTycoonAutosaveEventDayKey({ dayKey: "2026-02-30" }), "");
});

test("auto-collect notifications never carry a pending card across midnight", () => {
  const todayKey = "2026-08-20";
  assert.equal(
    isTycoonAutosaveTimestampInDay(new Date(2026, 7, 20, 23, 59, 59), todayKey),
    true
  );
  assert.equal(
    isTycoonAutosaveTimestampInDay(new Date(2026, 7, 21, 0, 0, 0), todayKey),
    false
  );
});

test("auto-collect save results collapse into one accurate goal summary", () => {
  const summary = summarizeTycoonAutosaveSaveResults([
    {
      committed: true,
      type: "save",
      savedAmountUSD: 12,
      appliedAmountUSD: 12,
      targetGoalId: "goal_trip",
      goalSnapshot: { id: "goal_trip", title: "Trip", savedUSD: 40, targetUSD: 100 },
      coinReward: 2,
      creditedCoinReward: 2,
      saveOverlayPayload: { overlayKey: "first" },
    },
    {
      committed: true,
      type: "save",
      savedAmountUSD: 8,
      appliedAmountUSD: 8,
      targetGoalId: "goal_trip",
      goalSnapshot: { id: "goal_trip", title: "Trip", savedUSD: 40, targetUSD: 100 },
      coinReward: 1,
      creditedCoinReward: 1,
      saveOverlayPayload: { overlayKey: "latest" },
    },
    { committed: false, type: "save", savedAmountUSD: 99 },
  ]);

  assert.equal(summary.savedCount, 2);
  assert.equal(summary.savedAmountUSD, 20);
  assert.equal(summary.coinReward, 3);
  assert.equal(summary.creditedCoinReward, 3);
  assert.deepEqual(summary.singleGoal, {
    goalId: "goal_trip",
    appliedAmountUSD: 20,
    goalSnapshot: { id: "goal_trip", title: "Trip", savedUSD: 40, targetUSD: 100 },
  });
  assert.deepEqual(summary.latestPayload, { overlayKey: "latest" });
});

test("auto-collect summary avoids a misleading goal when savings span goals", () => {
  const summary = summarizeTycoonAutosaveSaveResults([
    {
      committed: true,
      type: "save",
      savedAmountUSD: 5,
      appliedAmountUSD: 5,
      targetGoalId: "goal_one",
    },
    {
      committed: true,
      type: "save",
      savedAmountUSD: 7,
      appliedAmountUSD: 7,
      targetGoalId: "goal_two",
    },
  ]);

  assert.equal(summary.savedAmountUSD, 12);
  assert.equal(summary.singleGoal, null);
});

test("auto-collect summary avoids a goal recap when any saved amount was not applied there", () => {
  const summary = summarizeTycoonAutosaveSaveResults([
    {
      committed: true,
      type: "save",
      savedAmountUSD: 10,
      appliedAmountUSD: 10,
      targetGoalId: "goal_one",
    },
    {
      committed: true,
      type: "save",
      savedAmountUSD: 6,
      appliedAmountUSD: 0,
      targetGoalId: null,
    },
  ]);

  assert.equal(summary.savedAmountUSD, 16);
  assert.equal(summary.singleGoal, null);
});
