const TYCOON_SETTINGS_VERSION = 2;

const normalizeTycoonSettings = (value = null) => {
  const source = value && typeof value === "object" ? value : {};
  const storedVersion = Math.max(0, Math.floor(Number(source.version) || 0));
  return {
    version: TYCOON_SETTINGS_VERSION,
    enabled:
      storedVersion === TYCOON_SETTINGS_VERSION && source.enabled === true,
  };
};

const isTycoonAutosaveEnabled = ({ isPremium = false, settings = null } = {}) =>
  isPremium === true && normalizeTycoonSettings(settings).enabled === true;

const shouldResetLegacyTycoonPendingEvents = (value = null) => {
  const source = value && typeof value === "object" ? value : {};
  return Math.max(0, Math.floor(Number(source.version) || 0)) !== TYCOON_SETTINGS_VERSION;
};

const resetLegacyTycoonPendingEvents = (entries = [], timestamp = Date.now()) => {
  const skippedAt = Math.max(0, Number(timestamp) || Date.now());
  return (Array.isArray(entries) ? entries : []).map((entry) =>
    entry?.status === "pending"
      ? {
          ...entry,
          status: "skipped",
          skippedAt,
          skipReason: "premium_gate_migration",
          rewardClaimed: true,
        }
      : entry
  );
};

module.exports = {
  TYCOON_SETTINGS_VERSION,
  isTycoonAutosaveEnabled,
  normalizeTycoonSettings,
  resetLegacyTycoonPendingEvents,
  shouldResetLegacyTycoonPendingEvents,
};
