import { Platform } from "react-native";
import { PREMIUM_ENTITLEMENT_ID, PREMIUM_PRODUCT_IDS } from "./constants";

let Purchases = null;
let PurchasesLogLevel = null;
let PurchasesIntroEligibilityStatus = null;

try {
  // Optional in old builds; keep app alive if native module is not linked yet.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const purchasesModule = require("react-native-purchases");
  Purchases = purchasesModule?.default || purchasesModule || null;
  PurchasesLogLevel = purchasesModule?.LOG_LEVEL || null;
  PurchasesIntroEligibilityStatus = purchasesModule?.INTRO_ELIGIBILITY_STATUS || null;
} catch (error) {
  console.warn("react-native-purchases unavailable", error);
}

const PACKAGE_TYPE_TO_PLAN = {
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  ANNUAL: "yearly",
  LIFETIME: "lifetime",
};

export const INTRO_ELIGIBILITY_STATUS = Object.freeze({
  unknown: Number(PurchasesIntroEligibilityStatus?.INTRO_ELIGIBILITY_STATUS_UNKNOWN ?? 0),
  ineligible: Number(PurchasesIntroEligibilityStatus?.INTRO_ELIGIBILITY_STATUS_INELIGIBLE ?? 1),
  eligible: Number(PurchasesIntroEligibilityStatus?.INTRO_ELIGIBILITY_STATUS_ELIGIBLE ?? 2),
  noIntroOffer: Number(
    PurchasesIntroEligibilityStatus?.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS ?? 3
  ),
});

const resolveApiKey = () => {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_RC_IOS_API_KEY || "";
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY || "";
  }
  return "";
};

const findPlanByIdentifier = (productIdentifier = "") => {
  const normalized = String(productIdentifier || "").toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("lifetime") || normalized.includes("life_time")) return "lifetime";
  if (normalized.includes("year") || normalized.includes("annual")) return "yearly";
  if (normalized.includes("week")) return "weekly";
  if (normalized.includes("month")) return "monthly";
  if (normalized === PREMIUM_PRODUCT_IDS.weekly) return "weekly";
  if (normalized === PREMIUM_PRODUCT_IDS.monthly) return "monthly";
  if (normalized === PREMIUM_PRODUCT_IDS.yearly) return "yearly";
  if (normalized === PREMIUM_PRODUCT_IDS.lifetime) return "lifetime";
  return null;
};

const normalizeProductIdentifier = (value = "") => String(value || "").trim().toLowerCase();
const normalizeOfferingIdentifier = (value = "") => String(value || "").trim().toLowerCase();
const PREMIUM_PRODUCT_IDENTIFIER_SET = new Set(
  Object.values(PREMIUM_PRODUCT_IDS).map((value) => normalizeProductIdentifier(value))
);
const PREMIUM_PRODUCT_IDENTIFIER_ALIASES = new Set(["weekly", "monthly", "yearly", "lifetime"]);

const parseBooleanValue = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return null;
};

const parseDateMs = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const collectOfferings = (offerings = null) => {
  const all = [];
  const current = offerings?.current;
  if (current && typeof current === "object") {
    all.push(current);
  }
  const allOfferingsMap =
    offerings?.all && typeof offerings.all === "object" ? offerings.all : null;
  if (allOfferingsMap) {
    Object.values(allOfferingsMap).forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      all.push(entry);
    });
  }
  const seen = new Set();
  const deduped = [];
  all.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    if (seen.has(entry)) return;
    seen.add(entry);
    deduped.push(entry);
  });
  return deduped;
};

export const resolveOfferingByIdentifiers = (offerings = null, preferredOfferingIdentifiers = []) => {
  const preferredSet = new Set(
    (Array.isArray(preferredOfferingIdentifiers) ? preferredOfferingIdentifiers : [])
      .map((entry) => normalizeOfferingIdentifier(entry))
      .filter(Boolean)
  );
  if (!preferredSet.size) return null;
  const candidates = collectOfferings(offerings);
  if (!candidates.length) return null;
  return (
    candidates.find((offering) => {
      const offeringIdentifier = normalizeOfferingIdentifier(
        offering?.identifier || offering?.offeringIdentifier || ""
      );
      if (!offeringIdentifier) return false;
      return preferredSet.has(offeringIdentifier);
    }) || null
  );
};

const resolveSubscriptionByProductIdentifier = (customerInfo, productIdentifier = "") => {
  if (!customerInfo || typeof customerInfo !== "object") return null;
  const subscriptionsByProductIdentifier =
    customerInfo?.subscriptionsByProductIdentifier &&
    typeof customerInfo.subscriptionsByProductIdentifier === "object"
      ? customerInfo.subscriptionsByProductIdentifier
      : null;
  if (!subscriptionsByProductIdentifier) return null;
  const normalizedProductIdentifier = normalizeProductIdentifier(productIdentifier);
  if (!normalizedProductIdentifier) return null;
  const match = Object.entries(subscriptionsByProductIdentifier).find(
    ([entryProductIdentifier]) =>
      normalizeProductIdentifier(entryProductIdentifier) === normalizedProductIdentifier
  );
  return match?.[1] && typeof match[1] === "object" ? match[1] : null;
};

const resolveEntitlementExpirationMs = (entitlement = null) =>
  parseDateMs(
    entitlement?.expirationDate ||
      entitlement?.expiration_date ||
      entitlement?.expiresDate ||
      entitlement?.expires_date ||
      ""
  );

const resolveCustomerInfoRequestDateMs = (customerInfo = null) =>
  parseDateMs(customerInfo?.requestDate || customerInfo?.request_date || "") || Date.now();

const isKnownPremiumProductIdentifier = (value = "") => {
  const normalized = normalizeProductIdentifier(value);
  if (!normalized) return false;
  if (PREMIUM_PRODUCT_IDENTIFIER_SET.has(normalized)) return true;
  if (PREMIUM_PRODUCT_IDENTIFIER_ALIASES.has(normalized)) return true;
  return normalized.startsWith("almost_premium");
};

const getActiveEntitlementEntries = (customerInfo) => {
  const active = customerInfo?.entitlements?.active;
  if (!active || typeof active !== "object") return [];
  return Object.entries(active);
};

const resolveActivePremiumProductIdentifier = (customerInfo) => {
  if (!customerInfo || typeof customerInfo !== "object") return null;
  const activeEntitlements = getActiveEntitlementEntries(customerInfo);
  const activeEntitlementProduct = activeEntitlements.find(([, entitlement]) =>
    isKnownPremiumProductIdentifier(
      entitlement?.productIdentifier || entitlement?.productId || entitlement?.product_id || ""
    )
  );
  if (activeEntitlementProduct) {
    const entitlement = activeEntitlementProduct[1] || {};
    return entitlement?.productIdentifier || entitlement?.productId || entitlement?.product_id || null;
  }
  const activeSubscriptions = Array.isArray(customerInfo?.activeSubscriptions)
    ? customerInfo.activeSubscriptions
    : [];
  const activeSubscriptionProduct = activeSubscriptions.find((entry) =>
    isKnownPremiumProductIdentifier(entry)
  );
  if (activeSubscriptionProduct) return activeSubscriptionProduct;
  const nonSubscriptionTransactions = Array.isArray(customerInfo?.nonSubscriptionTransactions)
    ? customerInfo.nonSubscriptionTransactions
    : [];
  const nonSubscriptionProduct = nonSubscriptionTransactions.find((entry) =>
    isKnownPremiumProductIdentifier(
      entry?.productIdentifier || entry?.productId || entry?.product_id || ""
    )
  );
  if (nonSubscriptionProduct) {
    return (
      nonSubscriptionProduct?.productIdentifier ||
      nonSubscriptionProduct?.productId ||
      nonSubscriptionProduct?.product_id ||
      null
    );
  }
  const allPurchasedProductIdentifiers = Array.isArray(customerInfo?.allPurchasedProductIdentifiers)
    ? customerInfo.allPurchasedProductIdentifiers
    : [];
  const lifetimeProduct = allPurchasedProductIdentifiers.find((entry) => {
    const normalized = normalizeProductIdentifier(entry);
    if (!normalized) return false;
    return (
      normalized === normalizeProductIdentifier(PREMIUM_PRODUCT_IDS.lifetime) ||
      normalized === "lifetime" ||
      normalized.startsWith("almost_premium_lifetime")
    );
  });
  return lifetimeProduct || null;
};

export const isPurchasesAvailable = () => {
  return (
    !!Purchases &&
    typeof Purchases.configure === "function" &&
    typeof Purchases.getCustomerInfo === "function"
  );
};

export const isPremiumFromCustomerInfo = (customerInfo) => {
  const entitlement = getActivePremiumEntitlement(customerInfo);
  if (!entitlement) return false;
  const explicitActive = parseBooleanValue(
    entitlement?.isActive ?? entitlement?.is_active ?? entitlement?.active
  );
  if (explicitActive === false) {
    return false;
  }
  const requestDateMs = resolveCustomerInfoRequestDateMs(customerInfo);
  const expirationMs = resolveEntitlementExpirationMs(entitlement);
  if (expirationMs && requestDateMs >= expirationMs) {
    return false;
  }
  return true;
};

export const getActivePremiumEntitlement = (customerInfo) => {
  if (!customerInfo || typeof customerInfo !== "object") return null;
  const activeEntitlements = getActiveEntitlementEntries(customerInfo);
  const directEntitlement = activeEntitlements.find(([key]) => key === PREMIUM_ENTITLEMENT_ID);
  if (directEntitlement?.[1]) {
    return directEntitlement[1];
  }
  const productLinkedEntitlement = activeEntitlements.find(([, entitlement]) =>
    isKnownPremiumProductIdentifier(
      entitlement?.productIdentifier || entitlement?.productId || entitlement?.product_id || ""
    )
  );
  if (productLinkedEntitlement?.[1]) {
    const [identifier, entitlement] = productLinkedEntitlement;
    return {
      ...entitlement,
      identifier: entitlement?.identifier || identifier || PREMIUM_ENTITLEMENT_ID,
      isActive: true,
    };
  }
  const productIdentifier = resolveActivePremiumProductIdentifier(customerInfo);
  if (!productIdentifier) return null;
  const subscriptionEntry = resolveSubscriptionByProductIdentifier(customerInfo, productIdentifier);
  return {
    identifier: PREMIUM_ENTITLEMENT_ID,
    isActive: true,
    productIdentifier,
    latestPurchaseDate:
      subscriptionEntry?.purchaseDate ||
      subscriptionEntry?.purchase_date ||
      customerInfo?.requestDate ||
      null,
    expirationDate:
      subscriptionEntry?.expiresDate ||
      subscriptionEntry?.expires_date ||
      subscriptionEntry?.expirationDate ||
      subscriptionEntry?.expiration_date ||
      null,
    periodType:
      subscriptionEntry?.periodType ||
      subscriptionEntry?.period_type ||
      subscriptionEntry?.periodTypeIdentifier ||
      subscriptionEntry?.period_type_identifier ||
      null,
    willRenew: subscriptionEntry?.willRenew ?? subscriptionEntry?.will_renew ?? null,
    unsubscribeDetectedAt:
      subscriptionEntry?.unsubscribeDetectedAt ||
      subscriptionEntry?.unsubscribe_detected_at ||
      null,
    store: subscriptionEntry?.store || null,
    source: "product_fallback",
  };
};

export const configurePurchases = async ({ appUserId = null } = {}) => {
  if (!isPurchasesAvailable()) {
    return { ok: false, reason: "module_unavailable" };
  }
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return { ok: false, reason: "missing_api_key" };
  }
  try {
    if (typeof Purchases.setLogLevel === "function" && PurchasesLogLevel?.WARN) {
      Purchases.setLogLevel(__DEV__ ? PurchasesLogLevel.DEBUG : PurchasesLogLevel.WARN);
    }
  } catch (error) {
    console.warn("purchases log level", error);
  }
  try {
    const payload = appUserId ? { apiKey, appUserID: appUserId } : { apiKey };
    await Purchases.configure(payload);
    return { ok: true };
  } catch (error) {
    console.warn("purchases configure", error);
    return { ok: false, reason: "configure_failed", error };
  }
};

export const getCustomerInfoSafe = async () => {
  if (!isPurchasesAvailable()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.warn("purchases customer info", error);
    return null;
  }
};

export const getOfferingsSafe = async () => {
  if (!isPurchasesAvailable()) return null;
  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.warn("purchases offerings", error);
    return null;
  }
};

export const getTrialEligibilityByProductIdsSafe = async (productIdentifiers = []) => {
  if (!isPurchasesAvailable()) return {};
  if (typeof Purchases.checkTrialOrIntroductoryPriceEligibility !== "function") {
    return {};
  }
  const uniqueIdentifiers = Array.from(
    new Set(
      (Array.isArray(productIdentifiers) ? productIdentifiers : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
  const normalizedIdentifiers = uniqueIdentifiers
    .map((value) => normalizeProductIdentifier(value))
    .filter(Boolean);
  if (!normalizedIdentifiers.length) return {};
  try {
    const rawResponse = await Purchases.checkTrialOrIntroductoryPriceEligibility(uniqueIdentifiers);
    const normalizedResponse = {};
    if (rawResponse && typeof rawResponse === "object") {
      Object.entries(rawResponse).forEach(([productId, eligibility]) => {
        const normalizedId = normalizeProductIdentifier(productId);
        if (!normalizedId) return;
        normalizedResponse[normalizedId] =
          Number(eligibility?.status) === INTRO_ELIGIBILITY_STATUS.eligible;
      });
    }
    normalizedIdentifiers.forEach((productId) => {
      if (normalizedResponse[productId] === undefined) {
        normalizedResponse[productId] = false;
      }
    });
    return normalizedResponse;
  } catch (error) {
    console.warn("purchases intro eligibility", error);
    return {};
  }
};

export const mapOfferingPackagesByPlan = (offerings, { preferredOfferingIdentifiers = [] } = {}) => {
  const preferredOffering = resolveOfferingByIdentifiers(offerings, preferredOfferingIdentifiers);
  const currentOffering = offerings?.current && typeof offerings.current === "object"
    ? offerings.current
    : null;
  const offeringsToInspect = [];
  if (preferredOffering) {
    offeringsToInspect.push(preferredOffering);
  }
  if (currentOffering && currentOffering !== preferredOffering) {
    offeringsToInspect.push(currentOffering);
  }
  if (!offeringsToInspect.length) {
    const fallbackOffering = collectOfferings(offerings)[0] || null;
    if (fallbackOffering) {
      offeringsToInspect.push(fallbackOffering);
    }
  }
  const byPlan = {};
  offeringsToInspect.forEach((offering) => {
    const packages = Array.isArray(offering?.availablePackages) ? offering.availablePackages : [];
    // Pass 1: prefer canonical package types from RevenueCat (`WEEKLY`, `MONTHLY`, `ANNUAL`, `LIFETIME`).
    // This avoids accidentally selecting a custom package (e.g. trial/targeted offer)
    // when multiple packages map to the same logical plan.
    packages.forEach((pkg) => {
      const packageType = typeof pkg?.packageType === "string" ? pkg.packageType : "";
      const planId = PACKAGE_TYPE_TO_PLAN[packageType] || null;
      if (!planId || byPlan[planId]) return;
      byPlan[planId] = pkg;
    });

    // Pass 2: fallback heuristics only for missing plans.
    packages.forEach((pkg) => {
      const packageType = typeof pkg?.packageType === "string" ? pkg.packageType : "";
      const byType = PACKAGE_TYPE_TO_PLAN[packageType] || null;
      if (byType) return;
      const byPackageIdentifier = findPlanByIdentifier(pkg?.identifier || "");
      const byProductIdentifier = findPlanByIdentifier(pkg?.product?.identifier || "");
      const planId = byPackageIdentifier || byProductIdentifier;
      if (!planId || byPlan[planId]) return;
      byPlan[planId] = pkg;
    });
  });
  return byPlan;
};

export const addCustomerInfoUpdateListener = (handler) => {
  if (!isPurchasesAvailable()) {
    return () => {};
  }
  if (typeof handler !== "function") {
    return () => {};
  }
  try {
    Purchases.addCustomerInfoUpdateListener(handler);
    return () => {
      if (typeof Purchases.removeCustomerInfoUpdateListener === "function") {
        Purchases.removeCustomerInfoUpdateListener(handler);
      }
    };
  } catch (error) {
    console.warn("purchases customer info listener", error);
    return () => {};
  }
};

export const purchasePlanPackage = async (pkg) => {
  if (!isPurchasesAvailable() || !pkg) {
    return { ok: false, reason: "package_unavailable" };
  }
  try {
    const result = await Purchases.purchasePackage(pkg);
    return { ok: true, result };
  } catch (error) {
    const cancelled = !!(
      error &&
      (error.userCancelled === true ||
        error.code === "PURCHASE_CANCELLED" ||
        error.code === "USER_CANCELLED")
    );
    if (!cancelled) {
      console.warn("purchases purchase package", error);
    }
    return {
      ok: false,
      cancelled,
      reason: cancelled ? "cancelled" : "purchase_failed",
      error,
    };
  }
};

export const restorePurchasesSafe = async () => {
  if (!isPurchasesAvailable()) {
    return { ok: false, reason: "module_unavailable" };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { ok: true, customerInfo };
  } catch (error) {
    console.warn("purchases restore", error);
    return { ok: false, reason: "restore_failed", error };
  }
};

export const setPurchasesAttributesSafe = async (attributes = {}) => {
  if (!isPurchasesAvailable()) return false;
  if (!attributes || typeof attributes !== "object") return false;
  if (!Object.keys(attributes).length) return false;
  try {
    if (typeof Purchases.setAttributes === "function") {
      await Purchases.setAttributes(attributes);
      return true;
    }
    return false;
  } catch (error) {
    console.warn("purchases set attributes", error);
    return false;
  }
};
