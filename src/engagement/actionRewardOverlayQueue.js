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

const shouldDispatchPendingGoalCelebration = ({
  hasPendingGoalCelebration = false,
  startupHardLockPendingBeforePaywall = false,
  overlayEnvironmentReady = false,
  blockingModalVisible = false,
  overlayVisible = false,
  overlayActive = false,
  overlayQueueLength = 0,
  celebrationQueueLength = 0,
  pendingLevelCelebration = false,
} = {}) =>
  Boolean(hasPendingGoalCelebration) &&
  !startupHardLockPendingBeforePaywall &&
  overlayEnvironmentReady &&
  !blockingModalVisible &&
  !overlayVisible &&
  !overlayActive &&
  Math.max(0, Number(overlayQueueLength) || 0) === 0 &&
  Math.max(0, Number(celebrationQueueLength) || 0) === 0 &&
  !pendingLevelCelebration;

module.exports = {
  ACTION_REWARD_OVERLAY_GATE_STATUS,
  getActionRewardOverlayGateStatus,
  shouldDeferActionRewardOverlayPresentation,
  shouldDispatchPendingGoalCelebration,
  shouldScheduleActionRewardOverlayRetry,
};
