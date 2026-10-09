// Cache only this feature's entitlement window; never control attribution or purchases.
export function expensePremiumUntil(state, now = Date.now()) {
  if (!state?.isPremium) return 0;
  const entitlement = state.entitlement;
  const expiration = entitlement?.expirationDate || entitlement?.expiration_date || entitlement?.expiresDate || entitlement?.expires_date;
  if (expiration) {
    const timestamp = typeof expiration === "number" ? expiration : Date.parse(expiration);
    return Number.isFinite(timestamp) && timestamp > now ? timestamp : 0;
  }
  const product = entitlement?.productIdentifier || entitlement?.productId || entitlement?.product_id || "";
  if (String(product).includes("lifetime")) return 8640000000000000;
  // Some store responses omit an expiry. Require resolved store access for a bounded lease.
  return state.enabled && !state.customerInfoErrorReason ? now + 86400000 : 0;
}
