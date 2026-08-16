const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TYCOON_SETTINGS_VERSION,
  isTycoonAutosaveEnabled,
  normalizeTycoonSettings,
  resetLegacyTycoonPendingEvents,
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
