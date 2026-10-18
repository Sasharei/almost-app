const currencyPrecision = (currency) => new Intl.NumberFormat("en-US", { style: "currency", currency })
  .resolvedOptions().maximumFractionDigits;

// Display the USD ledger in the current app currency, independently of the
// currency snapshot used by the native cycle to determine pass eligibility.
export function formatShoppingCycleAmount(amountUSD, currency, toLocalAmount, formatLocalAmount) {
  return formatLocalAmount(toLocalAmount(amountUSD), currency,
    { precisionOverride: currencyPrecision(currency) });
}

export function shoppingGoalInput(status, currency, toLocalAmount) {
  if (!(status?.goalUSD > 0)) return "";
  const amount = toLocalAmount(status.goalUSD);
  return String(Number(amount.toFixed(currencyPrecision(currency))));
}
