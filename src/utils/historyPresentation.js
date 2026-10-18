const HISTORY_EVENT_BUCKETS = Object.freeze({
  SAVED: "saved",
  SPENT: "spent",
  GOALS: "goals",
  OTHER: "other",
});

const HISTORY_SORT_MODES = Object.freeze({
  NEWEST: "newest",
  OLDEST: "oldest",
  CATEGORY: "category",
});

const HISTORY_SAVED_EVENT_KINDS = new Set([
  "decline",
  "refuse_spend",
  "pending_to_decline",
  "income_savings",
  "budget_savings_deposit",
  "budget_debt_payment",
]);

const HISTORY_GOAL_EVENT_KINDS = new Set([
  "wish_added",
  "wish_progress",
  "wish_completed",
  "wish_removed",
  "goal_started",
  "goal_cancelled",
  "pending_to_wish",
]);

const resolveHistoryEventBucket = (entry) => {
  const kind = typeof entry?.kind === "string" ? entry.kind : "";
  if (kind === "spend") return HISTORY_EVENT_BUCKETS.SPENT;
  if (HISTORY_SAVED_EVENT_KINDS.has(kind)) return HISTORY_EVENT_BUCKETS.SAVED;
  if (HISTORY_GOAL_EVENT_KINDS.has(kind)) return HISTORY_EVENT_BUCKETS.GOALS;
  return HISTORY_EVENT_BUCKETS.OTHER;
};

const isWalletHistoryEntry = (entry) =>
  entry?.kind === "spend" && entry.meta?.source === "apple-pay" &&
  typeof entry.meta.receiptId === "string" && entry.meta.receiptId.length > 0;

const historyExpenseSourceLabel = (entry, t) => {
  if (entry?.kind !== "spend") return "";
  return t(entry.meta?.source === "apple-pay" ? "historySourceApplePay" : "historySourceManual");
};

const resolveHistoryCategoryId = (entry) => {
  const meta = entry?.meta && typeof entry.meta === "object" ? entry.meta : {};
  const rawCategory =
    meta.quickEntryCategoryId || meta.category || meta.impulseCategory || meta.impulseCategoryOverride;
  if (typeof rawCategory !== "string") return null;
  const categoryId = rawCategory.trim();
  return categoryId || null;
};

const filterHistoryEntries = (entries = [], filterMode = "all") => {
  const source = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (!filterMode || filterMode === "all") return source;
  return source.filter((entry) => resolveHistoryEventBucket(entry) === filterMode);
};

const sortHistoryEntries = (entries = [], sortMode = HISTORY_SORT_MODES.NEWEST, getCategoryLabel) => {
  const source = Array.isArray(entries) ? entries.filter(Boolean) : [];
  const normalized = source.map((entry, index) => ({ entry, index }));
  normalized.sort((left, right) => {
    const leftTimestamp = Number(left.entry?.timestamp) || 0;
    const rightTimestamp = Number(right.entry?.timestamp) || 0;
    if (sortMode === HISTORY_SORT_MODES.OLDEST) {
      return leftTimestamp - rightTimestamp || left.index - right.index;
    }
    if (sortMode === HISTORY_SORT_MODES.CATEGORY) {
      const leftLabel = String(getCategoryLabel?.(left.entry) || "");
      const rightLabel = String(getCategoryLabel?.(right.entry) || "");
      const categoryOrder = leftLabel.localeCompare(rightLabel, undefined, { sensitivity: "base" });
      return categoryOrder || rightTimestamp - leftTimestamp || left.index - right.index;
    }
    return rightTimestamp - leftTimestamp || left.index - right.index;
  });
  return normalized.map(({ entry }) => entry);
};

module.exports = {
  HISTORY_EVENT_BUCKETS,
  HISTORY_SORT_MODES,
  filterHistoryEntries,
  resolveHistoryCategoryId,
  resolveHistoryEventBucket,
  sortHistoryEntries,
  historyExpenseSourceLabel,
  isWalletHistoryEntry,
};
