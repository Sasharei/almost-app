const ACTION_REWARD_OVERLAY_GATE_STATUS = Object.freeze({
  READY: "ready",
  BLOCKED: "blocked",
  STARTUP_LOCKED: "startup_locked",
});

const getActionRewardOverlayGateStatus = ({
  startupHardLockPendingBeforePaywall = false,
  overlayEnvironmentReady = false,
  blockingModalVisible = false,
  force = false,
} = {}) => {
  if (startupHardLockPendingBeforePaywall) {
    return ACTION_REWARD_OVERLAY_GATE_STATUS.STARTUP_LOCKED;
  }
  if ((!overlayEnvironmentReady || blockingModalVisible) && !force) {
    return ACTION_REWARD_OVERLAY_GATE_STATUS.BLOCKED;
  }
  return ACTION_REWARD_OVERLAY_GATE_STATUS.READY;
};

const shouldScheduleActionRewardOverlayRetry = ({
  queueLength = 0,
  startupHardLockPendingBeforePaywall = false,
} = {}) =>
  Math.max(0, Number(queueLength) || 0) > 0 &&
  !startupHardLockPendingBeforePaywall;

const shouldDeferActionRewardOverlayPresentation = (type) => type === "save";

module.exports = {
  ACTION_REWARD_OVERLAY_GATE_STATUS,
  getActionRewardOverlayGateStatus,
  shouldDeferActionRewardOverlayPresentation,
  shouldScheduleActionRewardOverlayRetry,
};
