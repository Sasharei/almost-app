import { google } from "googleapis";
import { config } from "../config.js";

let androidPublisher = null;

const getGoogleValidationMissingConfig = () => {
  const missing = [];
  if (!String(config.google.packageName || "").trim()) {
    missing.push("GOOGLE_PACKAGE_NAME");
  }
  if (!config.google.serviceAccountJson) {
    missing.push("GOOGLE_SERVICE_ACCOUNT_JSON");
  }
  return missing;
};

const getAndroidPublisher = async () => {
  if (androidPublisher) return androidPublisher;
  if (!config.google.serviceAccountJson) {
    throw new Error("missing_google_service_account_json");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: config.google.serviceAccountJson,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  androidPublisher = google.androidpublisher({
    version: "v3",
    auth,
  });
  return androidPublisher;
};

const toIsoOrNull = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return new Date(parsed).toISOString();
};

const parseSubscriptionResult = (data = {}, fallbackToken = "") => {
  const lineItems = Array.isArray(data?.lineItems) ? data.lineItems : [];
  const latestLineItem = lineItems[0] || null;
  const expiryTime = latestLineItem?.expiryTime
    ? new Date(latestLineItem.expiryTime).toISOString()
    : null;
  const subscriptionState = data?.subscriptionState || "";
  const isActive = subscriptionState === "SUBSCRIPTION_STATE_ACTIVE";
  return {
    ok: true,
    trusted: true,
    platform: "android",
    productId: latestLineItem?.productId || null,
    transactionId: data?.latestOrderId || fallbackToken || null,
    originalTransactionId: data?.externalAccountIdentifiers?.obfuscatedExternalAccountId || null,
    isSubscription: true,
    expiresDate: expiryTime,
    revocationDate: null,
    isActive,
    raw: {
      subscriptionState,
      linkedPurchaseToken: data?.linkedPurchaseToken || null,
    },
  };
};

const parseInappResult = (data = {}, fallbackProductId = "", fallbackToken = "") => {
  const purchaseState = Number(data?.purchaseState);
  const consumedState = Number(data?.consumptionState);
  const isActive = purchaseState === 0 || consumedState === 0;
  return {
    ok: true,
    trusted: true,
    platform: "android",
    productId: data?.productId || fallbackProductId || null,
    transactionId: data?.orderId || fallbackToken || null,
    originalTransactionId: data?.obfuscatedExternalAccountId || null,
    isSubscription: false,
    expiresDate: null,
    revocationDate: data?.purchaseState === 1 ? toIsoOrNull(data?.purchaseTimeMillis) : null,
    isActive,
    raw: {
      purchaseState,
      consumptionState: consumedState,
      acknowledged: Number(data?.acknowledgementState) === 1,
    },
  };
};

export const validateGooglePurchase = async ({ purchaseToken, productId }) => {
  if (!config.google.enabled) {
    return {
      ok: false,
      trusted: false,
      reason: "google_validation_disabled",
    };
  }
  const missingConfig = getGoogleValidationMissingConfig();
  if (missingConfig.length) {
    return {
      ok: false,
      trusted: false,
      reason: "google_config_incomplete",
      missing: missingConfig,
    };
  }
  if (!purchaseToken) {
    return {
      ok: false,
      trusted: false,
      reason: "missing_purchase_token",
    };
  }

  try {
    const publisher = await getAndroidPublisher();

    try {
      const subscriptionResponse = await publisher.purchases.subscriptionsv2.get({
        packageName: config.google.packageName,
        token: purchaseToken,
      });
      const data = subscriptionResponse?.data || null;
      if (data) {
        return parseSubscriptionResult(data, purchaseToken);
      }
    } catch (subscriptionError) {
      // Fallback to one-time product flow.
    }

    if (!productId) {
      return {
        ok: false,
        trusted: false,
        reason: "missing_product_id_for_inapp_validation",
      };
    }

    const inappResponse = await publisher.purchases.products.get({
      packageName: config.google.packageName,
      productId,
      token: purchaseToken,
    });
    const data = inappResponse?.data || null;
    if (!data) {
      return {
        ok: false,
        trusted: false,
        reason: "google_empty_purchase_data",
      };
    }
    return parseInappResult(data, productId, purchaseToken);
  } catch (error) {
    return {
      ok: false,
      trusted: false,
      reason: "google_validation_failed",
      error: error?.message || "unknown_error",
    };
  }
};
