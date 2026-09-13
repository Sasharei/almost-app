import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { config } from "../config.js";

// SQLite transactions protect identities across restarts and workers on the same host.
// All replicas must use this same local persistent volume (not separate disks/NFS).
export const createEntitlementsStore = ({ databasePath = ":memory:", legacyPath = "" } = {}) => {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true, mode: 0o700 });
    const fd = fs.openSync(databasePath, "a", 0o600);
    fs.closeSync(fd);
    fs.chmodSync(databasePath, 0o600);
  }
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS identities (id TEXT PRIMARY KEY, secret_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, seen_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS entitlements (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS idempotency (id TEXT PRIMARY KEY, payload TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (id TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS metadata (id TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits(expires_at);
    CREATE INDEX IF NOT EXISTS idempotency_expiry ON idempotency(expires_at);`);
  const atomic = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try { const value = fn(); db.exec("COMMIT"); return value; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  };
  if (legacyPath && fs.existsSync(legacyPath)) {
    atomic(() => {
      if (db.prepare("SELECT value FROM metadata WHERE id='legacy_import'").get()) return;
      const data = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
      if (data.version !== 1) throw new Error("unsupported_legacy_store_version");
      for (const [id, value] of Object.entries(data.entitlementByUser || {})) {
        db.prepare("INSERT OR IGNORE INTO entitlements VALUES (?, ?)").run(id, JSON.stringify(value));
      }
      for (const [id, value] of data.installSecretBindings || []) {
        if (id && value?.secretHash) db.prepare("INSERT OR IGNORE INTO identities VALUES (?, ?)").run(id, value.secretHash);
      }
      for (const [id, value] of data.seenTransactions || []) {
        if (id && value?.appUserId) db.prepare("INSERT OR IGNORE INTO transactions VALUES (?, ?, ?)").run(id, value.appUserId, Number(value.seenAt) || Date.now());
      }
      // Preserve ownership references even if they had already aged out of the old replay cache.
      for (const [user, value] of Object.entries(data.entitlementByUser || {})) {
        for (const id of [value.transactionId, value.platform === "ios" ? value.originalTransactionId : null]) {
          if (id) db.prepare("INSERT OR IGNORE INTO transactions VALUES (?, ?, ?)").run(String(id), user, Date.now());
        }
      }
      db.prepare("INSERT INTO metadata VALUES ('legacy_import', '1')").run();
    });
  }
  const getEntitlementByUser = id => {
    const row = db.prepare("SELECT payload FROM entitlements WHERE id=?").get(id || "");
    if (!row) return null;
    const entitlement = JSON.parse(row.payload);
    if (entitlement.expiresDate && !(Date.parse(entitlement.expiresDate) > Date.now())) {
      return { ...entitlement, isPremium: false };
    }
    return entitlement;
  };
  const upsertEntitlement = (id, payload) => {
    if (!id) return null;
    const next = { ...getEntitlementByUser(id), ...payload, appUserId: id, updatedAt: new Date().toISOString() };
    db.prepare("INSERT INTO entitlements VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(id, JSON.stringify(next));
    return next;
  };
  const getSeenTransaction = id => {
    const row = db.prepare("SELECT user_id, seen_at FROM transactions WHERE id=?").get(id || "");
    return row ? { appUserId: row.user_id, seenAt: row.seen_at } : null;
  };
  const markTransactionSeen = (id, user = "") => {
    if (!id || !user) return;
    const existing = getSeenTransaction(id);
    if (existing && existing.appUserId !== user) throw new Error("reused_transaction_other_user");
    db.prepare("INSERT OR IGNORE INTO transactions VALUES (?, ?, ?)").run(id, user, Date.now());
  };
  const commitPurchase = (user, references, payload, { allowTransfer = false } = {}) => atomic(() => {
    const unique = [...new Set(references.filter(Boolean))];
    for (const id of unique) {
      const owner = getSeenTransaction(id)?.appUserId;
      if (owner && owner !== user) {
        if (!allowTransfer) throw new Error("reused_transaction_other_user");
        const previous = getEntitlementByUser(owner);
        if (previous && unique.some(ref => ref === previous.transactionId || ref === previous.originalTransactionId)) {
          upsertEntitlement(owner, { isPremium: false, source: "verified_purchase_transfer" });
        }
      }
      db.prepare("INSERT INTO transactions VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id, seen_at=excluded.seen_at").run(id, user, Date.now());
    }
    return upsertEntitlement(user, payload);
  });
  return {
    getEntitlementByUser, upsertEntitlement, getSeenTransaction, markTransactionSeen, commitPurchase,
    verifyOrRegisterInstallSecret(id, secret) {
      if (!id || !secret) return { ok: false, reason: "missing_install_secret" };
      const hash = crypto.createHash("sha256").update(String(secret).trim()).digest("hex");
      const legacyHash = crypto.createHash("sha256").update(String(secret).trim()).digest("base64url");
      return atomic(() => {
        const existing = db.prepare("SELECT secret_hash FROM identities WHERE id=?").get(id);
        if (!existing) {
          // Losing a credential must not permit takeover of an already known purchase owner.
          if (getEntitlementByUser(id) || db.prepare("SELECT 1 FROM transactions WHERE user_id=? LIMIT 1").get(id)) {
            return { ok: false, reason: "identity_recovery_required" };
          }
          db.prepare("INSERT INTO identities VALUES (?, ?)").run(id, hash);
          return { ok: true, registered: true };
        }
        const expected = Buffer.from(existing.secret_hash);
        const matches = [hash, legacyHash].some(candidate => {
          const actual = Buffer.from(candidate);
          return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
        });
        return matches ? { ok: true, registered: false } : { ok: false, reason: "install_secret_mismatch" };
      });
    },
    reserveIdempotency(key, fingerprint) {
      return atomic(() => {
        db.prepare("DELETE FROM idempotency WHERE expires_at<=?").run(Date.now());
        const row = db.prepare("SELECT payload FROM idempotency WHERE id=?").get(key);
        if (row) return JSON.parse(row.payload);
        db.prepare("INSERT INTO idempotency VALUES (?, ?, ?)").run(key, JSON.stringify({ fingerprint, pending: true }), Date.now() + 60000);
        return null;
      });
    },
    getCachedIdempotentResponse(key) {
      const row = db.prepare("SELECT payload FROM idempotency WHERE id=? AND expires_at>?").get(key || "", Date.now());
      return row ? JSON.parse(row.payload) : null;
    },
    cacheIdempotentResponse(key, payload) {
      db.prepare("DELETE FROM idempotency WHERE expires_at<=?").run(Date.now());
      db.prepare("INSERT INTO idempotency VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, expires_at=excluded.expires_at").run(key, JSON.stringify(payload), Date.now() + config.requestTtlMs);
    },
    consumeRateLimit(key, max, windowMs) {
      return atomic(() => {
        const now = Date.now();
        db.prepare("DELETE FROM rate_limits WHERE expires_at<=?").run(now);
        db.prepare("INSERT INTO rate_limits VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET hits=hits+1").run(key, now + windowMs);
        const row = db.prepare("SELECT hits, expires_at FROM rate_limits WHERE id=?").get(key);
        return { allowed: row.hits <= max, retryAfterMs: row.expires_at - now };
      });
    },
    close: () => db.close(),
  };
};
let store;
const current = () => {
  if (!store) store = createEntitlementsStore({ databasePath: config.databasePath, legacyPath: config.storePath });
  return store;
};
export const bootstrapStore = async () => { current(); };
export const flushStore = async () => {}; // Every security mutation is committed synchronously.
export const getEntitlementByUser = (...args) => current().getEntitlementByUser(...args);
export const upsertEntitlement = (...args) => current().upsertEntitlement(...args);
export const markTransactionSeen = (...args) => current().markTransactionSeen(...args);
export const getSeenTransaction = (...args) => current().getSeenTransaction(...args);
export const commitPurchase = (...args) => current().commitPurchase(...args);
export const verifyOrRegisterInstallSecret = (...args) => current().verifyOrRegisterInstallSecret(...args);
export const getCachedIdempotentResponse = (...args) => current().getCachedIdempotentResponse(...args);
export const cacheIdempotentResponse = (...args) => current().cacheIdempotentResponse(...args);
export const consumeRateLimit = (...args) => current().consumeRateLimit(...args);

export const reserveIdempotency = (...args) => current().reserveIdempotency(...args);
