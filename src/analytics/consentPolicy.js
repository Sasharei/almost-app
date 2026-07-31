const normalizeTrackingStatus = (status) => String(status || "").trim().toLowerCase();

const isTrackingStatusGranted = (status) => {
  const normalized = normalizeTrackingStatus(status);
  return normalized === "granted" || normalized === "authorized";
};

const canEnableMetaAdvertiserTracking = (status) => isTrackingStatusGranted(status);

const shouldWaitForAttPrompt = ({ platform, onboardingComplete, trackingStatus }) => {
  if (platform !== "ios" || onboardingComplete) return false;
  const normalized = normalizeTrackingStatus(trackingStatus);
  return (
    !normalized ||
    normalized === "unknown" ||
    normalized === "undetermined" ||
    normalized === "not-determined"
  );
};

module.exports = {
  canEnableMetaAdvertiserTracking,
  isTrackingStatusGranted,
  normalizeTrackingStatus,
  shouldWaitForAttPrompt,
};
