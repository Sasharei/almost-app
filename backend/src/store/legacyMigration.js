// Validate the complete legacy snapshot before opening a write transaction.
// IDs and purchase references are deliberately absent from errors and reports.
export const inspectLegacySnapshot = (data, ownershipResolutions = new Map()) => {
  const fail = reason => { throw new Error(`legacy_migration_${reason}`); };
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  const id = value => typeof value === "string" && value.trim().length > 0;
  if (!object(data) || data.version !== 1) fail("unsupported_version");
  if (!object(data.entitlementByUser)) fail("invalid_entitlements");
  // Early v1 stores predate install-secret bindings; absence means no credentials.
  const bindings = data.installSecretBindings === undefined ? [] : data.installSecretBindings;
  if (!Array.isArray(bindings) || !Array.isArray(data.seenTransactions)) fail("invalid_collections");
  const identities = new Map();
  for (const pair of bindings) {
    if (!Array.isArray(pair) || pair.length !== 2) fail("invalid_identity");
    const [key, value] = pair;
    if (!id(key) || !object(value) || !/^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{43})$/.test(value.secretHash || "")) fail("invalid_identity");
    if (identities.has(key) && identities.get(key) !== value.secretHash) fail("conflicting_identity");
    identities.set(key, value.secretHash);
  }
  const transactions = new Map();
  const claims = new Map();
  const addTransaction = (key, owner, seenAt) => {
    if (!id(key) || !id(owner)) fail("invalid_transaction");
    if (!claims.has(key)) claims.set(key, new Set());
    claims.get(key).add(owner);
    if (!transactions.has(key)) transactions.set(key, { appUserId: owner, seenAt });
  };
  for (const pair of data.seenTransactions) {
    if (!Array.isArray(pair) || pair.length !== 2 || !object(pair[1])) fail("invalid_transaction");
    const [key, value] = pair;
    if (!Number.isFinite(value.seenAt) || value.seenAt < 0) fail("invalid_transaction_timestamp");
    addTransaction(key, value.appUserId, value.seenAt);
  }
  const entitlements = Object.entries(data.entitlementByUser);
  for (const [key, value] of entitlements) {
    if (!id(key) || !object(value) || (value.appUserId != null && value.appUserId !== key)) fail("invalid_entitlement");
    if (typeof value.isPremium !== "boolean") fail("invalid_premium_state");
    for (const reference of [value.transactionId, value.platform === "ios" ? value.originalTransactionId : null]) {
      if (reference != null && reference !== "") addTransaction(String(reference), key, 0);
    }
  }
  let resolvedOwnershipConflicts = 0;
  for (const [key, owners] of claims) {
    if (owners.size <= 1) {
      if (ownershipResolutions.has(key)) fail("unnecessary_ownership_resolution");
      continue;
    }
    const verifiedOwner = ownershipResolutions.get(key);
    if (!id(verifiedOwner)) fail("conflicting_transaction_owner");
    transactions.get(key).appUserId = verifiedOwner;
    resolvedOwnershipConflicts++;
  }
  if ([...ownershipResolutions.keys()].some(key => !claims.has(key))) fail("unknown_ownership_resolution");
  const knownUsers = new Set([...entitlements.map(([key]) => key), ...[...transactions.values()].map(value => value.appUserId)]);
  const unbound = [...knownUsers].filter(key => !identities.has(key));
  return { entitlements, identities, transactions, summary: {
    resolvedOwnershipConflicts,
    entitlements: entitlements.length, identities: identities.size, transactions: transactions.size,
    knownUsers: knownUsers.size, unboundUsers: unbound.length,
    // Raw Premium flags are preserved, not treated as proof of an active subscription.
    storedPremiumFlags: entitlements.filter(([, value]) => value.isPremium).length,
    readyForStrictAuthCutover: unbound.length === 0,
  } };
};

export const importLegacySnapshot = (db, data, ownershipResolutions = new Map()) => {
  const snapshot = inspectLegacySnapshot(data, ownershipResolutions);
  for (const [key, value] of snapshot.entitlements) {
    const existing = db.prepare("SELECT payload FROM entitlements WHERE id=?").get(key);
    if (existing && existing.payload !== JSON.stringify(value)) throw new Error("legacy_migration_existing_entitlement_conflict");
    db.prepare("INSERT OR IGNORE INTO entitlements VALUES (?, ?)").run(key, JSON.stringify(value));
  }
  for (const [key, hash] of snapshot.identities) {
    const existing = db.prepare("SELECT secret_hash FROM identities WHERE id=?").get(key);
    if (existing && existing.secret_hash !== hash) throw new Error("legacy_migration_existing_identity_conflict");
    db.prepare("INSERT OR IGNORE INTO identities VALUES (?, ?)").run(key, hash);
  }
  for (const [key, value] of snapshot.transactions) {
    const existing = db.prepare("SELECT user_id FROM transactions WHERE id=?").get(key);
    if (existing && existing.user_id !== value.appUserId) throw new Error("legacy_migration_existing_transaction_conflict");
    db.prepare("INSERT OR IGNORE INTO transactions VALUES (?, ?, ?)").run(key, value.appUserId, value.seenAt);
  }
  return snapshot.summary;
};
