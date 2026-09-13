import { getSeenTransaction, getEntitlementByUser } from "../store/entitlementsStore.js";
import { validateGooglePurchase } from "../validators/google.js";

const normalizeString = (value, maxLength = 500) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
};

const decodeBase64Json = (value = "") => {
  const normalized = normalizeString(value, 200000);
  if (!normalized) return null;
  try {
    const json = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const resolveMappedUserId = ({ transactionId, purchaseToken }) => {
  const transaction = transactionId ? getSeenTransaction(transactionId) : null;
  const token = purchaseToken ? getSeenTransaction(purchaseToken) : null;
  return transaction?.appUserId || token?.appUserId || null;
};

const parseEnvelopePayload = (payload = {}) => {
  if (!payload || typeof payload !== "object") return null;
  if (payload.subscriptionNotification || payload.oneTimeProductNotification || payload.voidedPurchaseNotification) {
    return payload;
  }
  const messageData = payload?.message?.data;
  const decoded = decodeBase64Json(messageData || "");
  if (decoded && typeof decoded === "object") {
    return decoded;
  }
  return null;
};

export const parseGoogleRtdnMessage = async ({ payload }) => {
  const decoded = parseEnvelopePayload(payload || {});
  if (!decoded) {
    return {
      ok: false,
      reason: "invalid_google_rtdn_payload",
    };
  }
  if (decoded.testNotification) {
    return {
      ok: true,
      trusted: true,
      test: true,
      mapped: false,
      appUserId: null,
      productId: null,
      transactionId: null,
      purchaseToken: null,
      originalTransactionId: null,
      expiresDate: null,
      isActive: false,
      eventType: "test_notification",
      raw: decoded,
    };
  }

  const subscription = decoded.subscriptionNotification || null;
  const oneTime = decoded.oneTimeProductNotification || null;
  const voided = decoded.voidedPurchaseNotification || null;
  const purchaseToken =
    normalizeString(subscription?.purchaseToken, 500) ||
    normalizeString(oneTime?.purchaseToken, 500) ||
    normalizeString(voided?.purchaseToken, 500) ||
    null;
  const rememberedOwner = getSeenTransaction(purchaseToken)?.appUserId;
  const productId =
    normalizeString(subscription?.subscriptionId, 200) ||
    normalizeString(oneTime?.sku, 200) ||
    getEntitlementByUser(rememberedOwner)?.productId ||
    null;
  const eventType = subscription
    ? `subscription_${subscription.notificationType ?? "unknown"}`
    : oneTime
    ? `one_time_${oneTime.notificationType ?? "unknown"}`
    : voided
    ? "voided_purchase"
    : "unknown";

  if (!purchaseToken) {
    return {
      ok: false,
      reason: "missing_purchase_token",
      eventType,
    };
  }

  const validation = await validateGooglePurchase({
    purchaseToken,
    productId,
  });

  if (!validation.ok || !validation.trusted) {
    return {
      ok: false,
      reason: validation.reason || "google_validation_failed",
      validation,
      eventType,
    };
  }

  const transactionId =
    normalizeString(validation?.transactionId, 500) ||
    normalizeString(voided?.orderId, 500) ||
    purchaseToken;
  const appUserId = resolveMappedUserId({
    transactionId,
    purchaseToken,
  });

  return {
    ok: true,
    trusted: !!validation?.trusted,
    mapped: !!appUserId,
    appUserId: appUserId || null,
    productId: normalizeString(validation?.productId, 200) || productId,
    transactionId,
    purchaseToken,
    originalTransactionId: normalizeString(validation?.originalTransactionId, 500) || null,
    expiresDate: normalizeString(validation?.expiresDate, 120) || null,
    isActive: !!validation?.isActive,
    eventType,
    raw: {
      rtdn: decoded,
      validation: validation || null,
    },
  };
};
