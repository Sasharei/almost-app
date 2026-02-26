import { AppStoreServerAPIClient, Environment } from "@apple/app-store-server-library";
import { config } from "../config.js";

let appleClient = null;

const decodeJwsPayload = (jws = "") => {
  if (!jws || typeof jws !== "string") return null;
  const parts = jws.split(".");
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

const getAppleClient = () => {
  if (appleClient) return appleClient;
  const environment =
    config.apple.environment === "production" ? Environment.PRODUCTION : Environment.SANDBOX;
  appleClient = new AppStoreServerAPIClient(
    config.apple.privateKey,
    config.apple.keyId,
    config.apple.issuerId,
    config.apple.bundleId,
    environment
  );
  return appleClient;
};

const normalizeDate = (value) => {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null;
  return new Date(asNumber).toISOString();
};

export const validateApplePurchase = async ({ transactionId }) => {
  if (!config.apple.enabled) {
    return {
      ok: false,
      trusted: false,
      reason: "apple_validation_disabled",
    };
  }
  if (!transactionId) {
    return {
      ok: false,
      trusted: false,
      reason: "missing_transaction_id",
    };
  }

  try {
    const client = getAppleClient();
    const transactionResponse = await client.getTransactionInfo(transactionId);
    const payload = decodeJwsPayload(transactionResponse?.signedTransactionInfo || "");
    const expiresDate = normalizeDate(payload?.expiresDate);
    const revocationDate = normalizeDate(payload?.revocationDate);
    const isSubscription = payload?.type === "Auto-Renewable Subscription" || !!payload?.expiresDate;
    const isActive = revocationDate
      ? false
      : expiresDate
      ? new Date(expiresDate).getTime() > Date.now()
      : true;

    return {
      ok: true,
      trusted: true,
      platform: "ios",
      productId: payload?.productId || null,
      transactionId: payload?.transactionId || transactionId,
      originalTransactionId: payload?.originalTransactionId || null,
      isSubscription,
      expiresDate,
      revocationDate,
      isActive,
      raw: {
        appAccountToken: payload?.appAccountToken || null,
        purchaseDate: normalizeDate(payload?.purchaseDate),
      },
    };
  } catch (error) {
    return {
      ok: false,
      trusted: false,
      reason: "apple_validation_failed",
      error: error?.message || "unknown_error",
    };
  }
};
