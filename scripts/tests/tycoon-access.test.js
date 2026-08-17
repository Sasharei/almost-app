const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TYCOON_SETTINGS_VERSION,
  isTycoonAutosaveEnabled,
  normalizeTycoonSettings,
  retireLegacyTycoonRewards,
  resetLegacyTycoonPendingEvents,
  skipPendingTycoonAutosaveForCards,
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
