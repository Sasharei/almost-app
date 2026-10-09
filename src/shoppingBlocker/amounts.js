// Keep Shopping Pause money precise even when the rest of the feed uses whole amounts.
export function formatShoppingCycleAmount(amountUSD, status, formatLocalAmount, formatAmount) {
  if (!(status?.goalAmount > 0) || !(status?.goalUSD > 0)) return formatAmount(amountUSD);
  const currency = status.goalCurrency;
  const precision = new Intl.NumberFormat("en-US", { style: "currency", currency })
    .resolvedOptions().maximumFractionDigits;
  return formatLocalAmount(amountUSD * status.goalAmount / status.goalUSD, currency,
    { precisionOverride: precision });
}
