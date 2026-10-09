// Only committed decisions enter this history. Pending autosaves and forecasts
// live in separate collections and must never earn a shopping pass.
export function eligibleShoppingSavings(history = [], now = Date.now()) {
  const seen = new Set();
  return history.flatMap((entry) => {
    const id = typeof entry?.id === "string" ? entry.id : "";
    const timestamp = Number(entry?.timestamp);
    const amountUSD = Number(entry?.meta?.amountUSD);
    if (!id || seen.has(id) || entry.kind !== "refuse_spend" ||
        entry.meta?.source === "autosave" || entry.meta?.confirmed === false ||
        !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now ||
        !Number.isFinite(amountUSD) || amountUSD <= 0 || amountUSD > 1e9) return [];
    seen.add(id);
    return [{ id, timestamp, amountUSD }];
  });
}

export function parseShoppingGoal(input) {
  const normalized = String(input).trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10))
    .replace(/\u066c/g, "").replace(/\u066b/g, ".").replace(",", ".");
  return /^\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

// Invitation eligibility is broader than earning credit: a committed purchase
// should offer protection too, but must never increase the savings ledger.
export function hasShoppingDecision(history = [], now = Date.now()) {
  return history.some((entry) => {
    const amount = Number(entry?.meta?.amountUSD);
    const timestamp = Number(entry?.timestamp);
    return typeof entry?.id === "string" && entry.id.length > 0 &&
      ["spend", "refuse_spend"].includes(entry.kind) &&
      entry.meta?.source !== "autosave" && entry.meta?.confirmed !== false &&
      Number.isFinite(amount) && amount > 0 && amount <= 1e9 &&
      Number.isFinite(timestamp) && timestamp > 0 && timestamp <= now;
  });
}
