const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const policy = require("../../src/engagement/independentDecisions");
const appSource = fs.readFileSync(path.join(__dirname, "../../App.js"), "utf8");
const section = (a, b) => { const start = appSource.indexOf(a); const end = appSource.indexOf(b, start); assert.ok(start > 0 && end > start); return appSource.slice(start, end); };
const effects = section('  // Two independent committed decisions', '  useEffect(() => {\n    if (!isMonetizationExperimentControlGroup) return;\n    const completedCount');
const guard = section('  const canShowSoftPaywallNow = useCallback(', '  const canShowFirstSaveGoalJarNow =');
const callbacks = section('  const beginIndependentDecision = useCallback(', '  const handleTemptationSeriesClaim =');
const createSession = (overrides = {}, stored = null) => {
  let effectList = [];
  const timers = new Map();
  const opened = [];
  const state = policy.normalizeIndependentDecisions(stored);
  const context = vm.createContext({
    ...policy, independentDecisions: state, independentDecisionsRef: { current: state },
    independentDecisionsHydrated: true, independentDecisionSequenceRef: { current: 0 }, independentDecisionSessionRef: { current: Math.random().toString(36) },
    premiumSoftPaywallCheckTimerRef: { current: null }, softPaywallReadinessTick: 0,
    premiumSoftPaywallPending: false, automaticSoftPaywallShownThisSessionRef: { current: false },
    premiumStateCacheHydrated: true, premiumState: { isPremium: false }, premiumPaywallState: { visible: false },
    isMonetizationSoftPaywallExperimentGroup: true, onboardingStep: "done", interfaceReady: true,
    feedIntroStatusRef: { current: "done" }, feedIntroVisible: false, practiceTutorial: { active: false },
    tutorialReplayPendingRef: { current: false }, nextDecisionCoach: { status: "done" },
    nextDecisionCoachRef: { current: { status: "done", requestId: 1 } }, NEXT_DECISION_COACH_STATUS: { PENDING: "pending", VISIBLE: "visible" },
    MODAL_CLOSE_SETTLE_MS: 500, nextDecisionCoachClosedAtRef: { current: 0 }, notificationPermissionInFlightRef: { current: 0 }, suppressResumeOnceRef: { current: false },
    activeTab: "feed", allTemptationsVisible: false, fabMenuVisible: false, decisionFocusVisible: false, keyboardVisible: false, editOverlayVisible: false,
    fabScrollHiddenRef: { current: false }, visibleModalHostCount: 0,
    appStateRef: { current: "active" }, startupHardLockPendingBeforePaywall: false,
    automaticModalPresentationPausedRef: { current: false }, temptationSeriesModalVisible: false,
    temptationSeries: {}, temptationSeriesRef: { current: {} }, temptationSeriesReadyPresentedRef: { current: null },
    normalizeTemptationSeriesState: (v) => v, TEMPTATION_SERIES_STATUS: { READY: "ready" },
    coinValueModalStatusRef: { current: "done" }, COIN_VALUE_MODAL_STATUS: { PENDING: "pending" }, coinValueModalAllowed: true,
    firstSaveGoalJarStatusRef: { current: "idle" }, firstSaveGoalJarVisible: false,
    ratingPromptQueuedRef: { current: false }, isStoreReviewHandoffPending: () => false,
    blockingModalVisiblePrevRef: { current: false }, blockingModalVisible: false,
    tutorialBlockingVisiblePrevRef: { current: false }, tutorialBlockingVisible: false,
    pendingFrequencyReminderPrompt: null, frequencyReminderPriorityLockRef: { current: false }, frequencyReminderPrompt: { visible: false },
    getModalCloseSettleRemainingMs: () => context.settleRemainingMs || 0,
    queuedModalType: null, queuedModalActiveRef: { current: false }, queuedModalQueueRef: { current: [] },
    canShowQueuedModalRef: { current: () => true }, coinValueModalVisible: false,
    overlay: null, overlayActiveRef: { current: false }, pendingUsageStreakRef: { current: null },
    pendingGoalCelebration: null, pendingLevelCelebrationRef: { current: null }, overlayQueueRef: { current: [] },
    celebrationQueueRef: { current: [] }, celebrationGapTimerRef: { current: null },
    lastSaveActionAtRef: { current: 0 }, lastSaveOverlayDismissedAtRef: { current: 0 }, lastOverlayDismissedAtRef: { current: 0 },
    savedTotalUSD: 12, AUTOMATIC_SOFT_PAYWALL_TRIGGER: "second_independent_decision", STORAGE_KEYS: { INDEPENDENT_DECISIONS: "independent" },
    queuePersist: (_key, raw) => { context.persisted = raw; }, logMonetizationEvent: () => {}, completeNextDecisionCoach: () => {},
    setIndependentDecisions: (v) => { context.independentDecisions = v; },
    setPremiumSoftPaywallPending: (v) => { context.premiumSoftPaywallPending = v; }, setPremiumSoftPaywallShown: () => {},
    openPremiumPaywall: (options) => { if (context.failOpen) return false; opened.push(options); return true; },
    useCallback: (callback) => callback, useEffect: (effect) => { effectList.push(effect); },
    InteractionManager: { runAfterInteractions: (callback) => { callback(); return { cancel() {} }; } },
    setTimeout: (callback) => { const id = timers.size + 1; timers.set(id, callback); return id; }, clearTimeout: (id) => timers.delete(id),
    ...overrides,
  });
  vm.runInContext(`${guard}; presentationGuard = canShowSoftPaywallNow; ${callbacks}; begin = beginIndependentDecision; commit = recordIndependentDecision;`, context);
  return { context, opened, timers,
    decide: (action, attempt = context.begin()) => { context.commit(attempt, action); return attempt; },
    render: () => { effectList = []; vm.runInContext(effects, context); return effectList.map((e) => e()); },
  };
};

test("first independent decision never opens; second only unlocks a durable safe opportunity", () => {
  const s = createSession(); s.render(); assert.equal(s.opened.length, 0);
  s.decide("save"); s.render(); assert.equal(s.opened.length, 0);
  s.context.overlay = { type: "save" }; s.decide("spend"); s.render();
  assert.equal(s.context.independentDecisions.count, 2); assert.equal(s.opened.length, 0);
  s.context.overlay = null; s.render(); assert.equal(s.opened.length, 1);
  assert.equal(s.opened[0].dismissible, true);
});

test("practice, replay handoff, pre-hydration, onboarding and technical actions never count", () => {
  for (const override of [{ practiceTutorial: { active: true } }, { feedIntroVisible: true }, { tutorialReplayPendingRef: { current: true } }, { feedIntroStatusRef: { current: "checking" } }, { independentDecisionsHydrated: false }, { onboardingStep: "goals" }]) {
    const s = createSession(override); s.decide("save"); s.decide("spend"); s.render();
    assert.equal(s.context.independentDecisions.count, 0, JSON.stringify(override));
  }
  const s = createSession(); ["skip", "archive", "delete", "series_claim", "open"].forEach((action) => s.decide(action));
  assert.equal(s.context.independentDecisions.count, 0);
});

test("attempt origin is captured before asynchronous confirmation and replay cannot relabel it", () => {
  const s = createSession({ feedIntroVisible: true }); const attempt = s.context.begin();
  s.context.feedIntroVisible = false; s.decide("save", attempt); assert.equal(s.context.independentDecisions.count, 0);
});

test("pause is a valid independent committed outcome, duplicates and failed/cancelled attempts are not", () => {
  const s = createSession(); const attempt = s.decide("pause"); s.decide("pause", attempt);
  assert.equal(s.context.independentDecisions.count, 1);
  const state = s.context.independentDecisions;
  assert.equal(policy.commitIndependentDecision(state, { id: "error", action: "save", committed: false, independent: true }), state);
  s.decide("spend"); s.render(); assert.equal(s.opened.length, 1);
});

for (const [label, override] of Object.entries({
  coachPending: { nextDecisionCoachRef: { current: { status: "pending" } } },
  coachVisible: { nextDecisionCoachRef: { current: { status: "visible" } } },
  reminder: { frequencyReminderPrompt: { visible: true } }, reminderPending: { pendingFrequencyReminderPrompt: {} },
  permission: { notificationPermissionInFlightRef: { current: 1 } }, review: { isStoreReviewHandoffPending: () => true },
  rating: { ratingPromptQueuedRef: { current: true } }, goal: { pendingGoalCelebration: {} }, level: { pendingLevelCelebrationRef: { current: {} } },
  jar: { firstSaveGoalJarStatusRef: { current: "pending" } }, queuedSheet: { queuedModalQueueRef: { current: ["reward"] } },
  seriesHandoff: { temptationSeriesRef: { current: { status: "ready", seriesId: "series" } } },
  healthHint: { coinValueModalStatusRef: { current: "pending" } }, overlayQueue: { overlayQueueRef: { current: [{}] } },
  celebration: { celebrationQueueRef: { current: [{}] } }, modal: { blockingModalVisible: true }, tutorial: { tutorialBlockingVisible: true },
  background: { appStateRef: { current: "background" } }, focusInput: { decisionFocusVisible: true }, keyboard: { keyboardVisible: true },
  edit: { editOverlayVisible: true }, gesture: { fabScrollHiddenRef: { current: true } }, otherTask: { activeTab: "profile" },
  settle: { settleRemainingMs: 500 },
})) test(`actual presentation guard defers ${label}`, () => {
  const s = createSession(); s.decide("save"); s.decide("spend"); Object.assign(s.context, override); s.render();
  assert.equal(s.opened.length, 0); assert.equal(s.context.independentDecisions.pending, true);
  assert.equal(s.timers.size, label === "settle" ? 1 : 0); // No hot polling while waiting for user/state.
});

test("restart persists the first receipt, consumes successful offers and never replays on background/resume", () => {
  const first = createSession(); const attempt = first.decide("save");
  const resumed = createSession({}, first.context.persisted); resumed.decide("save", attempt); assert.equal(resumed.context.independentDecisions.count, 1);
  resumed.decide("pause"); resumed.context.appStateRef.current = "background"; resumed.render(); assert.equal(resumed.opened.length, 0);
  resumed.context.appStateRef.current = "active"; resumed.render(); assert.equal(resumed.opened.length, 1);
  resumed.decide("spend"); resumed.render(); assert.equal(resumed.opened.length, 1); // session cap
  const restarted = createSession({}, resumed.context.persisted); restarted.render(); assert.equal(restarted.opened.length, 1); // new committed opportunity
  const quietRestart = createSession({}, restarted.context.persisted); quietRestart.render(); assert.equal(quietRestart.opened.length, 0);
});

test("migration never infers independent history from old first-action flags or malformed storage", () => {
  for (const raw of [null, "1", "true", "{bad", JSON.stringify({ lifetimeDecisionCount: 100, premiumSoftPaywallShown: true })]) {
    const s = createSession({}, raw); s.render(); s.decide("save"); s.render(); assert.equal(s.opened.length, 0);
  }
});

test("premium/excluded experiments stay silent; failed open preserves opportunity", () => {
  for (const override of [{ premiumState: { isPremium: true } }, { isMonetizationSoftPaywallExperimentGroup: false }]) {
    const s = createSession(override); s.decide("save"); s.decide("spend"); s.render(); assert.equal(s.opened.length, 0);
  }
  const s = createSession({ failOpen: true }); s.decide("save"); s.decide("spend"); s.render();
  assert.equal(s.context.independentDecisions.pending, true); s.context.failOpen = false; s.render(); assert.equal(s.opened.length, 1);
});

test("manual premium uses the real repeatable feature gate before and after the threshold", () => {
  const s = createSession(); s.context.normalizeMonetizationToken = (v) => v;
  const code = section('  const ensurePremiumFeatureAccess = useCallback(', '  useEffect(() => {\n    const subscription = AppState.addEventListener("change", () => setSoftPaywallReadinessTick');
  vm.runInContext(`${code}; manual = ensurePremiumFeatureAccess;`, s.context);
  s.context.manual("analytics"); s.context.manual("analytics"); assert.equal(s.opened.length, 2);
  s.decide("save"); s.context.manual("analytics"); assert.equal(s.opened.length, 3);
});

test("native coach evidence requires matching mounted target in the actual viewport", () => {
  const visible = { targetId: "next", presentedId: "next", appState: "active", x: 16, y: 120, width: 300, height: 130, screenWidth: 390, screenHeight: 800 };
  assert.equal(policy.isCoachActuallyPresented(visible), true);
  for (const patch of [{ presentedId: "old" }, { y: 900 }, { height: 0 }, { appState: "background" }, { x: -20 }]) assert.equal(policy.isCoachActuallyPresented({ ...visible, ...patch }), false);
  const presentation = section('function PresentedDecisionCoach(', 'const RedesignTodayHeader =');
  assert.match(presentation, /measureInWindow/); assert.match(presentation, /onLayout={measure}/);
  const continuation = section('    if (!nextDecisionCoachRequest) return;', '  const resolveAssignedGoalLabel =');
  assert.doesNotMatch(continuation, /onNextDecisionCoachShown|setRedesignFeedMode\("all"\)/);
});

 test("the real storage batch loads the independent lifecycle and coach persistence keeps its key", () => {
  assert.match(appSource, /STORAGE_KEYS.TEMPTATION_SERIES,\s*STORAGE_KEYS.INDEPENDENT_DECISIONS,\s*STORAGE_KEYS.NEXT_DECISION_COACH,/);
  assert.match(appSource, /normalizeIndependentDecisions\(storedMap\[STORAGE_KEYS.INDEPENDENT_DECISIONS\]\)/);
  const shown = section("  const handleNextDecisionCoachShown =", "  const handleNextDecisionCoachUnavailable =");
  assert.match(shown, /queuePersist\(\s*STORAGE_KEYS.NEXT_DECISION_COACH,\s*serializeNextDecisionCoachState\(nextState\)/);
 });

test("a late callback cannot double-count after receipt eviction and a replay cannot count an in-flight result", () => {
  const s = createSession(); const old = s.decide("save");
  for (let index = 0; index < 40; index++) s.decide("spend");
  s.render(); assert.equal(s.context.independentDecisions.pending, false);
  s.decide("save", old); assert.equal(s.context.independentDecisions.pending, false);
  const attempt = s.context.begin(); s.context.tutorialReplayPendingRef.current = true;
  s.decide("save", attempt); assert.equal(s.context.independentDecisions.pending, false);
  s.context.tutorialReplayPendingRef.current = false;
  s.decide("save", attempt); assert.equal(s.context.independentDecisions.pending, false);
});

test("first-action cadence prompt remains automatic and keeps the existing scheduler save/skip paths", () => {
  const interaction = section("      if (firstActionPromptPayload) {", "  const buildFrequencyAnalyticsValue =");
  assert.match(interaction, /setPendingFrequencyReminderPrompt/);
  assert.match(appSource, /openPendingFrequencyReminderPromptWithPriority\(\{ lockQueue: true \}\)/);
  assert.match(appSource, /onPress={handleFrequencyReminderPromptSave}/);
  assert.match(appSource, /closeFrequencyReminderPrompt\("skip"\)/);
});

test("confirmation retries retain origin and technical batches cannot satisfy the threshold", () => {
  const action = section("  const handleTemptationAction =", "  const handleSubscriptionPaymentAction =");
  assert.match(action, /options = { \.\.\.options, decisionContext }/);
  assert.match(action, /options.independentDecision === false/);
  assert.match(action, /startsWith\("coin_entry_"\)/);
  assert.match(action, /intent: "save",\s*amountUSD: priceUSD,\s*decisionContext/);
  const batch = section('    const batchConfirmed = await confirmAlmostPay({ action: "batch"', '    logEvent("tycoon_autosave_confirmed"');
  assert.equal((batch.match(/independentDecision: false/g) || []).length, 2);
  assert.match(appSource, /decisionContext: goalLinkPrompt.decisionContext/);
});

test("native review guard wakes the pending offer when registered and when its deadline expires", () => {
  let callback;
  let wakes = 0;
  let now = 1000;
  const context = vm.createContext({
    useCallback: (f) => f, Date: { now: () => now },
    STORE_REVIEW_MODAL_GUARD_MS: 500, MODAL_HANDOFF_FRAME_SLACK_MS: 16,
    storeReviewModalGuardUntilRef: { current: 0 }, storeReviewModalGuardTimerRef: { current: null },
    setTimeout: (f, delay) => { callback = f; assert.equal(delay, 516); return 1; }, clearTimeout() {},
    requestQueuedModalProcess() {}, setSoftPaywallReadinessTick: (update) => { wakes = update(wakes); },
  });
  vm.runInContext(section('  const queueStoreReviewModalGuard =', '  const getStoreReviewModalGuardRemainingMs =') + '; queueStoreReviewModalGuard();', context);
  assert.equal(wakes, 1);
  assert.equal(context.storeReviewModalGuardUntilRef.current, 1500);
  now = 1516; callback();
  assert.equal(wakes, 2);
  assert.equal(context.storeReviewModalGuardTimerRef.current, null);
});

test("coach presentation excludes the bottom navigation occlusion", () => {
  const rect = { targetId: "coffee", presentedId: "coffee", appState: "active", x: 18, y: 791, width: 366, height: 52, screenWidth: 402, screenHeight: 874 };
  assert.equal(policy.isCoachActuallyPresented(rect), true);
  assert.equal(policy.isCoachActuallyPresented({ ...rect, viewportBottom: 794 }), false);
  assert.equal(policy.isCoachActuallyPresented({ ...rect, y: 600, viewportBottom: 794 }), true);
  const header = section('const RedesignTodayHeader =', 'const FeedScreen =');
  assert.ok(header.indexOf('<PresentedDecisionCoach') > header.indexOf('testID="decision-later"'));
});

test("coach reveal yields to gestures and runs at most once per real target", () => {
  const calls = [];
  const context = vm.createContext({
    useCallback: (f) => f, nextDecisionCoachRequest: { requestId: 7 }, nextDecisionCoachTargetId: 'coffee',
    feedScrollingRef: { current: true }, activeAmountSliderCardIdRef: { current: null },
    coachRevealHandledRef: { current: null }, feedScrollOffsetRef: { current: 10 },
    listRef: { current: { scrollToOffset: (v) => calls.push(v) } },
  });
  vm.runInContext(section('  const revealDecisionCoach =', '  const resolveAssignedGoalLabel =') + '; reveal = revealDecisionCoach;', context);
  assert.equal(context.reveal(120), false);
  context.feedScrollingRef.current = false;
  assert.equal(context.reveal(120), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].offset, 130);
  assert.equal(calls[0].animated, false);
  assert.equal(context.reveal(120), false);
  assert.equal(calls.length, 1);
  context.nextDecisionCoachTargetId = 'tea';
  assert.equal(context.reveal(120), true);
});
