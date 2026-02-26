import { getSeenTransaction } from "./store/entitlementsStore.js";

const MAX_EVENTS_PER_INSTALL = 30;
const INSTALL_WINDOW_MS = 60 * 60 * 1000;

const installEventWindow = new Map();

const bumpInstallWindow = (installId) => {
  if (!installId) return 0;
  const now = Date.now();
  const prev = installEventWindow.get(installId) || [];
  const next = [...prev.filter((ts) => now - ts <= INSTALL_WINDOW_MS), now];
  installEventWindow.set(installId, next);
  return next.length;
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
