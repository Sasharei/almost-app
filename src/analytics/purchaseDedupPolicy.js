const readPurchaseIds = async ({ storage, storageKey }) => {
  try {
    const raw = await storage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value || "").trim()).filter(Boolean);
  } catch (_error) {
    return [];
  }
};

const persistPurchaseId = async ({
  storage,
  storageKey,
  transactionId,
  previousIds,
  maxIds,
}) => {
  const nextIds = [
    ...previousIds.filter((value) => value !== transactionId),
    transactionId,
  ].slice(-Math.max(1, Number(maxIds) || 1));
  try {
    await storage.setItem(storageKey, JSON.stringify(nextIds));
    return true;
  } catch (_error) {
    return false;
  }
};

const runDeduplicatedPurchase = async ({
  storage,
  storageKey,
  maxIds = 200,
  transactionId,
  emit,
} = {}) => {
  const normalizedTransactionId = String(transactionId || "").trim();
  if (!normalizedTransactionId) {
    return { ok: false, reason: "missing_transaction_id" };
  }
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    return { ok: false, reason: "storage_unavailable" };
  }
  if (typeof emit !== "function") return { ok: false, reason: "emitter_unavailable" };
  const previousIds = await readPurchaseIds({ storage, storageKey });
  if (previousIds.includes(normalizedTransactionId)) {
    return { ok: true, duplicate: true, transactionId: normalizedTransactionId };
  }
  await emit();
  const dedupPersisted = await persistPurchaseId({
    storage,
    storageKey,
    transactionId: normalizedTransactionId,
    previousIds,
    maxIds,
  });
  return {
    ok: true,
    duplicate: false,
    dedupPersisted,
    transactionId: normalizedTransactionId,
  };
};

module.exports = {
  persistPurchaseId,
  readPurchaseIds,
  runDeduplicatedPurchase,
};
