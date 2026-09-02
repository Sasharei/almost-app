const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getFreeCustomCardSlotsRemaining,
  selectPlanVisibleTemptations,
} = require("../../src/monetization/temptationCardAccess");

const isCustomCard = (item) => item?.kind === "custom";
const isArchivedCard = (item) => item?.archived === true;

test("a lapsed Premium user keeps only the free number of subscription cards active", () => {
  const subscriptions = Array.from({ length: 8 }, (_, index) => ({
    id: `subscription-${index + 1}`,
    kind: "custom",
    category: "subscriptions",
  }));
  const defaults = Array.from({ length: 5 }, (_, index) => ({
    id: `default-${index + 1}`,
    kind: "default",
  }));
  const storedCards = [...subscriptions, ...defaults];

  const visibleCards = selectPlanVisibleTemptations({
    temptations: storedCards,
    isPremium: false,
    freeFeedLimit: 5,
    freeDefaultLimit: 5,
    isCustomCard,
    isArchivedCard,
  });

  assert.deepEqual(
    visibleCards.map((item) => item.id),
    subscriptions.slice(0, 5).map((item) => item.id)
  );
  assert.equal(storedCards.length, 13);
});

test("free custom cards replace defaults without exceeding the shared feed limit", () => {
  const cards = [
    { id: "subscription-1", kind: "custom" },
    { id: "custom-2", kind: "custom" },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `default-${index + 1}`,
      kind: "default",
    })),
  ];

  const visibleCards = selectPlanVisibleTemptations({
    temptations: cards,
    freeFeedLimit: 5,
    freeDefaultLimit: 5,
    isCustomCard,
    isArchivedCard,
  });

  assert.deepEqual(
    visibleCards.map((item) => item.id),
    ["subscription-1", "custom-2", "default-1", "default-2", "default-3"]
  );
  assert.equal(
    getFreeCustomCardSlotsRemaining({
      cards: visibleCards,
      freeFeedLimit: 5,
      isCustomCard,
    }),
    3
  );
});

test("archived cards remain stored but do not consume active free slots", () => {
  const cards = [
    { id: "archived-subscription", kind: "custom", archived: true },
    { id: "active-subscription", kind: "custom" },
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `default-${index + 1}`,
      kind: "default",
    })),
  ];

  const visibleCards = selectPlanVisibleTemptations({
    temptations: cards,
    freeFeedLimit: 5,
    freeDefaultLimit: 5,
    isCustomCard,
    isArchivedCard,
  });
  const activeCards = visibleCards.filter((item) => !item.archived);

  assert.ok(visibleCards.some((item) => item.id === "archived-subscription"));
  assert.equal(activeCards.length, 5);
  assert.equal(
    getFreeCustomCardSlotsRemaining({
      cards: activeCards,
      freeFeedLimit: 5,
      isCustomCard,
    }),
    4
  );
});

test("restoring Premium reveals every stored card again", () => {
  const subscriptions = Array.from({ length: 8 }, (_, index) => ({
    id: `subscription-${index + 1}`,
    kind: "custom",
  }));
  const defaults = Array.from({ length: 5 }, (_, index) => ({
    id: `default-${index + 1}`,
    kind: "default",
  }));
  const cards = [...subscriptions, ...defaults];

  const visibleCards = selectPlanVisibleTemptations({
    temptations: cards,
    isPremium: true,
    freeFeedLimit: 5,
    defaultFeedLimit: 3,
    freeDefaultLimit: 5,
    isCustomCard,
    isArchivedCard,
  });

  assert.deepEqual(visibleCards, [...subscriptions, ...defaults.slice(0, 3)]);
});
