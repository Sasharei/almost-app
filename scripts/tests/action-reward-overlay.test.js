const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ACTION_REWARD_OVERLAY_GATE_STATUS,
  getActionRewardOverlayGateStatus,
  shouldDeferActionRewardOverlayPresentation,
  shouldDispatchPendingGoalCelebration,
  shouldScheduleActionRewardOverlayRetry,
} = require("../../src/engagement/actionRewardOverlayQueue");

test("a queued action reward becomes ready when the latest modal snapshot clears", () => {
  const runtimeRef = {
    current: {
      overlayEnvironmentReady: true,
      blockingModalVisible: true,
      startupHardLockPendingBeforePaywall: false,
    },
  };

  assert.equal(
    getActionRewardOverlayGateStatus(runtimeRef.current),
    ACTION_REWARD_OVERLAY_GATE_STATUS.BLOCKED
  );

  runtimeRef.current = {
    ...runtimeRef.current,
    blockingModalVisible: false,
  };

  assert.equal(
    getActionRewardOverlayGateStatus(runtimeRef.current),
    ACTION_REWARD_OVERLAY_GATE_STATUS.READY
  );
  assert.equal(
    shouldScheduleActionRewardOverlayRetry({
      queueLength: 1,
      startupHardLockPendingBeforePaywall: false,
    }),
    true
  );
});

test("the reward watchdog stops only for an empty queue or the startup hard lock", () => {
  assert.equal(shouldScheduleActionRewardOverlayRetry({ queueLength: 0 }), false);
  assert.equal(
    shouldScheduleActionRewardOverlayRetry({
      queueLength: 1,
      startupHardLockPendingBeforePaywall: true,
    }),
    false
  );
});

test("the short save reward waits for the current card layout handoff", () => {
  assert.equal(shouldDeferActionRewardOverlayPresentation("save"), true);
  assert.equal(shouldDeferActionRewardOverlayPresentation("health"), false);
  assert.equal(shouldDeferActionRewardOverlayPresentation("reward"), false);
});

test("a goal celebration survives the startup lock and dispatches when the host is ready", () => {
  const pendingCelebrationState = {
    hasPendingGoalCelebration: true,
    startupHardLockPendingBeforePaywall: true,
    overlayEnvironmentReady: false,
  };

  assert.equal(shouldDispatchPendingGoalCelebration(pendingCelebrationState), false);
  assert.equal(
    shouldDispatchPendingGoalCelebration({
      ...pendingCelebrationState,
      startupHardLockPendingBeforePaywall: false,
      overlayEnvironmentReady: true,
    }),
    true
  );
});

test("a pending goal celebration waits behind every active overlay host", () => {
  const readyState = {
    hasPendingGoalCelebration: true,
    overlayEnvironmentReady: true,
  };

  assert.equal(
    shouldDispatchPendingGoalCelebration({ ...readyState, blockingModalVisible: true }),
    false
  );
  assert.equal(
    shouldDispatchPendingGoalCelebration({ ...readyState, overlayQueueLength: 1 }),
    false
  );
  assert.equal(
    shouldDispatchPendingGoalCelebration({ ...readyState, pendingLevelCelebration: true }),
    false
  );
});
