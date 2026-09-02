const normalizeMonthKey = (value) =>
  typeof value === "string" ? value.trim() : "";

const resolveBudgetMonthSelection = ({
  selectedMonthKey = "",
  currentMonthKey = "",
  previousCurrentMonthKey = "",
  availableMonthKeys = [],
} = {}) => {
  const selected = normalizeMonthKey(selectedMonthKey);
  const current = normalizeMonthKey(currentMonthKey);
  const previousCurrent = normalizeMonthKey(previousCurrentMonthKey);
  const available = Array.from(
    new Set(
      (Array.isArray(availableMonthKeys) ? availableMonthKeys : [])
        .map(normalizeMonthKey)
        .filter(Boolean)
    )
  );
  const didCalendarMonthChange =
    !!current && !!previousCurrent && current !== previousCurrent;

  if (didCalendarMonthChange) return current;
  if (selected && available.includes(selected)) return selected;
  if (current && available.includes(current)) return current;
  return available[0] || current || selected;
};

const calculateBudgetAllocationBalanceUSD = ({
  allocatableIncomeUSD = 0,
  allocatedTotalUSD = 0,
} = {}) => {
  const normalizedIncome = Number(allocatableIncomeUSD);
  const normalizedAllocated = Number(allocatedTotalUSD);
  return (
    (Number.isFinite(normalizedIncome) ? Math.max(0, normalizedIncome) : 0) -
    (Number.isFinite(normalizedAllocated) ? Math.max(0, normalizedAllocated) : 0)
  );
};

const calculateBudgetCategoryRemainingUSD = ({ limitUSD = 0, spentUSD = 0 } = {}) => {
  const normalizedLimit = Number(limitUSD);
  const normalizedSpent = Number(spentUSD);
  return (
    (Number.isFinite(normalizedLimit) ? Math.max(0, normalizedLimit) : 0) -
    (Number.isFinite(normalizedSpent) ? Math.max(0, normalizedSpent) : 0)
  );
};

module.exports = {
  calculateBudgetAllocationBalanceUSD,
  calculateBudgetCategoryRemainingUSD,
  resolveBudgetMonthSelection,
};
