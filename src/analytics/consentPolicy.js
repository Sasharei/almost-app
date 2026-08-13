const normalizeTrackingStatus = (status) => String(status || "").trim().toLowerCase();

const isTrackingStatusGranted = (status) => {
  const normalized = normalizeTrackingStatus(status);
  return normalized === "granted" || normalized === "authorized";
};

const canEnableMetaAdvertiserTracking = (status) => isTrackingStatusGranted(status);

module.exports = {
  canEnableMetaAdvertiserTracking,
  isTrackingStatusGranted,
  normalizeTrackingStatus,
};
