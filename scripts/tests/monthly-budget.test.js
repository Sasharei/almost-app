const assert = require("node:assert/strict");
const test = require("node:test");

const {
  calculateBudgetAllocationBalanceUSD,
  calculateBudgetCategoryRemainingUSD,
  resolveBudgetMonthSelection,
} = require("../../src/utils/monthlyBudget");

test("moves a stale monthly-limits selection to the new calendar month", () => {
  assert.equal(
    resolveBudgetMonthSelection({
      selectedMonthKey: "2026-08",
      currentMonthKey: "2026-09",
      previousCurrentMonthKey: "2026-08",
      availableMonthKeys: ["2026-09", "2026-08"],
    }),
    "2026-09"
  );
});

test("keeps an intentional archive selection while the calendar month is unchanged", () => {
  assert.equal(
    resolveBudgetMonthSelection({
      selectedMonthKey: "2026-07",
      currentMonthKey: "2026-09",
      previousCurrentMonthKey: "2026-09",
      availableMonthKeys: ["2026-09", "2026-08", "2026-07"],
    }),
    "2026-07"
  );
});

test("falls back to the current month when a stored selection is unavailable", () => {
  assert.equal(
    resolveBudgetMonthSelection({
      selectedMonthKey: "2025-12",
      currentMonthKey: "2026-09",
      previousCurrentMonthKey: "2026-09",
      availableMonthKeys: ["2026-09", "2026-08"],
    }),
    "2026-09"
  );
});

test("allocation balance reacts to slider changes even when cash remaining is zero", () => {
  assert.equal(
    calculateBudgetAllocationBalanceUSD({
      allocatableIncomeUSD: 1_000,
      allocatedTotalUSD: 900,
    }),
    100
  );
  assert.equal(
    calculateBudgetAllocationBalanceUSD({
      allocatableIncomeUSD: 1_000,
      allocatedTotalUSD: 1_100,
    }),
    -100
  );
});

test("category remaining follows its limit and can show an overrun", () => {
  assert.equal(calculateBudgetCategoryRemainingUSD({ limitUSD: 300, spentUSD: 125 }), 175);
  assert.equal(calculateBudgetCategoryRemainingUSD({ limitUSD: 100, spentUSD: 125 }), -25);
});
