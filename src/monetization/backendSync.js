const REQUEST_TIMEOUT_MS = 7000;
const AUTH_TOKEN_REFRESH_SKEW_MS = 30 * 1000;
const AUTH_TOKEN_FALLBACK_TTL_MS = 4 * 60 * 1000;

let cachedSessionToken = "";
let cachedSessionExpiresAt = 0;
let sessionTokenInFlight = null;

const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("request_timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
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

const parseResponseJson = (responseBody = "") => {
  try {
    return responseBody ? JSON.parse(responseBody) : null;
  } catch (error) {
    return null;
  }
};

const normalizeTimestampMs = (value, fallback = 0) => {
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber > 10_000_000_000 ? asNumber : asNumber * 1000;
  }
  if (typeof value === "string") {
    const asDate = Date.parse(value);
    if (Number.isFinite(asDate) && asDate > 0) return asDate;
  }
  return fallback;
};

const hasFreshSessionToken = () =>
  !!cachedSessionToken &&
  Number.isFinite(cachedSessionExpiresAt) &&
  cachedSessionExpiresAt - Date.now() > AUTH_TOKEN_REFRESH_SKEW_MS;

const clearSessionTokenCache = () => {
  cachedSessionToken = "";
  cachedSessionExpiresAt = 0;
};

const requestSessionToken = async ({ appUserId = null, installId = null, platform = null } = {}) => {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return { ok: false, skipped: true, reason: "backend_url_missing" };
  }
  if (!installId) {
    return { ok: false, skipped: true, reason: "install_id_missing" };
  }
  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/v1/auth/session`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          appUserId: appUserId || null,
          installId: installId || null,
          platform: platform || null,
        }),
      },
      REQUEST_TIMEOUT_MS
    );
    const responseBody = await response.text();
    const parsed = parseResponseJson(responseBody);
    if (!response.ok) {
      return {
        ok: false,
        skipped: response.status === 404 || response.status === 503,
        status: response.status,
        reason: parsed?.error || "auth_session_failed",
      };
    }
    const token = typeof parsed?.token === "string" ? parsed.token.trim() : "";
    if (!token) {
      return { ok: false, reason: "auth_token_missing" };
    }
    const fallbackExpiry = Date.now() + AUTH_TOKEN_FALLBACK_TTL_MS;
    const expiresAt = normalizeTimestampMs(parsed?.expiresAt, fallbackExpiry);
    return {
      ok: true,
      token,
      expiresAt,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "auth_unreachable",
      error,
    };
  }
};

const resolveSessionToken = async (context = {}, { forceRefresh = false } = {}) => {
  if (!forceRefresh && hasFreshSessionToken()) {
    return {
      ok: true,
      token: cachedSessionToken,
      expiresAt: cachedSessionExpiresAt,
      cached: true,
    };
  }
  if (sessionTokenInFlight) return sessionTokenInFlight;
  sessionTokenInFlight = requestSessionToken(context)
    .then((result) => {
      if (result?.ok && result.token) {
        cachedSessionToken = result.token;
        cachedSessionExpiresAt = Number(result.expiresAt) || Date.now() + AUTH_TOKEN_FALLBACK_TTL_MS;
      } else if (!result?.skipped) {
        clearSessionTokenCache();
      }
      return result;
    })
    .finally(() => {
      sessionTokenInFlight = null;
    });
  return sessionTokenInFlight;
};

const postJSON = async (path, payload) => {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return { ok: false, skipped: true, reason: "backend_url_missing" };
  }
  const headers = {
    "content-type": "application/json",
  };
  const authContext = {
    appUserId: payload?.appUserId || null,
    installId: payload?.installId || null,
    platform: payload?.platform || null,
  };
  const session = await resolveSessionToken(authContext);
  if (session?.ok && session.token) {
    headers.authorization = `Bearer ${session.token}`;
  }
  const makeRequest = async (requestHeaders) =>
    fetchWithTimeout(
      `${baseUrl}${path}`,
      {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(payload || {}),
      },
      REQUEST_TIMEOUT_MS
    );
  try {
    let response = await makeRequest(headers);
    if (response.status === 401 && headers.authorization) {
      clearSessionTokenCache();
      const refreshed = await resolveSessionToken(authContext, { forceRefresh: true });
      if (refreshed?.ok && refreshed.token) {
        response = await makeRequest({
          ...headers,
          authorization: `Bearer ${refreshed.token}`,
        });
      }
    }
    const responseBody = await response.text();
    const parsed = parseResponseJson(responseBody);
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
