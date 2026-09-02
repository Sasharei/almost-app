const normalizeKey = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeCount = (value) => Math.max(0, Math.floor(Number(value) || 0));

const normalizeAmount = (value) => Math.max(0, Number(value) || 0);

const getHistoryEntryTemptationKeys = (entry, extraKeys = []) => {
  const meta = entry?.meta && typeof entry.meta === "object" ? entry.meta : {};
  return Array.from(
    new Set(
      [
        meta.templateId,
        meta.template_id,
        meta.templateID,
        meta.id,
        meta.template,
        ...extraKeys,
      ]
        .map(normalizeKey)
        .filter(Boolean)
    )
  );
};

const reconcileTemptationLifetimeStats = (refuseStats = {}, interactionStats = {}) => {
  const source = refuseStats && typeof refuseStats === "object" ? refuseStats : {};
  const interactions =
    interactionStats && typeof interactionStats === "object" ? interactionStats : {};
  let changed = false;
  const next = { ...source };

  Object.entries(interactions).forEach(([rawKey, interaction]) => {
    const key = normalizeKey(rawKey);
    if (!key || !interaction || typeof interaction !== "object") return;
    const interactionSaveCount = normalizeCount(interaction.saveCount);
    const interactionSavedAmountUSD = normalizeAmount(interaction.savedAmountUSD);
    if (interactionSaveCount <= 0 && interactionSavedAmountUSD <= 0) return;

    const current = source[key] && typeof source[key] === "object" ? source[key] : {};
    const currentCount = normalizeCount(current.count);
    const currentTotalUSD = normalizeAmount(current.totalUSD);
    const nextCount = Math.max(currentCount, interactionSaveCount);
    let nextTotalUSD = Math.max(currentTotalUSD, interactionSavedAmountUSD);

    // Older builds kept the lifetime count in interaction stats but rebuilt the
    // card amount from a 31-day history window. Recover the missing amount once
    // from the latest known per-save amount when no lifetime amount exists yet.
    if (interactionSaveCount > currentCount && interactionSavedAmountUSD <= currentTotalUSD) {
      const fallbackAmountUSD = Math.max(
        normalizeAmount(current.lastSavedAmountUSD),
        normalizeAmount(interaction.lastSavedAmountUSD),
        normalizeAmount(interaction.lastAmountUSD)
      );
      if (fallbackAmountUSD > 0) {
        nextTotalUSD = Math.max(
          nextTotalUSD,
          currentTotalUSD + (interactionSaveCount - currentCount) * fallbackAmountUSD
        );
      }
    }

    const currentLastSavedAmountUSD = normalizeAmount(current.lastSavedAmountUSD);
    const nextLastSavedAmountUSD = Math.max(
      currentLastSavedAmountUSD,
      normalizeAmount(interaction.lastSavedAmountUSD),
      currentLastSavedAmountUSD > 0 ? 0 : normalizeAmount(interaction.lastAmountUSD)
    );
    const currentLastSavedAt = normalizeAmount(current.lastSavedAt);
    const nextLastSavedAt = Math.max(
      currentLastSavedAt,
      normalizeAmount(interaction.lastSavedAt)
    );
    if (
      nextCount === currentCount &&
      nextTotalUSD === currentTotalUSD &&
      nextLastSavedAmountUSD === currentLastSavedAmountUSD &&
      nextLastSavedAt === currentLastSavedAt
    ) {
      return;
    }
    next[key] = {
      ...current,
      count: nextCount,
      totalUSD: nextTotalUSD,
      lastSavedAt: nextLastSavedAt,
      lastSavedAmountUSD: nextLastSavedAmountUSD,
    };
    changed = true;
  });

  return changed ? next : source;
};

const decrementTemptationLifetimeRefuseStats = (refuseStats = {}, entry, extraKeys = []) => {
  if (entry?.kind !== "refuse_spend") return refuseStats;
  const source = refuseStats && typeof refuseStats === "object" ? refuseStats : {};
  const keys = getHistoryEntryTemptationKeys(entry, extraKeys);
  if (!keys.length) return source;
  const removedAmountUSD = normalizeAmount(entry?.meta?.amountUSD);
  const removedAt = normalizeAmount(entry?.timestamp);
  let changed = false;
  const next = { ...source };

  keys.forEach((key) => {
    const current = source[key];
    if (!current || typeof current !== "object") return;
    const currentCount = normalizeCount(current.count);
    if (currentCount <= 0) return;
    const nextCount = currentCount - 1;
    const nextTotalUSD =
      nextCount > 0
        ? Math.max(0, normalizeAmount(current.totalUSD) - removedAmountUSD)
        : 0;
    const deletingLatest = removedAt > 0 && removedAt >= normalizeAmount(current.lastSavedAt);
    next[key] = {
      ...current,
      count: nextCount,
      totalUSD: nextTotalUSD,
      lastSavedAt: deletingLatest ? 0 : normalizeAmount(current.lastSavedAt),
      lastSavedAmountUSD: deletingLatest ? 0 : normalizeAmount(current.lastSavedAmountUSD),
    };
    changed = true;
  });

  return changed ? next : source;
};

const decrementTemptationLifetimeInteractionStats = (
  interactionStats = {},
  entry,
  extraKeys = []
) => {
  if (entry?.kind !== "refuse_spend") return interactionStats;
  const source =
    interactionStats && typeof interactionStats === "object" ? interactionStats : {};
  const keys = getHistoryEntryTemptationKeys(entry, extraKeys);
  if (!keys.length) return source;
  const removedAmountUSD = normalizeAmount(entry?.meta?.amountUSD);
  let changed = false;
  const next = { ...source };

  keys.forEach((key) => {
    const current = source[key];
    if (!current || typeof current !== "object") return;
    const currentCount = normalizeCount(current.saveCount);
    if (currentCount <= 0) return;
    const nextEntry = {
      ...current,
      saveCount: currentCount - 1,
    };
    if (Object.prototype.hasOwnProperty.call(current, "savedAmountUSD")) {
      nextEntry.savedAmountUSD = Math.max(
        0,
        normalizeAmount(current.savedAmountUSD) - removedAmountUSD
      );
    }
    next[key] = nextEntry;
    changed = true;
  });

  return changed ? next : source;
};

module.exports = {
  decrementTemptationLifetimeInteractionStats,
  decrementTemptationLifetimeRefuseStats,
  getHistoryEntryTemptationKeys,
  reconcileTemptationLifetimeStats,
};
