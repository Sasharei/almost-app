import fs from "node:fs";
import { Environment, SignedDataVerifier } from "@apple/app-store-server-library";
import { config } from "../config.js";
import { getSeenTransaction } from "../store/entitlementsStore.js";

const INACTIVE_NOTIFICATION_TYPES = new Set(["EXPIRED", "REFUND", "REVOKE"]);

let verifier = null;
let verifierInitError = null;

const normalizeString = (value, maxLength = 500) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
};

const toIsoOrNull = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return new Date(parsed).toISOString();
};

const decodeJwsPayload = (jws = "") => {
  const value = normalizeString(jws, 200000);
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const initVerifier = () => {
  if (!config.apple.webhook.verifySignature) {
    return { verifier: null, error: null };
  }
  if (verifier) return { verifier, error: null };
  if (verifierInitError) return { verifier: null, error: verifierInitError };
  try {
    const env =
      config.apple.environment === "production" ? Environment.PRODUCTION : Environment.SANDBOX;
    const rootCaPaths = Array.isArray(config.apple.webhook.rootCaPaths)
      ? config.apple.webhook.rootCaPaths
      : [];
    if (!rootCaPaths.length) {
      throw new Error("apple_root_ca_paths_missing");
    }
    const rootCAs = rootCaPaths.map((filePath) => fs.readFileSync(filePath));
    const appAppleId =
      env === Environment.PRODUCTION && Number.isFinite(Number(config.apple.appAppleId))
        ? Number(config.apple.appAppleId)
        : undefined;
    verifier = new SignedDataVerifier(
      rootCAs,
      !!config.apple.webhook.enableOnlineChecks,
      env,
      config.apple.bundleId,
      appAppleId
    );
    return { verifier, error: null };
  } catch (error) {
    verifierInitError = error;
    return { verifier: null, error };
  }
};

const resolveMappedUserId = ({ appUserIdHint, appAccountToken, transactionId, originalTransactionId }) => {
  const tokenCandidate = normalizeString(appAccountToken, 200);
  if (tokenCandidate) return tokenCandidate;
  const txSeen = normalizeString(transactionId, 500) ? getSeenTransaction(transactionId) : null;
  if (txSeen?.appUserId) return txSeen.appUserId;
  const originalSeen = normalizeString(originalTransactionId, 500)
    ? getSeenTransaction(originalTransactionId)
    : null;
  if (originalSeen?.appUserId) return originalSeen.appUserId;
  return normalizeString(appUserIdHint, 200);
};

const resolveIsActive = ({ notificationType, revocationDate, expiresDate }) => {
  if (revocationDate) return false;
  if (expiresDate) {
    return new Date(expiresDate).getTime() > Date.now();
  }
  if (INACTIVE_NOTIFICATION_TYPES.has(notificationType || "")) {
    return false;
  }
  return true;
};

export const parseAppleServerNotification = async ({ signedPayload, appUserIdHint = null }) => {
  const signed = normalizeString(signedPayload, 200000);
  if (!signed) {
    return { ok: false, reason: "missing_signed_payload" };
  }

  let decodedNotification = null;
  let decodedTransaction = null;
  let decodedRenewal = null;
  let trusted = false;

  if (config.apple.webhook.verifySignature) {
    const state = initVerifier();
    if (state.error || !state.verifier) {
      return {
        ok: false,
        reason: "apple_webhook_verifier_init_failed",
        error: state.error?.message || "unknown_error",
      };
    }
    try {
      decodedNotification = await state.verifier.verifyAndDecodeNotification(signed);
      trusted = true;
      const signedTransactionInfo = normalizeString(
        decodedNotification?.data?.signedTransactionInfo,
        200000
      );
      if (signedTransactionInfo) {
        decodedTransaction = await state.verifier.verifyAndDecodeTransaction(signedTransactionInfo);
      }
      const signedRenewalInfo = normalizeString(
        decodedNotification?.data?.signedRenewalInfo,
        200000
      );
      if (signedRenewalInfo) {
        decodedRenewal = await state.verifier.verifyAndDecodeRenewalInfo(signedRenewalInfo);
      }
    } catch (error) {
      return {
        ok: false,
        reason: "apple_webhook_verification_failed",
        error: error?.message || "unknown_error",
      };
    }
  } else {
    decodedNotification = decodeJwsPayload(signed);
    if (!decodedNotification) {
      return {
        ok: false,
        reason: "apple_invalid_signed_payload",
      };
    }
    decodedTransaction = decodeJwsPayload(decodedNotification?.data?.signedTransactionInfo || "");
    decodedRenewal = decodeJwsPayload(decodedNotification?.data?.signedRenewalInfo || "");
  }

  const notificationType = normalizeString(decodedNotification?.notificationType, 120);
  const subtype = normalizeString(decodedNotification?.subtype, 120);
  const notificationUUID = normalizeString(decodedNotification?.notificationUUID, 200);

  const transactionId =
    normalizeString(decodedTransaction?.transactionId, 500) ||
    normalizeString(decodedNotification?.data?.transactionId, 500) ||
    null;
  const originalTransactionId =
    normalizeString(decodedTransaction?.originalTransactionId, 500) ||
    normalizeString(decodedRenewal?.originalTransactionId, 500) ||
    null;
  const productId =
    normalizeString(decodedTransaction?.productId, 200) ||
    normalizeString(decodedRenewal?.autoRenewProductId, 200) ||
    normalizeString(decodedRenewal?.productId, 200) ||
    null;
  const appAccountToken =
    normalizeString(decodedTransaction?.appAccountToken, 200) ||
    normalizeString(decodedRenewal?.appAccountToken, 200) ||
    null;
  const expiresDate =
    toIsoOrNull(decodedTransaction?.expiresDate) ||
    toIsoOrNull(decodedRenewal?.renewalDate) ||
    toIsoOrNull(decodedRenewal?.gracePeriodExpiresDate) ||
    null;
  const revocationDate = toIsoOrNull(decodedTransaction?.revocationDate);
  const appUserId = resolveMappedUserId({
    appUserIdHint,
    appAccountToken,
    transactionId,
    originalTransactionId,
  });
  const isActive = resolveIsActive({
    notificationType,
    revocationDate,
    expiresDate,
  });

  return {
    ok: true,
    trusted,
    mapped: !!appUserId,
    appUserId: appUserId || null,
    notificationType: notificationType || null,
    subtype: subtype || null,
    notificationUUID: notificationUUID || null,
    productId,
    transactionId,
    originalTransactionId,
    expiresDate,
    revocationDate,
    isActive,
    raw: {
      notification: decodedNotification || null,
      transaction: decodedTransaction || null,
      renewal: decodedRenewal || null,
    },
  };
};
