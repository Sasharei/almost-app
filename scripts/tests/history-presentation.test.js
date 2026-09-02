const assert = require("node:assert/strict");
const test = require("node:test");

const {
  HISTORY_EVENT_BUCKETS,
  HISTORY_SORT_MODES,
  filterHistoryEntries,
  resolveHistoryCategoryId,
  resolveHistoryEventBucket,
  sortHistoryEntries,
} = require("../../src/utils/historyPresentation");

const entries = [
  { id: "spent", kind: "spend", timestamp: 300, meta: { category: "food" } },
  { id: "goal", kind: "wish_added", timestamp: 200, meta: {} },
  { id: "saved", kind: "refuse_spend", timestamp: 100, meta: { category: "transport" } },
  { id: "other", kind: "reward_claimed", timestamp: 400, meta: {} },
];

test("history entries map to stable user-facing buckets", () => {
  assert.equal(resolveHistoryEventBucket(entries[0]), HISTORY_EVENT_BUCKETS.SPENT);
  assert.equal(resolveHistoryEventBucket(entries[1]), HISTORY_EVENT_BUCKETS.GOALS);
  assert.equal(resolveHistoryEventBucket(entries[2]), HISTORY_EVENT_BUCKETS.SAVED);
  assert.equal(resolveHistoryEventBucket(entries[3]), HISTORY_EVENT_BUCKETS.OTHER);
  assert.equal(resolveHistoryCategoryId(entries[0]), "food");
});

test("history filtering does not mutate the source list", () => {
  const result = filterHistoryEntries(entries, HISTORY_EVENT_BUCKETS.SAVED);
  assert.deepEqual(result.map((entry) => entry.id), ["saved"]);
  assert.deepEqual(entries.map((entry) => entry.id), ["spent", "goal", "saved", "other"]);
});

test("history supports newest, oldest, and category sorting", () => {
  const categoryLabels = {
    spent: "Food",
    goal: "Goals",
    saved: "Transport",
    other: "Other",
  };
  assert.deepEqual(
    sortHistoryEntries(entries, HISTORY_SORT_MODES.NEWEST).map((entry) => entry.id),
    ["other", "spent", "goal", "saved"]
  );
  assert.deepEqual(
    sortHistoryEntries(entries, HISTORY_SORT_MODES.OLDEST).map((entry) => entry.id),
    ["saved", "goal", "spent", "other"]
  );
  assert.deepEqual(
    sortHistoryEntries(entries, HISTORY_SORT_MODES.CATEGORY, (entry) => categoryLabels[entry.id]).map(
      (entry) => entry.id
    ),
    ["spent", "goal", "other", "saved"]
  );
});
