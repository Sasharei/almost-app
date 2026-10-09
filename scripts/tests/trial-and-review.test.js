const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const parser = require("@babel/parser");

const source = fs.readFileSync(path.join(__dirname, "../../App.js"), "utf8");
const ast = parser.parse(source, { sourceType: "module", plugins: ["jsx"] });
const app = ast.program.body.find((node) => node.type === "FunctionDeclaration" && node.id.name === "AppContent");
const declaration = (name, statements = app.body.body, text = source) => {
  const node = statements.find((entry) => entry.type === "VariableDeclaration" && entry.declarations.some(({ id }) => id.name === name));
  assert.ok(node, name);
  return text.slice(node.start, node.end);
};

test("iOS rating requests the native sheet without opening a store URL or claiming a submitted rating", async () => {
  for (const available of [true, false, "error", "request_error"]) {
    let requested = 0;
    const events = [];
    const context = vm.createContext({
      useCallback: (callback) => callback,
      Platform: { OS: "ios" },
      StoreReview: { isAvailableAsync: async () => { if (available === "error") throw new Error("StoreKit unavailable"); return available !== false; }, requestReview: async () => { requested += 1; if (available === "request_error") throw new Error("Request failed"); } },
      Linking: { openURL: () => { throw new Error("Native review must not redirect"); } },
      storeReviewInFlightRef: { current: false },
      storeReviewQueuedRef: { current: true },
      storeReviewAwaitingInteractionRef: { current: false },
      normalizeStoreReviewSource: (value) => value,
      logEvent: (...args) => events.push(args), logStoreReviewWarning: () => {},
      queueStoreReviewModalGuard: () => {}, STORE_REVIEW_PAYWALL_DELAY_MS: 1000,
    });
    const result = await vm.runInContext(`${declaration("triggerStoreReview")}\ntriggerStoreReview("rating_prompt_native")`, context);
    assert.equal(result, available === true);
    assert.equal(requested, available === true || available === "request_error" ? 1 : 0);
    assert.equal(context.storeReviewInFlightRef.current, false);
    assert.equal(context.storeReviewQueuedRef.current, false);
    assert.equal(context.storeReviewAwaitingInteractionRef.current, available === true);
    assert.ok(events.every(([name]) => !name.includes("submitted")));
  }
});

test("eligible trial is selected once and respects manual choices, unavailable eligibility and abandoned offers", () => {
  const paywall = fs.readFileSync(path.join(__dirname, "../../src/components/PremiumPaywallModalV2.js"), "utf8");
  const tree = parser.parse(paywall, { sourceType: "module", plugins: ["jsx"] });
  const component = tree.program.body.find((node) => node.type === "VariableDeclaration" && node.declarations[0].id.name === "PremiumPaywallModalV2").declarations[0].init;
  const effect = component.body.body.find((node) => node.type === "ExpressionStatement" && node.expression.callee?.name === "useEffect" && paywall.slice(node.start, node.end).includes('source: "eligible_trial_default"'));
  assert.ok(effect);
  const effectSource = paywall.slice(effect.start, effect.end);
  for (const settings of [
    { visible: true, freeTrialDisplayPlan: { id: "yearly" }, isTransactionAbandonedOffer: false, touched: false, expected: 1 },
    { visible: true, freeTrialDisplayPlan: null, isTransactionAbandonedOffer: false, touched: false, expected: 0 },
    { visible: true, freeTrialDisplayPlan: { id: "yearly" }, isTransactionAbandonedOffer: false, touched: true, expected: 0 },
    { visible: true, freeTrialDisplayPlan: { id: "yearly" }, isTransactionAbandonedOffer: true, touched: false, expected: 0 },
    { visible: false, freeTrialDisplayPlan: { id: "yearly" }, isTransactionAbandonedOffer: false, touched: false, expected: 0 },
  ]) {
    const selections = [];
    const context = vm.createContext({ ...settings,
      trialSelectionInitializedRef: { current: settings.touched },
      useEffect: (callback) => callback(), setSelectedPlanId: () => {}, setFreeTrialEnabled: () => {},
      onPlanSelect: (...args) => selections.push(args),
    });
    vm.runInContext(effectSource, context);
    vm.runInContext(effectSource, context);
    assert.equal(selections.length, settings.expected);
    if (selections.length) assert.equal(selections[0][1].trialEnabled, true);
  }
});

test("store trial metadata converts two weeks to fourteen days without forcing a legacy three-day offer to fourteen", () => {
  const context = vm.createContext({
    normalizePaywallPeriodUnit: (unit) => unit,
    PAYWALL_PERIOD_UNIT_TO_DAYS: { DAY: 1, WEEK: 7 },
    toPositiveInteger: (value) => Math.max(0, Math.floor(Number(value) || 0)),
    isZeroPrice: (value) => Number(value) === 0,
  });
  const helpers = ["resolveTrialDaysFromPeriod", "resolveTrialDaysFromIntroPrice"].map((name) => declaration(name, ast.program.body)).join("\n");
  vm.runInContext(helpers, context);
  assert.equal(vm.runInContext('resolveTrialDaysFromIntroPrice({price:0,periodUnit:"WEEK",periodNumberOfUnits:2,cycles:1})', context), 14);
  assert.equal(vm.runInContext('resolveTrialDaysFromIntroPrice({price:0,periodUnit:"DAY",periodNumberOfUnits:3,cycles:1})', context), 3);
  assert.equal(vm.runInContext('resolveTrialDaysFromIntroPrice({price:5,periodUnit:"WEEK",periodNumberOfUnits:2})', context), null);
});

test("native review retains its reservation until app interaction, then allows a one-second handoff", () => {
  let now = 0;
  let guardUntil = 0;
  const context = vm.createContext({
    useCallback: (callback) => callback,
    storeReviewQueuedRef: { current: false },
    storeReviewInFlightRef: { current: false },
    storeReviewAwaitingInteractionRef: { current: true },
    appStateRef: { current: "active" },
    STORE_REVIEW_PAYWALL_DELAY_MS: 1000,
    getStoreReviewModalGuardRemainingMs: () => Math.max(0, guardUntil - now),
    queueStoreReviewModalGuard: (delay) => { guardUntil = now + delay; },
  });
  vm.runInContext(`${declaration("isStoreReviewHandoffPending")}\n${declaration("resumeAfterNativeStoreReview")}`, context);
  now = 60000; // A long-lived review must never expire on a timer.
  assert.equal(vm.runInContext("isStoreReviewHandoffPending()", context), true);
  context.appStateRef.current = "background";
  vm.runInContext("resumeAfterNativeStoreReview()", context);
  assert.equal(context.storeReviewAwaitingInteractionRef.current, true);
  context.appStateRef.current = "active";
  context.storeReviewInFlightRef.current = true;
  vm.runInContext("resumeAfterNativeStoreReview()", context);
  assert.equal(context.storeReviewAwaitingInteractionRef.current, true);
  context.storeReviewInFlightRef.current = false;
  guardUntil = now + 900;
  vm.runInContext("resumeAfterNativeStoreReview()", context);
  assert.equal(context.storeReviewAwaitingInteractionRef.current, true);
  now = guardUntil;
  vm.runInContext("resumeAfterNativeStoreReview()", context);
  assert.equal(context.storeReviewAwaitingInteractionRef.current, false);
  now += 999;
  assert.equal(vm.runInContext("isStoreReviewHandoffPending()", context), true);
  now += 1;
  assert.equal(vm.runInContext("isStoreReviewHandoffPending()", context), false);
});

test("deferred native request holds the queued lock through InteractionManager", () => {
  const callbacks = [];
  const context = vm.createContext({
    useCallback: (callback) => callback,
    storeReviewQueuedRef: { current: false },
    storeReviewAwaitingInteractionRef: { current: false },
    storeReviewCheckTimerRef: { current: null },
    normalizeStoreReviewSource: (value) => value,
    queueStoreReviewModalGuard: () => {},
    canTriggerStoreReviewNowRef: { current: () => true },
    InteractionManager: { runAfterInteractions: (callback) => callbacks.push(callback) },
    triggerStoreReview: () => { context.storeReviewQueuedRef.current = false; },
  });
  vm.runInContext(`${declaration("requestStoreReviewWhenReady")}\nrequestStoreReviewWhenReady()`, context);
  assert.equal(context.storeReviewQueuedRef.current, true);
  vm.runInContext("requestStoreReviewWhenReady()", context);
  assert.equal(callbacks.length, 1);
  callbacks[0]();
  assert.equal(context.storeReviewQueuedRef.current, false);
});
