import { Platform } from "react-native";
import { PREMIUM_ENTITLEMENT_ID, PREMIUM_PRODUCT_IDS } from "./constants";

let Purchases = null;
let PurchasesLogLevel = null;

try {
  // Optional in old builds; keep app alive if native module is not linked yet.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const purchasesModule = require("react-native-purchases");
  Purchases = purchasesModule?.default || purchasesModule || null;
  PurchasesLogLevel = purchasesModule?.LOG_LEVEL || null;
} catch (error) {
  console.warn("react-native-purchases unavailable", error);
}

const PACKAGE_TYPE_TO_PLAN = {
  MONTHLY: "monthly",
  ANNUAL: "yearly",
  LIFETIME: "lifetime",
};

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
  if (normalized.includes("month")) return "monthly";
  if (normalized === PREMIUM_PRODUCT_IDS.monthly) return "monthly";
  if (normalized === PREMIUM_PRODUCT_IDS.yearly) return "yearly";
  if (normalized === PREMIUM_PRODUCT_IDS.lifetime) return "lifetime";
  return null;
};

const normalizeProductIdentifier = (value = "") => String(value || "").trim().toLowerCase();
const PREMIUM_PRODUCT_IDENTIFIER_SET = new Set(
  Object.values(PREMIUM_PRODUCT_IDS).map((value) => normalizeProductIdentifier(value))
);
const PREMIUM_PRODUCT_IDENTIFIER_ALIASES = new Set(["monthly", "yearly", "lifetime"]);

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
  return !!getActivePremiumEntitlement(customerInfo);
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
  return {
    identifier: PREMIUM_ENTITLEMENT_ID,
    isActive: true,
    productIdentifier,
    latestPurchaseDate: customerInfo?.requestDate || null,
    expirationDate: null,
    store: null,
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

export const mapOfferingPackagesByPlan = (offerings) => {
  const current = offerings?.current;
  const packages = Array.isArray(current?.availablePackages) ? current.availablePackages : [];
  const byPlan = {};
  packages.forEach((pkg) => {
    const packageType = typeof pkg?.packageType === "string" ? pkg.packageType : "";
    const byType = PACKAGE_TYPE_TO_PLAN[packageType] || null;
    const byIdentifier = findPlanByIdentifier(pkg?.product?.identifier || pkg?.identifier || "");
    const planId = byType || byIdentifier;
    if (!planId || byPlan[planId]) return;
    byPlan[planId] = pkg;
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
