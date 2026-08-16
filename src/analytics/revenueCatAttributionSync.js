const {
  ATTRIBUTION_DELIVERY_STATES,
  ATTRIBUTION_PROVIDER_FIELD,
  ATTRIBUTION_SYNC_RESULTS,
  REVENUECAT_ATTRIBUTION_FIELDS,
} = require("./attributionStateMachine");
const {
  ATTRIBUTION_FIELDS,
  normalizeAttributionValue,
} = require("./attributionPolicy");

const REVENUECAT_CUSTOMER_STATES = Object.freeze({
  writable: "writable",
  preserve: "preserve",
  unavailable: "unavailable",
});

const isPreviouslyWritten = (delivery) =>
  delivery === ATTRIBUTION_DELIVERY_STATES.writtenPendingUpload ||
  delivery === ATTRIBUTION_DELIVERY_STATES.synced;

const createBaseResult = (delivery = {}) => ({
  schemaVersion: 2,
  status: ATTRIBUTION_SYNC_RESULTS.failedRetryable,
  ok: false,
  confirmed: false,
  didWriteAppsFlyerId: false,
  previouslyWrittenAppsFlyerId: isPreviouslyWritten(
    delivery?.[ATTRIBUTION_PROVIDER_FIELD]
  ),
  preservedExistingCustomer: false,
  fieldsSet: [],
  failedFields: [],
  skippedFields: [],
  attributesSynced: false,
  uploadFailed: false,
  fieldDelivery: { ...delivery },
});

const resolveSyncStatus = ({ attribution, fieldDelivery, failedFields, uploadFailed }) => {
  const hasProviderId = !!normalizeAttributionValue(attribution?.appsFlyerId);
  if (!hasProviderId) return ATTRIBUTION_SYNC_RESULTS.pendingProviderId;
  const providerDelivery = fieldDelivery?.appsFlyerId;
  if (!isPreviouslyWritten(providerDelivery)) {
    return ATTRIBUTION_SYNC_RESULTS.failedRetryable;
  }
  if (uploadFailed) return ATTRIBUTION_SYNC_RESULTS.failedRetryable;
  const campaignFields = ATTRIBUTION_FIELDS.filter((field) =>
    normalizeAttributionValue(attribution?.[field])
  );
  if (!campaignFields.length) return ATTRIBUTION_SYNC_RESULTS.syncedIdOnly;
  const hasPendingCampaign = campaignFields.some(
    (field) => fieldDelivery?.[field] !== ATTRIBUTION_DELIVERY_STATES.synced
  );
  if (hasPendingCampaign || failedFields.some((field) => campaignFields.includes(field))) {
    return ATTRIBUTION_SYNC_RESULTS.pendingCampaignFields;
  }
  return ATTRIBUTION_SYNC_RESULTS.syncedFull;
};

const syncRevenueCatAttribution = async ({
  attribution = {},
  delivery = {},
  customerState = REVENUECAT_CUSTOMER_STATES.unavailable,
  setters = {},
  syncAttributes = null,
} = {}) => {
  const result = createBaseResult(delivery);
  const normalizedAttribution = REVENUECAT_ATTRIBUTION_FIELDS.reduce((values, field) => {
    const value = normalizeAttributionValue(attribution?.[field]);
    if (value) values[field] = value;
    return values;
  }, {});

  if (!Object.keys(normalizedAttribution).length) {
    return {
      ...result,
      status: ATTRIBUTION_SYNC_RESULTS.pendingProviderId,
    };
  }

  if (customerState === REVENUECAT_CUSTOMER_STATES.unavailable) {
    return result;
  }

  if (customerState === REVENUECAT_CUSTOMER_STATES.preserve) {
    result.preservedExistingCustomer = true;
    result.confirmed = result.previouslyWrittenAppsFlyerId;
    result.skippedFields = REVENUECAT_ATTRIBUTION_FIELDS.filter(
      (field) => !!normalizedAttribution[field]
    );
    const pendingUploadFields = REVENUECAT_ATTRIBUTION_FIELDS.filter(
      (field) =>
        normalizedAttribution[field] &&
        result.fieldDelivery[field] ===
          ATTRIBUTION_DELIVERY_STATES.writtenPendingUpload
    );
    if (pendingUploadFields.length && typeof syncAttributes === "function") {
      try {
        await syncAttributes();
        pendingUploadFields.forEach((field) => {
          result.fieldDelivery[field] = ATTRIBUTION_DELIVERY_STATES.synced;
        });
        result.attributesSynced = true;
      } catch (_error) {
        result.uploadFailed = true;
        result.status = ATTRIBUTION_SYNC_RESULTS.failedRetryable;
        return result;
      }
    }
    result.status = ATTRIBUTION_SYNC_RESULTS.preservedExisting;
    result.ok = false;
    return result;
  }

  for (const field of REVENUECAT_ATTRIBUTION_FIELDS) {
    const value = normalizedAttribution[field];
    if (!value) continue;
    const previousDelivery = result.fieldDelivery[field];
    if (isPreviouslyWritten(previousDelivery)) {
      result.skippedFields.push(field);
      continue;
    }
    const setter = setters?.[field];
    if (typeof setter !== "function") {
      result.failedFields.push(field);
      continue;
    }
    try {
      await setter(value);
      result.fieldsSet.push(field);
      result.fieldDelivery[field] =
        ATTRIBUTION_DELIVERY_STATES.writtenPendingUpload;
      if (field === ATTRIBUTION_PROVIDER_FIELD) {
        result.didWriteAppsFlyerId = true;
      }
    } catch (_error) {
      result.failedFields.push(field);
    }
  }

  const writtenPendingUploadFields = REVENUECAT_ATTRIBUTION_FIELDS.filter(
    (field) =>
      normalizedAttribution[field] &&
      result.fieldDelivery[field] ===
        ATTRIBUTION_DELIVERY_STATES.writtenPendingUpload
  );
  let uploadFailed = false;
  if (writtenPendingUploadFields.length) {
    if (typeof syncAttributes === "function") {
      try {
        await syncAttributes();
        writtenPendingUploadFields.forEach((field) => {
          result.fieldDelivery[field] = ATTRIBUTION_DELIVERY_STATES.synced;
        });
        result.attributesSynced = true;
      } catch (_error) {
        uploadFailed = true;
        result.uploadFailed = true;
      }
    } else {
      uploadFailed = true;
      result.uploadFailed = true;
    }
  }

  result.previouslyWrittenAppsFlyerId =
    result.previouslyWrittenAppsFlyerId && !result.didWriteAppsFlyerId;
  result.confirmed =
    result.didWriteAppsFlyerId ||
    isPreviouslyWritten(result.fieldDelivery[ATTRIBUTION_PROVIDER_FIELD]);
  result.status = resolveSyncStatus({
    attribution: normalizedAttribution,
    fieldDelivery: result.fieldDelivery,
    failedFields: result.failedFields,
    uploadFailed,
  });
  result.ok =
    result.status === ATTRIBUTION_SYNC_RESULTS.syncedIdOnly ||
    result.status === ATTRIBUTION_SYNC_RESULTS.syncedFull;
  return result;
};

module.exports = {
  REVENUECAT_CUSTOMER_STATES,
  isPreviouslyWritten,
  syncRevenueCatAttribution,
};
