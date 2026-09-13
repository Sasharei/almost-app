import crypto from "node:crypto";
import { config } from "../config.js";

export const baseProductId = value => String(value || "").split(":")[0];
export const isPremiumProduct = value => config.premiumProductIds.includes(baseProductId(value));
const asId = value => typeof value === "string" || typeof value === "number" ? String(value) : "";
const expiresInFuture = value => value === null || (typeof value === "string" && Date.parse(value) > Date.now());

// Read-only ownership proof. Never post receipts, purchases, or attribution events here.
export const verifyRevenueCatOwnership = async ({ appUserId, platform, productId, transactionIds }, fetcher = fetch) => {
  const apiKey = config.revenuecat.apiKey || (platform === "ios" ? config.revenuecat.iosApiKey : config.revenuecat.androidApiKey);
  if (!apiKey) return { ok: false, reason: "ownership_verifier_not_configured", status: 503 };
  try {
    const response = await fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return { ok: false, reason: "ownership_verification_unavailable", status: 503 };
    const { subscriber } = await response.json();
    const expectedStore = platform === "ios" ? "app_store" : "play_store";
    const references = new Set(transactionIds.map(asId).filter(Boolean));
    const candidates = [
      ...Object.entries(subscriber?.subscriptions || {}).map(([product, purchase]) => ({ product, purchase, subscription: true })),
      ...Object.entries(subscriber?.non_subscriptions || {}).flatMap(([product, purchases]) =>
        (Array.isArray(purchases) ? purchases : []).map(purchase => ({ product, purchase, subscription: false }))),
    ];
    const matched = candidates.find(({ product, purchase }) =>
      baseProductId(product) === baseProductId(productId) && purchase?.store === expectedStore &&
      references.has(asId(purchase.store_transaction_id)));
    if (!matched) return { ok: false, reason: "purchase_owner_mismatch", status: 403 };
    const entitlement = subscriber?.entitlements?.[config.revenuecat.entitlementId];
    const active = !!entitlement && baseProductId(entitlement.product_identifier) === baseProductId(productId) &&
      (expiresInFuture(entitlement.expires_date) || Date.parse(entitlement.grace_period_expires_date) > Date.now()) && !matched.purchase.refunded_at;
    const effectiveExpiry = active && Date.parse(entitlement.grace_period_expires_date) > Date.parse(entitlement.expires_date)
      ? entitlement.grace_period_expires_date : matched.purchase.expires_date || null;
    return { ok: true, source: "revenuecat", validation: {
      ok: true, trusted: true, platform, productId: baseProductId(matched.product),
      transactionId: asId(matched.purchase.store_transaction_id), originalTransactionId: null,
      isSubscription: matched.subscription, isActive: active,
      expiresDate: effectiveExpiry,
    } };
  } catch {
    return { ok: false, reason: "ownership_verification_unavailable", status: 503 };
  }
};

export const verifyPurchaseOwner = async (payload, validation) => {
  const references = [validation.transactionId, validation.originalTransactionId];
  const hasRevenueCatKey = config.revenuecat.apiKey || (payload.platform === "ios" ? config.revenuecat.iosApiKey : config.revenuecat.androidApiKey);
  if (hasRevenueCatKey) return verifyRevenueCatOwnership({ ...payload, productId: validation.productId, transactionIds: references });
  const expectedAccountIds = [payload.appUserId];
  if (payload.platform === "android") expectedAccountIds.push(crypto.createHash("sha256").update(payload.appUserId).digest("hex"));
  if (validation.accountId && expectedAccountIds.includes(validation.accountId)) return { ok: true, source: "store_account" };
  return { ok: false, reason: "purchase_owner_unverified", status: 403 };
};
