import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { LRUCache } from "lru-cache";
import { config } from "../config.js";

const entitlementByUser = new Map();
const installSecretBindings = new LRUCache({
  max: 50000,
  allowStale: false,
});
const seenTransactions = new LRUCache({
  max: 20000,
  ttl: config.replayWindowMs,
  allowStale: false,
});
const idempotencyCache = new LRUCache({
  max: 10000,
  ttl: config.requestTtlMs,
  allowStale: false,
});

const STORE_VERSION = 1;
const persistEnabled = !!String(config.storePath || "").trim();
const storeFilePath = persistEnabled ? path.resolve(String(config.storePath)) : "";
let pendingFlushTimer = null;
let flushInFlight = false;

const ensureStoreDirectory = async () => {
  if (!persistEnabled) return;
  await fs.promises.mkdir(path.dirname(storeFilePath), { recursive: true });
};

const timingSafeEquals = (left = "", right = "") => {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const normalizeInstallSecret = (value = "") => String(value || "").trim().slice(0, 2048);
const hashInstallSecret = (value = "") =>
  crypto.createHash("sha256").update(String(value || ""), "utf8").digest("base64url");

const serializeState = () => {
  const transactions = [];
  seenTransactions.forEach((value, key) => {
    transactions.push([key, value]);
  });
  const secretBindings = [];
  installSecretBindings.forEach((value, key) => {
    secretBindings.push([key, value]);
  });
  return {
    version: STORE_VERSION,
    savedAt: new Date().toISOString(),
    entitlementByUser: Object.fromEntries(entitlementByUser.entries()),
    seenTransactions: transactions,
    installSecretBindings: secretBindings,
  };
};

const applyState = (payload = {}) => {
  const entitlements = payload?.entitlementByUser;
  if (entitlements && typeof entitlements === "object") {
    Object.entries(entitlements).forEach(([appUserId, value]) => {
      if (!appUserId) return;
      entitlementByUser.set(appUserId, value);
    });
  }
  const transactions = Array.isArray(payload?.seenTransactions) ? payload.seenTransactions : [];
  transactions.forEach((entry) => {
    if (!Array.isArray(entry) || entry.length < 2) return;
    const [transactionId, value] = entry;
    if (!transactionId) return;
    seenTransactions.set(transactionId, value);
  });
  const secretBindings = Array.isArray(payload?.installSecretBindings) ? payload.installSecretBindings : [];
  secretBindings.forEach((entry) => {
    if (!Array.isArray(entry) || entry.length < 2) return;
    const [installId, value] = entry;
    if (!installId || !value || typeof value !== "object") return;
    const normalizedHash = String(value.secretHash || "").trim();
    if (!normalizedHash) return;
    installSecretBindings.set(installId, {
      secretHash: normalizedHash,
      createdAt: value.createdAt || null,
      lastSeenAt: value.lastSeenAt || null,
    });
  });
};

const flushNow = async () => {
  if (!persistEnabled || flushInFlight) return;
  flushInFlight = true;
  try {
    await ensureStoreDirectory();
    const payload = serializeState();
    const tmpFilePath = `${storeFilePath}.tmp`;
    await fs.promises.writeFile(tmpFilePath, JSON.stringify(payload), "utf8");
    await fs.promises.rename(tmpFilePath, storeFilePath);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("store flush failed", error?.message || error);
  } finally {
    flushInFlight = false;
  }
};

const scheduleFlush = () => {
  if (!persistEnabled) return;
  if (pendingFlushTimer) return;
  pendingFlushTimer = setTimeout(async () => {
    pendingFlushTimer = null;
    await flushNow();
  }, Math.max(250, config.storeFlushMs || 2000));
};

export const bootstrapStore = async () => {
  if (!persistEnabled) return;
  try {
    await ensureStoreDirectory();
    if (!fs.existsSync(storeFilePath)) return;
    const raw = await fs.promises.readFile(storeFilePath, "utf8");
    const parsed = JSON.parse(raw);
    applyState(parsed || {});
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("store bootstrap failed", error?.message || error);
  }
};

export const flushStore = async () => {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer);
    pendingFlushTimer = null;
  }
  await flushNow();
};

export const getEntitlementByUser = (appUserId) => {
  if (!appUserId) return null;
  return entitlementByUser.get(appUserId) || null;
};

export const upsertEntitlement = (appUserId, payload) => {
  if (!appUserId) return null;
  const previous = entitlementByUser.get(appUserId) || null;
  const next = {
    ...previous,
    ...payload,
    appUserId,
    updatedAt: new Date().toISOString(),
  };
  entitlementByUser.set(appUserId, next);
  scheduleFlush();
  return next;
};

export const markTransactionSeen = (transactionId, appUserId = "") => {
  if (!transactionId) return;
  seenTransactions.set(transactionId, {
    appUserId,
    seenAt: Date.now(),
  });
  scheduleFlush();
};

export const getSeenTransaction = (transactionId) => {
  if (!transactionId) return null;
  return seenTransactions.get(transactionId) || null;
};

export const getCachedIdempotentResponse = (idempotencyKey) => {
  if (!idempotencyKey) return null;
  return idempotencyCache.get(idempotencyKey) || null;
};

export const cacheIdempotentResponse = (idempotencyKey, responseBody) => {
  if (!idempotencyKey || !responseBody) return;
  idempotencyCache.set(idempotencyKey, responseBody);
};

export const verifyOrRegisterInstallSecret = (installId, installSecret) => {
  const normalizedInstallId = String(installId || "").trim();
  const normalizedSecret = normalizeInstallSecret(installSecret);
  if (!normalizedInstallId || !normalizedSecret) {
    return { ok: false, reason: "missing_install_secret" };
  }
  const nextHash = hashInstallSecret(normalizedSecret);
  const existing = installSecretBindings.get(normalizedInstallId);
  if (!existing?.secretHash) {
    const nowIso = new Date().toISOString();
    installSecretBindings.set(normalizedInstallId, {
      secretHash: nextHash,
      createdAt: nowIso,
      lastSeenAt: nowIso,
    });
    scheduleFlush();
    return { ok: true, registered: true };
  }
  if (!timingSafeEquals(existing.secretHash, nextHash)) {
    return { ok: false, reason: "install_secret_mismatch" };
  }
  installSecretBindings.set(normalizedInstallId, {
    ...existing,
    lastSeenAt: new Date().toISOString(),
  });
  return { ok: true, registered: false };
};
