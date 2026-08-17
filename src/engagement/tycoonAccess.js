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

const retireLegacyTycoonRewards = (entries = [], timestamp = Date.now()) => {
  const retiredAt = Math.max(0, Number(timestamp) || Date.now());
  let changed = false;
  const nextEntries = (Array.isArray(entries) ? entries : []).map((entry) => {
    if (entry?.status !== "saved" || entry.rewardClaimed === true) return entry;
    changed = true;
    return {
      ...entry,
      rewardClaimed: true,
      rewardRetiredAt: retiredAt,
      rewardRoute: "temptation_series",
    };
  });
  return changed ? nextEntries : entries;
};

const skipPendingTycoonAutosaveForCards = (
  entries = [],
  cardIds = [],
  timestamp = Date.now()
) => {
  const normalizeCardId = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value !== "string") return "";
    return value.trim();
  };
  const targetCardIds = new Set(
    (Array.isArray(cardIds) ? cardIds : [cardIds])
      .map(normalizeCardId)
      .filter(Boolean)
  );
  if (!targetCardIds.size) return entries;

  const skippedAt = Math.max(0, Number(timestamp) || Date.now());
  let changed = false;
  const nextEntries = (Array.isArray(entries) ? entries : []).map((entry) => {
    const cardId = normalizeCardId(entry?.cardId);
    if (
      entry?.status !== "pending" ||
      entry?.source !== "autosave" ||
      !cardId ||
      !targetCardIds.has(cardId)
    ) {
      return entry;
    }
    changed = true;
    return {
      ...entry,
      status: "skipped",
      skippedAt,
      skipReason: "manual_interaction",
      rewardClaimed: true,
    };
  });
  return changed ? nextEntries : entries;
};

module.exports = {
  TYCOON_SETTINGS_VERSION,
  isTycoonAutosaveEnabled,
  normalizeTycoonSettings,
  retireLegacyTycoonRewards,
  resetLegacyTycoonPendingEvents,
  skipPendingTycoonAutosaveForCards,
  shouldResetLegacyTycoonPendingEvents,
};
