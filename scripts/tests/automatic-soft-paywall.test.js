const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.join(__dirname, "../../App.js"), "utf8");
const effectsStart = appSource.indexOf("  // The first committed save/spend");
const effectsEnd = appSource.indexOf(
  '  useEffect(() => {\n    if (!isMonetizationExperimentControlGroup) return;\n    const completedCount',
  effectsStart
);
assert.ok(effectsStart > 0 && effectsEnd > effectsStart);
const effectsSource = appSource.slice(effectsStart, effectsEnd);
const decisionStart = appSource.indexOf("    (item, action, rewardCoins", appSource.indexOf("const registerTemptationSeriesAction ="));
const decisionEnd = appSource.indexOf("      const temptationId", decisionStart);
const decisionSource = `recordDecision = ${appSource.slice(decisionStart, decisionEnd)} };`;

// Execute the app's real decision trigger and effects with controlled modal
// readiness and timers; React/native SDKs are unnecessary for these transitions.
const createSession = (overrides = {}) => {
  let effects = [];
  const timers = new Map();
  const opened = [];
  let nextTimer = 1;
  const context = vm.createContext({
    automaticSoftPaywallDecisionRecorded: false,
    automaticSoftPaywallShownThisSessionRef: { current: false },
    premiumSoftPaywallCheckTimerRef: { current: null },
    premiumSoftPaywallPending: false,
    premiumSoftPaywallShown: true, // Legacy history must not suppress a new session.
    premiumStateCacheHydrated: true,
    premiumState: { isPremium: false },
    premiumPaywallState: { visible: false },
    isMonetizationSoftPaywallExperimentGroup: true,
    onboardingStep: "done",
    interfaceReady: true,
    savedTotalUSD: 12,
    AUTOMATIC_SOFT_PAYWALL_TRIGGER: "first_action_after_onboarding",
    normalizeMonetizationToken: (value) => value,
    appStateRef: { current: "active" },
    startupHardLockPendingBeforePaywall: false,
    automaticModalPresentationPausedRef: { current: false },
    temptationSeriesModalVisible: false,
    firstSaveGoalJarStatusRef: { current: "idle" },
    firstSaveGoalJarVisible: false,
    ratingPromptQueuedRef: { current: false },
    isStoreReviewHandoffPending: () => false,
    blockingModalVisiblePrevRef: { current: false },
    blockingModalVisible: false,
    tutorialBlockingVisiblePrevRef: { current: false },
    tutorialBlockingVisible: false,
    pendingFrequencyReminderPrompt: null,
    frequencyReminderPriorityLockRef: { current: false },
    frequencyReminderPrompt: { visible: false },
    getModalCloseSettleRemainingMs: () => context.settleRemainingMs || 0,
    queuedModalType: null,
    queuedModalActiveRef: { current: false },
    queuedModalQueueRef: { current: [] },
    canShowQueuedModalRef: { current: () => false },
    coinValueModalVisible: false,
    overlay: null,
    overlayActiveRef: { current: false },
    pendingUsageStreakRef: { current: null },
    pendingGoalCelebration: null,
    pendingLevelCelebrationRef: { current: null },
    overlayQueueRef: { current: [] },
    celebrationQueueRef: { current: [] },
    celebrationGapTimerRef: { current: null },
    lastSaveActionAtRef: { current: 0 },
    lastSaveOverlayDismissedAtRef: { current: 0 },
    lastOverlayDismissedAtRef: { current: 0 },
    ready: true,
    openSucceeds: true,
    canShowSoftPaywallNow: () => context.ready && context.presentationGuard(),
    openPremiumPaywall: (options) => {
      if (!context.openSucceeds) return false;
      opened.push(options);
      return true;
    },
    recordRatingPromptDecisionAction: () => {},
    setAutomaticSoftPaywallDecisionRecorded: (value) => { context.automaticSoftPaywallDecisionRecorded = value; },
    setPremiumSoftPaywallPending: (value) => { context.premiumSoftPaywallPending = value; },
    setPremiumSoftPaywallShown: (value) => { context.premiumSoftPaywallShown = value; },
    logMonetizationEvent: () => {},
    useEffect: (effect) => { effects.push(effect); },
    setTimeout: (callback) => { const id = nextTimer++; timers.set(id, callback); return id; },
    clearTimeout: (id) => timers.delete(id),
    ...overrides,
  });
  context.useCallback = (callback) => callback;
  const guardStart = appSource.indexOf("  const canShowSoftPaywallNow = useCallback(");
  const guardEnd = appSource.indexOf("  const canShowFirstSaveGoalJarNow =", guardStart);
  // Rename the app callback to leave the harness wrapper accessible to effects.
  const guardSource = appSource.slice(guardStart, guardEnd).replace(
    "const canShowSoftPaywallNow =", "const actualPresentationGuard ="
  );
  vm.runInContext(`${guardSource}; presentationGuard = actualPresentationGuard;`, context);
  vm.runInContext(decisionSource, context);
  return {
    context, opened, timers,
    decide: (action) => context.recordDecision({}, action),
    render: () => {
      effects = [];
      vm.runInContext(effectsSource, context);
      return effects.map((effect) => effect());
    },
    retry: () => {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((callback) => callback());
    },
  };
};

test("opening the app and non-decision card actions never queue an automatic paywall", () => {
  const session = createSession();
  session.render();
  ["pause", "skip", "archive"].forEach((action) => {
    session.decide(action);
    session.render();
  });
  assert.equal(session.opened.length, 0);
  assert.equal(session.timers.size, 0);
});

for (const action of ["save", "spend"]) {
  test(`the first ${action} queues a soft paywall without waiting for another action or series`, () => {
    const session = createSession();
    session.decide(action);
    session.render();
    assert.equal(session.opened.length, 1);
    assert.equal(session.opened[0].kind, "soft");
    assert.equal(session.opened[0].dismissible, true);
    assert.equal(session.context.premiumSoftPaywallPending, false);
  });
}

test("rewards and congratulations finish before the queued paywall opens", () => {
  const session = createSession({ ready: false });
  session.decide("save");
  session.render();
  session.retry();
  session.retry();
  assert.equal(session.opened.length, 0);
  session.context.ready = true;
  session.retry();
  assert.equal(session.opened.length, 1);
});

test("failed opening is retried and only a successful opening consumes the session", () => {
  const session = createSession({ openSucceeds: false });
  session.decide("spend");
  session.render();
  assert.equal(session.context.automaticSoftPaywallShownThisSessionRef.current, false);
  session.context.openSucceeds = true;
  session.retry();
  session.decide("save");
  session.render();
  session.retry();
  assert.equal(session.opened.length, 1);
});

test("Premium users and onboarding actions do not open the automatic paywall", () => {
  const premium = createSession({ premiumState: { isPremium: true } });
  premium.decide("save");
  premium.render();
  assert.equal(premium.opened.length, 0);
  const onboarding = createSession({ onboardingStep: "goals" });
  onboarding.decide("spend");
  onboarding.context.onboardingStep = "done";
  onboarding.render();
  assert.equal(onboarding.opened.length, 0);
});

test("a feature paywall before the reward handoff does not consume the automatic session", () => {
  const session = createSession({ premiumPaywallState: { visible: true } });
  session.decide("save");
  session.render();
  assert.equal(session.opened.length, 0);
  session.context.premiumPaywallState.visible = false;
  session.render();
  assert.equal(session.opened.length, 1);
});

test("feature gates remain repeatable after the automatic paywall", () => {
  const session = createSession();
  session.decide("save");
  session.render();
  const start = appSource.indexOf("  const ensurePremiumFeatureAccess = useCallback(");
  const end = appSource.indexOf("  const canShowSoftPaywallNow =", start);
  session.context.useCallback = (callback) => callback;
  vm.runInContext(`${appSource.slice(start, end)}; featureGate = ensurePremiumFeatureAccess;`, session.context);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal(session.context.featureGate("analytics"), false);
  }
  assert.equal(session.opened.length, 4);
  assert.equal(session.opened.filter((options) => options.trigger === "feature_gate").length, 3);
});

test("presentation retry timers are cancelled when the effect is cleaned up", () => {
  const session = createSession({ ready: false });
  session.decide("save");
  const cleanups = session.render();
  assert.equal(session.timers.size, 1);
  cleanups.forEach((cleanup) => cleanup?.());
  assert.equal(session.timers.size, 0);
  assert.equal(session.context.premiumSoftPaywallCheckTimerRef.current, null);
});

test("the app's real presentation guard waits for every reward handoff and foreground state", () => {
  for (const blockers of [
    { ratingPromptQueuedRef: { current: true } },
    { isStoreReviewHandoffPending: () => true },
    { overlay: { type: "save" } },
    { blockingModalVisible: true },
    { firstSaveGoalJarStatusRef: { current: "pending" } },
    { pendingLevelCelebrationRef: { current: { level: 2 } } },
    { pendingGoalCelebration: {} },
    { overlayQueueRef: { current: [{}] } },
    { celebrationQueueRef: { current: [{}] } },
    { celebrationGapTimerRef: { current: 1 } },
    { settleRemainingMs: 500 },
    { appStateRef: { current: "background" } },
  ]) {
    const session = createSession(blockers);
    session.decide("save");
    session.render();
    session.retry();
    assert.equal(session.opened.length, 0, JSON.stringify(blockers));
    assert.equal(session.context.automaticSoftPaywallShownThisSessionRef.current, false);
  }
});
