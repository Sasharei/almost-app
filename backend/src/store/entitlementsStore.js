import fs from "node:fs";
import path from "node:path";
import { LRUCache } from "lru-cache";
import { config } from "../config.js";

const entitlementByUser = new Map();
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

const serializeState = () => {
  const transactions = [];
  seenTransactions.forEach((value, key) => {
    transactions.push([key, value]);
  });
  return {
    version: STORE_VERSION,
    savedAt: new Date().toISOString(),
    entitlementByUser: Object.fromEntries(entitlementByUser.entries()),
    seenTransactions: transactions,
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
