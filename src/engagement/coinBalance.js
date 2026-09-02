const COIN_BALANCE_BACKUP_VERSION = 1;
const COIN_BALANCE_INCIDENT_REPAIR_VERSION = 1;
const DEFERRED_COIN_REWARD_INCIDENT_STARTED_AT = Date.parse(
  "2026-08-16T21:04:16+03:00"
);

const normalizeCoinAmount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
};

const normalizeCoinTiers = (tiers = []) =>
  (Array.isArray(tiers) ? tiers : [])
    .filter(
      (tier) =>
        tier &&
        typeof tier.id === "string" &&
        tier.id.trim() &&
        Number.isInteger(Number(tier.value)) &&
        Number(tier.value) > 0
    )
    .map((tier) => ({
      ...tier,
      id: tier.id.trim(),
      value: Math.floor(Number(tier.value)),
    }))
    .sort((left, right) => left.value - right.value);

const getCoinTierForAmount = (amount = 0, tiers = []) => {
  const normalizedAmount = normalizeCoinAmount(amount);
  const normalizedTiers = normalizeCoinTiers(tiers);
  for (let index = normalizedTiers.length - 1; index >= 0; index -= 1) {
    if (normalizedAmount >= normalizedTiers[index].value) {
      return normalizedTiers[index];
    }
  }
  return normalizedTiers[0] || null;
};

const getCoinBreakdown = (amount = 0, tiers = []) => {
  let remaining = normalizeCoinAmount(amount);
  const normalizedTiers = normalizeCoinTiers(tiers);
  return normalizedTiers
    .slice()
    .reverse()
    .reduce((breakdown, tier) => {
      const count = Math.floor(remaining / tier.value);
      breakdown[tier.id] = count;
      remaining -= count * tier.value;
      return breakdown;
    }, {});
};

const buildCoinDenominationEntries = (amount = 0, tiers = []) => {
  const normalizedTiers = normalizeCoinTiers(tiers);
  const breakdown = getCoinBreakdown(amount, normalizedTiers);
  return normalizedTiers
    .slice()
    .reverse()
    .map((tier) => ({
      ...tier,
      count: breakdown[tier.id] || 0,
    }));
};

const getVisibleCoinDenominationEntries = (amount = 0, tiers = []) => {
  const entries = buildCoinDenominationEntries(amount, tiers);
  const visibleEntries = entries.filter((entry) => entry.count > 0);
  if (visibleEntries.length) return visibleEntries;
  const baseTier = entries[entries.length - 1];
  return baseTier ? [{ ...baseTier, count: 0 }] : [];
};

const parseStoredCoinBalance = (value) => {
  if (value === null || typeof value === "undefined") return null;
  const normalized = typeof value === "string" ? value.trim() : value;
  if (normalized === "") return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
};

const parseCoinBalanceBackup = (value) => {
  if (value === null || typeof value === "undefined" || value === "") return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object") return null;
    if (Number(parsed.version) !== COIN_BALANCE_BACKUP_VERSION) return null;
    return parseStoredCoinBalance(parsed.balance);
  } catch (_error) {
    return null;
  }
};

const parseLegacyTamagotchiCoinBalance = (value) => {
  if (value === null || typeof value === "undefined" || value === "") return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parseStoredCoinBalance(parsed?.coins);
  } catch (_error) {
    return null;
  }
};

const serializeCoinBalanceBackup = (value, updatedAt = Date.now()) => {
  const balance = parseStoredCoinBalance(value);
  if (balance === null) return null;
  const normalizedUpdatedAt = Math.max(0, Number(updatedAt) || 0);
  return JSON.stringify({
    version: COIN_BALANCE_BACKUP_VERSION,
    balance,
    updatedAt: normalizedUpdatedAt,
  });
};

const resolveCoinBalance = ({
  primaryRaw = null,
  backupRaw = null,
  fallbackBalance = null,
  recoveredCoins = 0,
} = {}) => {
  const primaryBalance = parseStoredCoinBalance(primaryRaw);
  const backupBalance = parseCoinBalanceBackup(backupRaw);
  const normalizedFallback = parseStoredCoinBalance(fallbackBalance);
  const normalizedRecovery = Math.max(0, Math.floor(Number(recoveredCoins) || 0));
  const source =
    primaryBalance !== null
      ? "primary"
      : backupBalance !== null
      ? "backup"
      : normalizedFallback !== null
      ? "fallback"
      : "empty";
  const storedBalance =
    primaryBalance ?? backupBalance ?? normalizedFallback ?? 0;
  return {
    balance: storedBalance + normalizedRecovery,
    source,
    recoveredCoins: normalizedRecovery,
    needsPrimaryRepair: primaryBalance === null && source !== "empty",
  };
};

const getIncidentHistoryRewardFloor = (
  historyEntries,
  incidentStartedAt = DEFERRED_COIN_REWARD_INCIDENT_STARTED_AT
) => {
  const normalizedStartedAt = Math.max(0, Number(incidentStartedAt) || 0);
  const seen = new Set();
  return (Array.isArray(historyEntries) ? historyEntries : []).reduce((total, entry) => {
    if (!entry || entry.kind !== "refuse_spend") return total;
    const timestamp = Math.max(0, Number(entry.timestamp) || 0);
    if (!timestamp || timestamp < normalizedStartedAt) return total;
    if (entry.meta?.coinCredited === true) return total;
    const reward = Math.max(0, Math.floor(Number(entry.meta?.coinReward) || 0));
    if (!reward) return total;
    const dedupeKey =
      typeof entry.id === "string" && entry.id
        ? entry.id
        : `${timestamp}:${entry.meta?.templateId || entry.meta?.id || "unknown"}`;
    if (seen.has(dedupeKey)) return total;
    seen.add(dedupeKey);
    return total + reward;
  }, 0);
};

const isCoinBalanceIncidentRepairApplied = (value) => {
  if (value === "done") return true;
  if (!value) return false;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return (
      Number(parsed?.version) === COIN_BALANCE_INCIDENT_REPAIR_VERSION &&
      Number(parsed?.appliedAt) > 0
    );
  } catch (_error) {
    return false;
  }
};

const resolveCoinBalanceIncidentRepair = ({
  balance = 0,
  historyRewardFloor = 0,
  alreadyApplied = false,
} = {}) => {
  const normalizedBalance = parseStoredCoinBalance(balance) ?? 0;
  const normalizedFloor = Math.max(0, Math.floor(Number(historyRewardFloor) || 0));
  const restoredCoins = alreadyApplied
    ? 0
    : Math.max(0, normalizedFloor - normalizedBalance);
  return {
    balance: normalizedBalance + restoredCoins,
    restoredCoins,
    historyRewardFloor: normalizedFloor,
  };
};

const serializeCoinBalanceIncidentRepair = (
  { restoredCoins = 0, historyRewardFloor = 0 } = {},
  appliedAt = Date.now()
) =>
  JSON.stringify({
    version: COIN_BALANCE_INCIDENT_REPAIR_VERSION,
    appliedAt: Math.max(1, Number(appliedAt) || Date.now()),
    restoredCoins: Math.max(0, Math.floor(Number(restoredCoins) || 0)),
    historyRewardFloor: Math.max(0, Math.floor(Number(historyRewardFloor) || 0)),
  });

module.exports = {
  COIN_BALANCE_BACKUP_VERSION,
  COIN_BALANCE_INCIDENT_REPAIR_VERSION,
  DEFERRED_COIN_REWARD_INCIDENT_STARTED_AT,
  buildCoinDenominationEntries,
  getCoinBreakdown,
  getCoinTierForAmount,
  getIncidentHistoryRewardFloor,
  getVisibleCoinDenominationEntries,
  isCoinBalanceIncidentRepairApplied,
  normalizeCoinAmount,
  normalizeCoinTiers,
  parseCoinBalanceBackup,
  parseLegacyTamagotchiCoinBalance,
  parseStoredCoinBalance,
  resolveCoinBalance,
  resolveCoinBalanceIncidentRepair,
  serializeCoinBalanceBackup,
  serializeCoinBalanceIncidentRepair,
};
