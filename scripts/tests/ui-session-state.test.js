const assert = require("node:assert/strict");
const test = require("node:test");

const {
  UI_SESSION_HOME_RESET_MS,
  createUiSessionState,
  normalizeUiSessionState,
  shouldResetUiSessionNavigation,
} = require("../../src/utils/uiSessionState");

test("opens home after a cold start or five minutes away", () => {
  assert.equal(shouldResetUiSessionNavigation({ isColdStart: true }), true);
  assert.equal(
    shouldResetUiSessionNavigation({
      backgroundedAt: 1_000,
      resumedAt: 1_000 + UI_SESSION_HOME_RESET_MS - 1,
    }),
    false
  );
  assert.equal(
    shouldResetUiSessionNavigation({
      backgroundedAt: 1_000,
      resumedAt: 1_000 + UI_SESSION_HOME_RESET_MS,
    }),
    true
  );
  assert.equal(
    shouldResetUiSessionNavigation({ backgroundedAt: 0, resumedAt: 999_999 }),
    false
  );
});

test("restores navigation and unfinished profile/card drafts", () => {
  const session = createUiSessionState({
    activeTab: "profile",
    tabHistory: ["feed", "cart"],
    progressHubPane: "progress",
    progressSection: "goals",
    rewardsPane: "rewards",
    heroCarouselIndex: 2,
    profileEditMode: "profile",
    profileDraft: { firstName: "Ada", bio: "unfinished" },
    priceEditor: {
      item: { id: "coffee", title: "Coffee" },
      value: "12.50",
      title: "Morning coffee",
      emoji: "☕️",
      category: "food",
      description: "draft",
      frequency: "daily",
      frequencyCustom: null,
      frequencyReminderHour: 9,
      frequencyReminderMinute: 30,
      frequencyWeeklyDay: 1,
      frequencyMonthlyDay: 1,
      frequencyWeeklyDays: [1, 3],
      frequencyMonthlyDays: [1, 15],
      initialFrequency: "daily",
      scheduleConfigVisible: true,
      isDuplicateCopy: false,
    },
    now: 123,
  });

  const restored = normalizeUiSessionState(JSON.stringify(session));
  assert.equal(restored.activeTab, "profile");
  assert.deepEqual(restored.tabHistory, ["feed", "cart"]);
  assert.equal(restored.navigation.progressSection, "goals");
  assert.equal(restored.navigation.heroCarouselIndex, 2);
  assert.equal(restored.profileEditor.draft.bio, "unfinished");
  assert.equal(restored.priceEditor.item.id, "coffee");
  assert.equal(restored.priceEditor.value, "12.50");
  assert.equal(restored.updatedAt, 123);
});

test("explicitly closed editors are not restored", () => {
  const session = createUiSessionState({
    activeTab: "feed",
    profileEditMode: "none",
    profileDraft: { firstName: "Saved" },
    priceEditor: { item: null, value: "99" },
    showCustomSpend: false,
    newPendingModal: { visible: false, title: "Discarded" },
    newGoalModal: { visible: false, name: "Discarded" },
    goalEditorPrompt: { visible: false, name: "Discarded" },
    now: 456,
  });

  assert.equal(session.profileEditor, null);
  assert.equal(session.priceEditor, null);
  assert.equal(session.quickTemptationEditor, null);
  assert.equal(session.pendingEditor, null);
  assert.equal(session.goalEditor, null);
  assert.equal(session.linkedGoalEditor, null);
});

test("rejects malformed sessions and unsafe navigation values", () => {
  assert.equal(normalizeUiSessionState("not json"), null);
  assert.equal(normalizeUiSessionState({ version: 999 }), null);

  const restored = normalizeUiSessionState({
    version: 1,
    activeTab: "admin",
    tabHistory: ["feed", "admin", "feed", 42],
    navigation: {
      progressHubPane: "unknown",
      progressSection: "unknown",
      rewardsPane: "unknown",
      heroCarouselIndex: -10,
    },
    profileEditor: { mode: "admin", draft: { name: "Ignored" } },
    priceEditor: { item: { missingId: true } },
  });

  assert.equal(restored.activeTab, "feed");
  assert.deepEqual(restored.tabHistory, ["feed"]);
  assert.equal(restored.navigation.progressHubPane, "progress");
  assert.equal(restored.navigation.progressSection, "overview");
  assert.equal(restored.navigation.rewardsPane, "rewards");
  assert.equal(restored.navigation.heroCarouselIndex, 0);
  assert.equal(restored.profileEditor, null);
  assert.equal(restored.priceEditor, null);
});
