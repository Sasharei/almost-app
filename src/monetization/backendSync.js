const REQUEST_TIMEOUT_MS = 7000;

const withTimeout = async (promise, timeoutMs = REQUEST_TIMEOUT_MS) => {
  let timeout = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error("request_timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeUrl = (url = "") => {
  if (!url || typeof url !== "string") return "";
  return url.replace(/\/$/, "");
};

const getBackendBaseUrl = () => {
  const raw = process.env.EXPO_PUBLIC_MONETIZATION_BACKEND_URL || "";
  return normalizeUrl(raw);
};

const postJSON = async (path, payload) => {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return { ok: false, skipped: true, reason: "backend_url_missing" };
  }
  const sharedSecret = process.env.EXPO_PUBLIC_MONETIZATION_SHARED_SECRET || "";
  const headers = {
    "content-type": "application/json",
  };
  if (sharedSecret) {
    headers["x-app-secret"] = sharedSecret;
  }
  const request = fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload || {}),
  });
  try {
    const response = await withTimeout(request, REQUEST_TIMEOUT_MS);
    const responseBody = await response.text();
    let parsed = null;
    try {
      parsed = responseBody ? JSON.parse(responseBody) : null;
    } catch (error) {
      parsed = null;
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: parsed?.error || "backend_request_failed",
        body: parsed,
      };
    }
    return {
      ok: true,
      status: response.status,
      body: parsed,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "backend_unreachable",
      error,
    };
  }
};

export const syncEntitlementSnapshot = async ({
  appUserId,
  installId,
  platform,
  source,
  entitlement,
  customerInfo,
}) => {
  const snapshot = {
    appUserId: appUserId || null,
    installId: installId || null,
    platform: platform || null,
    source: source || "client",
    entitlement: entitlement
      ? {
          identifier: entitlement.identifier || null,
          isActive: true,
          productIdentifier: entitlement.productIdentifier || null,
          originalPurchaseDate: entitlement.originalPurchaseDate || null,
          latestPurchaseDate: entitlement.latestPurchaseDate || null,
          expirationDate: entitlement.expirationDate || null,
          willRenew: entitlement.willRenew ?? null,
          periodType: entitlement.periodType || null,
          store: entitlement.store || null,
        }
      : {
          identifier: null,
          isActive: false,
          productIdentifier: null,
        },
    customerInfo: customerInfo
      ? {
          originalAppUserId: customerInfo.originalAppUserId || null,
          requestDate: customerInfo.requestDate || null,
          activeSubscriptions: Array.isArray(customerInfo.activeSubscriptions)
            ? customerInfo.activeSubscriptions
            : [],
          allPurchasedProductIdentifiers: Array.isArray(customerInfo.allPurchasedProductIdentifiers)
            ? customerInfo.allPurchasedProductIdentifiers
            : [],
          firstSeen: customerInfo.firstSeen || null,
          originalPurchaseDate: customerInfo.originalPurchaseDate || null,
        }
      : null,
  };
  return postJSON("/v1/entitlements/sync", snapshot);
};

export const validateStorePurchase = async ({
  appUserId,
  installId,
  platform,
  productId,
  transactionId,
  purchaseToken,
  receipt,
  signature,
  obfuscatedAccountId,
}) => {
  const payload = {
    appUserId: appUserId || null,
    installId: installId || null,
    platform: platform || null,
    productId: productId || null,
    transactionId: transactionId || null,
    purchaseToken: purchaseToken || null,
    receipt: receipt || null,
    signature: signature || null,
    obfuscatedAccountId: obfuscatedAccountId || null,
  };
  return postJSON("/v1/iap/validate", payload);
};
