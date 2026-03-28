import { getSeenTransaction } from "./store/entitlementsStore.js";
import { LRUCache } from "lru-cache";
import { config } from "./config.js";

const MAX_EVENTS_PER_INSTALL = 30;
const INSTALL_WINDOW_MS = 60 * 60 * 1000;

const installEventWindow = new LRUCache({
  max: Math.max(1000, Number(config.security?.risk?.installWindowMaxEntries) || 20000),
  ttl: INSTALL_WINDOW_MS,
  allowStale: false,
});

const bumpInstallWindow = (installId) => {
  if (!installId) return 0;
  const now = Date.now();
  const previous = installEventWindow.get(installId);
  if (!previous || now - Number(previous.startedAt || 0) > INSTALL_WINDOW_MS) {
    installEventWindow.set(installId, {
      startedAt: now,
      lastSeenAt: now,
      count: 1,
    });
    return 1;
  }
  const nextCount = Math.max(1, Number(previous.count || 0) + 1);
  installEventWindow.set(installId, {
    startedAt: Number(previous.startedAt || now),
    lastSeenAt: now,
    count: nextCount,
  });
  return nextCount;
};

export const scoreFraudRisk = ({ payload, trustedValidation }) => {
  const reasons = [];
  let score = 0;

  const appUserId = payload?.appUserId || "";
  const installId = payload?.installId || "";
  const transactionId = payload?.transactionId || payload?.purchaseToken || "";

  if (!appUserId) {
    score += 0.2;
    reasons.push("missing_app_user_id");
  }
  if (!installId) {
    score += 0.2;
    reasons.push("missing_install_id");
  }

  if (transactionId) {
    const previous = getSeenTransaction(transactionId);
    if (previous && previous.appUserId && previous.appUserId !== appUserId) {
      score += 0.7;
      reasons.push("reused_transaction_other_user");
    } else if (previous) {
      score += 0.15;
      reasons.push("duplicate_transaction");
    }
  } else {
    score += 0.35;
    reasons.push("missing_transaction_reference");
  }

  const installHits = bumpInstallWindow(installId);
  if (installHits > MAX_EVENTS_PER_INSTALL) {
    score += 0.35;
    reasons.push("excessive_install_requests");
  }

  if (!trustedValidation) {
    score += 0.25;
    reasons.push("untrusted_client_snapshot_only");
  }

  return {
    score: Math.min(1, Number(score.toFixed(3))),
    reasons,
  };
};
