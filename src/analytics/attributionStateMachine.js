const {
  ATTRIBUTION_FIELDS,
  normalizeAttributionValue,
} = require("./attributionPolicy");

const ATTRIBUTION_STATE_SCHEMA_VERSION = 2;
const ATTRIBUTION_PROVIDER_FIELD = "appsFlyerId";
const REVENUECAT_ATTRIBUTION_FIELDS = Object.freeze([
  ATTRIBUTION_PROVIDER_FIELD,
  ...ATTRIBUTION_FIELDS,
]);
const ATTRIBUTION_DELIVERY_STATES = Object.freeze({
  pending: "pending",
  writtenPendingUpload: "written_pending_upload",
  synced: "synced",
});
const ATTRIBUTION_SYNC_RESULTS = Object.freeze({
  pendingProviderId: "pending_provider_id",
  pendingCampaignFields: "pending_campaign_fields",
  syncedIdOnly: "synced_id_only",
  syncedFull: "synced_full",
  preservedExisting: "preserved_existing",
  failedRetryable: "failed_retryable",
  failedTerminal: "failed_terminal",
});
const RETRYABLE_RESULTS = new Set([
  ATTRIBUTION_SYNC_RESULTS.failedRetryable,
  ATTRIBUTION_SYNC_RESULTS.pendingCampaignFields,
]);
const DEFAULT_RETRY_BASE_MS = 1_000;
const DEFAULT_RETRY_MAX_MS = 5 * 60 * 1_000;

const normalizeTimestamp = (value, fallback = null) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
};

const normalizeSource = (value, fallback = "unknown") => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const normalizeDeliveryState = (value) => {
  const normalized = String(value || "").trim();
  return Object.values(ATTRIBUTION_DELIVERY_STATES).includes(normalized)
    ? normalized
    : ATTRIBUTION_DELIVERY_STATES.pending;
};

const createEmptyAttributionRecord = () => ({
  schemaVersion: ATTRIBUTION_STATE_SCHEMA_VERSION,
  receivedAt: null,
  source: null,
  updatedAt: null,
  fields: {},
  retry: {
    attempt: 0,
    nextRetryAt: null,
    lastResult: null,
  },
});

const normalizeFieldRecord = (field, value, fallback = {}) => {
  const normalizedValue = normalizeAttributionValue(value ?? fallback?.value);
  if (!normalizedValue) return null;
  return {
    value: normalizedValue,
    receivedAt: normalizeTimestamp(fallback?.receivedAt, null),
    source: normalizeSource(fallback?.source, "unknown"),
    delivery: normalizeDeliveryState(fallback?.delivery),
  };
};

const normalizeAttributionRecord = (value = null) => {
  const empty = createEmptyAttributionRecord();
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const normalized = {
    ...empty,
    receivedAt: normalizeTimestamp(value.receivedAt, null),
    source: value.source ? normalizeSource(value.source) : null,
    updatedAt: normalizeTimestamp(value.updatedAt, null),
    retry: {
      attempt: Math.max(0, Number(value?.retry?.attempt) || 0),
      nextRetryAt: normalizeTimestamp(value?.retry?.nextRetryAt, null),
      lastResult: value?.retry?.lastResult
        ? normalizeSource(value.retry.lastResult)
        : null,
    },
  };
  const fieldContainer =
    value.schemaVersion === ATTRIBUTION_STATE_SCHEMA_VERSION && value.fields
      ? value.fields
      : value;
  REVENUECAT_ATTRIBUTION_FIELDS.forEach((field) => {
    const rawField = fieldContainer?.[field];
    const rawValue =
      rawField && typeof rawField === "object" && !Array.isArray(rawField)
        ? rawField.value
        : rawField;
    const fieldRecord = normalizeFieldRecord(
      field,
      rawValue,
      rawField && typeof rawField === "object" ? rawField : {}
    );
    if (fieldRecord) normalized.fields[field] = fieldRecord;
  });
  const receivedTimes = Object.values(normalized.fields)
    .map((field) => normalizeTimestamp(field.receivedAt, null))
    .filter(Boolean);
  if (!normalized.receivedAt && receivedTimes.length) {
    normalized.receivedAt = Math.min(...receivedTimes);
  }
  return normalized;
};

const mergeAttributionRecord = (
  existing,
  incoming = {},
  { now = Date.now(), source = "unknown" } = {}
) => {
  const record = normalizeAttributionRecord(existing);
  const receivedAt = normalizeTimestamp(now, Date.now());
  const normalizedSource = normalizeSource(source);
  let changed = false;

  REVENUECAT_ATTRIBUTION_FIELDS.forEach((field) => {
    if (record.fields[field]?.value) return;
    const normalizedValue = normalizeAttributionValue(incoming?.[field]);
    if (!normalizedValue) return;
    record.fields[field] = {
      value: normalizedValue,
      receivedAt,
      source: normalizedSource,
      delivery: ATTRIBUTION_DELIVERY_STATES.pending,
    };
    changed = true;
  });

  if (changed) {
    record.receivedAt = record.receivedAt || receivedAt;
    record.source = record.source || normalizedSource;
    record.updatedAt = receivedAt;
  }
  return record;
};

const getAttributionPayload = (record) => {
  const normalized = normalizeAttributionRecord(record);
  return REVENUECAT_ATTRIBUTION_FIELDS.reduce((result, field) => {
    const value = normalizeAttributionValue(normalized.fields[field]?.value);
    if (value) result[field] = value;
    return result;
  }, {});
};

const getAttributionDelivery = (record) => {
  const normalized = normalizeAttributionRecord(record);
  return REVENUECAT_ATTRIBUTION_FIELDS.reduce((result, field) => {
    const fieldRecord = normalized.fields[field];
    if (fieldRecord?.value) {
      result[field] = normalizeDeliveryState(fieldRecord.delivery);
    }
    return result;
  }, {});
};

const hasCampaignPayload = (payload = {}) =>
  ATTRIBUTION_FIELDS.some((field) => !!normalizeAttributionValue(payload?.[field]));

const computeAttributionRetryDelayMs = (
  attempt,
  random = Math.random,
  { baseMs = DEFAULT_RETRY_BASE_MS, maxMs = DEFAULT_RETRY_MAX_MS } = {}
) => {
  const normalizedAttempt = Math.max(1, Number(attempt) || 1);
  const exponential = Math.min(maxMs, baseMs * 2 ** (normalizedAttempt - 1));
  const randomValue = Math.min(1, Math.max(0, Number(random?.()) || 0));
  const jitterMultiplier = 0.75 + randomValue * 0.5;
  return Math.max(baseMs, Math.min(maxMs, Math.round(exponential * jitterMultiplier)));
};

const applyAttributionSyncResult = (
  record,
  result = {},
  { now = Date.now(), random = Math.random } = {}
) => {
  const normalized = normalizeAttributionRecord(record);
  const timestamp = normalizeTimestamp(now, Date.now());
  Object.entries(result?.fieldDelivery || {}).forEach(([field, delivery]) => {
    if (!REVENUECAT_ATTRIBUTION_FIELDS.includes(field)) return;
    if (!normalized.fields[field]?.value) return;
    normalized.fields[field] = {
      ...normalized.fields[field],
      delivery: normalizeDeliveryState(delivery),
    };
  });
  const status = Object.values(ATTRIBUTION_SYNC_RESULTS).includes(result?.status)
    ? result.status
    : ATTRIBUTION_SYNC_RESULTS.failedRetryable;
  const shouldRetry = RETRYABLE_RESULTS.has(status);
  const attempt = shouldRetry
    ? Math.max(0, Number(normalized.retry?.attempt) || 0) + 1
    : 0;
  normalized.retry = {
    attempt,
    nextRetryAt: shouldRetry
      ? timestamp + computeAttributionRetryDelayMs(attempt, random)
      : null,
    lastResult: status,
  };
  normalized.updatedAt = timestamp;
  return normalized;
};

const buildPublicSyncResult = (record, result = {}, extra = {}) => {
  const payload = getAttributionPayload(record);
  const status = Object.values(ATTRIBUTION_SYNC_RESULTS).includes(result?.status)
    ? result.status
    : ATTRIBUTION_SYNC_RESULTS.failedRetryable;
  return {
    schemaVersion: ATTRIBUTION_STATE_SCHEMA_VERSION,
    status,
    ok:
      status === ATTRIBUTION_SYNC_RESULTS.syncedIdOnly ||
      status === ATTRIBUTION_SYNC_RESULTS.syncedFull,
    confirmed: result?.confirmed === true,
    hasProviderId: !!payload.appsFlyerId,
    hasCampaignFields: hasCampaignPayload(payload),
    didWriteAppsFlyerId: result?.didWriteAppsFlyerId === true,
    previouslyWrittenAppsFlyerId: result?.previouslyWrittenAppsFlyerId === true,
    preservedExistingCustomer: result?.preservedExistingCustomer === true,
    fieldsSet: Array.isArray(result?.fieldsSet) ? [...result.fieldsSet] : [],
    failedFields: Array.isArray(result?.failedFields) ? [...result.failedFields] : [],
    skippedFields: Array.isArray(result?.skippedFields) ? [...result.skippedFields] : [],
    attributesSynced: result?.attributesSynced === true,
    retryAttempt: Math.max(0, Number(record?.retry?.attempt) || 0),
    retryAt: normalizeTimestamp(record?.retry?.nextRetryAt, null),
    ...extra,
  };
};

const createAttributionStateMachine = ({
  storage,
  storageKey,
  legacyStorageKey = null,
  legacyDeliveryKeyForField = null,
  unsafeLegacyConfirmationKeys = [],
  syncAttribution,
  now = () => Date.now(),
  random = Math.random,
} = {}) => {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    throw new Error("Attribution state machine requires async storage");
  }
  if (!storageKey) throw new Error("Attribution state machine requires a storage key");
  if (typeof syncAttribution !== "function") {
    throw new Error("Attribution state machine requires a sync executor");
  }

  let operationQueue = Promise.resolve();
  let unsafeLegacyKeysCleaned = false;
  const enqueue = (task) => {
    const active = operationQueue.catch(() => {}).then(task);
    operationQueue = active.then(
      () => undefined,
      () => undefined
    );
    return active;
  };

  const persist = async (record) => {
    const normalized = normalizeAttributionRecord(record);
    await storage.setItem(storageKey, JSON.stringify(normalized));
    return normalized;
  };

  const hydrateLegacyDelivery = async (record) => {
    if (typeof legacyDeliveryKeyForField !== "function") return record;
    for (const field of REVENUECAT_ATTRIBUTION_FIELDS) {
      if (!record.fields[field]?.value) continue;
      if (
        record.fields[field].delivery !== ATTRIBUTION_DELIVERY_STATES.pending
      ) {
        continue;
      }
      try {
        if ((await storage.getItem(legacyDeliveryKeyForField(field))) === "1") {
          record.fields[field].delivery =
            ATTRIBUTION_DELIVERY_STATES.writtenPendingUpload;
        }
      } catch (_error) {}
    }
    return record;
  };

  const load = async () => {
    if (!unsafeLegacyKeysCleaned && typeof storage.removeItem === "function") {
      await Promise.all(
        unsafeLegacyConfirmationKeys.map(async (key) => {
          try {
            await storage.removeItem(key);
          } catch (_error) {}
        })
      );
      unsafeLegacyKeysCleaned = true;
    }
    const raw = await storage.getItem(storageKey);
    if (raw) {
      try {
        return normalizeAttributionRecord(JSON.parse(raw));
      } catch (_error) {}
    }

    let record = createEmptyAttributionRecord();
    if (legacyStorageKey) {
      try {
        const legacyRaw = await storage.getItem(legacyStorageKey);
        if (legacyRaw) {
          record = mergeAttributionRecord(record, JSON.parse(legacyRaw), {
            now: now(),
            source: "legacy_first_touch",
          });
        }
      } catch (_error) {}
    }
    await hydrateLegacyDelivery(record);
    await persist(record);
    return record;
  };

  const merge = (incoming = {}, options = {}) =>
    enqueue(async () => {
      const record = await load();
      const merged = mergeAttributionRecord(record, incoming, {
        now: now(),
        source: options.source,
      });
      await hydrateLegacyDelivery(merged);
      await persist(merged);
      return getAttributionPayload(merged);
    });

  const readPayload = () => enqueue(async () => getAttributionPayload(await load()));

  const sync = (incoming = {}, options = {}) =>
    enqueue(async () => {
      let record;
      try {
        record = await load();
        record = mergeAttributionRecord(record, incoming, {
          now: now(),
          source: options.source,
        });
        await hydrateLegacyDelivery(record);
        await persist(record);
      } catch (_error) {
        return buildPublicSyncResult(createEmptyAttributionRecord(), {
          status: ATTRIBUTION_SYNC_RESULTS.failedRetryable,
        }, { storageAvailable: false });
      }

      const timestamp = now();
      const retryAt = normalizeTimestamp(record?.retry?.nextRetryAt, null);
      if (!options.force && retryAt && retryAt > timestamp) {
        return buildPublicSyncResult(record, {
          status: ATTRIBUTION_SYNC_RESULTS.failedRetryable,
          confirmed:
            getAttributionDelivery(record).appsFlyerId ===
              ATTRIBUTION_DELIVERY_STATES.synced ||
            getAttributionDelivery(record).appsFlyerId ===
              ATTRIBUTION_DELIVERY_STATES.writtenPendingUpload,
        }, { retryDeferred: true });
      }

      let result;
      try {
        result = await syncAttribution({
          attribution: getAttributionPayload(record),
          delivery: getAttributionDelivery(record),
        });
      } catch (_error) {
        result = { status: ATTRIBUTION_SYNC_RESULTS.failedRetryable };
      }
      record = applyAttributionSyncResult(record, result, {
        now: timestamp,
        random,
      });
      try {
        await persist(record);
      } catch (_error) {
        return buildPublicSyncResult(record, {
          ...result,
          status: ATTRIBUTION_SYNC_RESULTS.failedRetryable,
          confirmed: false,
        }, { storageAvailable: false });
      }
      return buildPublicSyncResult(record, result, { storageAvailable: true });
    });

  return Object.freeze({
    merge,
    readPayload,
    sync,
  });
};

module.exports = {
  ATTRIBUTION_DELIVERY_STATES,
  ATTRIBUTION_PROVIDER_FIELD,
  ATTRIBUTION_STATE_SCHEMA_VERSION,
  ATTRIBUTION_SYNC_RESULTS,
  REVENUECAT_ATTRIBUTION_FIELDS,
  applyAttributionSyncResult,
  computeAttributionRetryDelayMs,
  createAttributionStateMachine,
  createEmptyAttributionRecord,
  getAttributionDelivery,
  getAttributionPayload,
  mergeAttributionRecord,
  normalizeAttributionRecord,
};
