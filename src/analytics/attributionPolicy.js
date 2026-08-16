const INVALID_WRITE_ONCE_VALUES = new Set([
  "",
  "unknown",
  "organic",
  "restricted",
  "null",
  "undefined",
  "00000000-0000-0000-0000-000000000000",
  "00000000000000000000000000000000",
]);

const ATTRIBUTION_FIELDS = Object.freeze([
  "mediaSource",
  "campaign",
  "adGroup",
  "ad",
  "keyword",
  "creative",
]);

const normalizeAttributionValue = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized || INVALID_WRITE_ONCE_VALUES.has(normalized.toLowerCase())) return null;
  if (/^0+$/.test(normalized.replaceAll("-", ""))) return null;
  return normalized;
};

const normalizeAppsFlyerInstallAttribution = (payload = null) => {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  if (!data || typeof data !== "object") return {};
  return {
    mediaSource: normalizeAttributionValue(data.media_source || data.mediaSource),
    campaign: normalizeAttributionValue(data.campaign || data.campaign_name),
    adGroup: normalizeAttributionValue(
      data.af_adset || data.adset || data.adgroup || data.ad_group
    ),
    ad: normalizeAttributionValue(data.af_ad || data.ad || data.ad_name),
    keyword: normalizeAttributionValue(data.af_keywords || data.keyword || data.keywords),
    creative: normalizeAttributionValue(
      data.af_creative_name || data.creative || data.creative_name
    ),
  };
};

const mergeWriteOnceAttribution = (existing = {}, incoming = {}) =>
  ATTRIBUTION_FIELDS.reduce((result, field) => {
    const existingValue = normalizeAttributionValue(existing?.[field]);
    const incomingValue = normalizeAttributionValue(incoming?.[field]);
    if (existingValue) {
      result[field] = existingValue;
    } else if (incomingValue) {
      result[field] = incomingValue;
    }
    return result;
  }, {});

const hasCampaignFields = (attribution = {}) =>
  ATTRIBUTION_FIELDS.some((field) => !!normalizeAttributionValue(attribution?.[field]));

const getElapsedBucket = (elapsedMs) => {
  const normalized = Math.max(0, Number(elapsedMs) || 0);
  if (normalized <= 1500) return "le_1_5s";
  if (normalized <= 5000) return "le_5s";
  if (normalized <= 30000) return "le_30s";
  return "gt_30s";
};

module.exports = {
  ATTRIBUTION_FIELDS,
  INVALID_WRITE_ONCE_VALUES,
  getElapsedBucket,
  hasCampaignFields,
  mergeWriteOnceAttribution,
  normalizeAppsFlyerInstallAttribution,
  normalizeAttributionValue,
};
