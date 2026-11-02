const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const babel = require("@babel/core");

// Exercise real hook callbacks against deferred storage, including the first
// payout arriving while hydration is still in flight. No native purchases.
function harness() {
  const cells = [];
  const effects = [];
  let cursor = 0;
  let readResolve;
  let readReject;
  const writes = [];
  const react = {
    useState(initial) { const id = cursor++; if (!(id in cells)) cells[id] = initial; return [cells[id], (value) => { cells[id] = typeof value === "function" ? value(cells[id]) : value; }]; },
    useRef(initial) { const id = cursor++; if (!(id in cells)) cells[id] = { current: initial }; return cells[id]; },
    useCallback(callback) { cursor++; return callback; },
    useEffect(callback) { const id = cursor++; if (!(id in cells)) { cells[id] = true; effects.push(callback); } },
  };
  const storage = { multiGet: () => new Promise((resolve, reject) => { readResolve = resolve; readReject = reject; }), setItem: async (...args) => { writes.push(args); } };
  const exports = {};
  const source = babel.transformSync(fs.readFileSync("src/components/AlmiCareTutorial.js", "utf8"), {
    babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-modules-commonjs", "@babel/plugin-transform-react-jsx"],
  }).code;
  vm.runInNewContext(source, { exports, setTimeout, clearTimeout, require(name) {
    if (name === "react") return react;
    if (name === "react-native") return { StyleSheet: { create: (value) => value } };
    if (name.includes("async-storage")) return storage;
    if (name.includes("appBehavior")) return { STORAGE_KEYS: { ALMI_CARE_TUTORIAL: "tutorial", TEMPTATION_SERIES: "series" } };
    throw Error(name);
  } });
  const render = () => { cursor = 0; return exports.useAlmiCareTutorial(); };
  render(); effects.forEach((effect) => effect());
  return { render, writes, hydrate: async (stored = null, series = null) => { readResolve([["tutorial", stored], ["series", series]]); await new Promise(setImmediate); }, fail: async () => { readReject(Error("offline storage")); await new Promise(setImmediate); } };
}

test("payout schedules once, survives restart, and completion prevents subsequent tours", async () => {
  const app = harness(); await app.hydrate();
  app.render().schedule(); assert.equal(app.render().status, "pending");
  app.render().schedule(); assert.equal(app.writes.length, 1);
  app.render().start(); assert.equal(app.render().step, 1);
  app.render().next(); assert.equal(app.render().step, 2);
  app.render().dismiss(); assert.equal(app.render().step, 0);
  app.render().schedule(); assert.equal(app.render().status, "done");
  assert.equal(app.writes.at(-1)[1], "done");
  const restarted = harness(); await restarted.hydrate("done"); restarted.render().schedule();
  assert.equal(restarted.render().status, "done");
});

test("first payout racing hydration remains pending, previously completed stays completed", async () => {
  for (const stored of [null, "done"]) {
    const app = harness(); app.render().schedule(); await app.hydrate(stored);
    assert.equal(app.render().status, stored === "done" ? "done" : "pending");
  }
});

test("pending handoff resumes after process death; menu dismissal is a permanent skip", async () => {
  const app = harness(); await app.hydrate("pending", '{"claimedAt":123,"claimedCoins":30}');
  assert.equal(app.render().status, "pending"); app.render().start(); app.render().dismiss();
  assert.equal(app.render().status, "done");
});

test("returning users with an earlier claim are not shown a first-reward tutorial", async () => {
  const app = harness(); await app.hydrate(null, '{"claimedAt":123,"claimedCoins":30}');
  app.render().schedule(); assert.equal(app.render().status, "done");
});

test("failed storage read cannot re-show a previously finished tutorial", async () => {
  const app = harness(); await app.fail(); app.render().schedule();
  assert.equal(app.render().status, "unavailable"); assert.equal(app.writes.length, 0);
});

test("real series claim queues paid rewards including precredited coins without duplicate credit", () => {
  const parser = require("@babel/parser");
  const series = require("../../src/engagement/temptationSeries");
  const source = fs.readFileSync("App.js", "utf8");
  const ast = parser.parse(source, { sourceType: "module", plugins: ["jsx"] });
  let callback;
  function visit(node) {
    if (!node || typeof node !== "object" || callback) return;
    if (node.type === "VariableDeclarator" && node.id.name === "handleTemptationSeriesClaim") { callback = node.init.arguments[0]; return; }
    for (const value of Object.values(node)) for (const child of Array.isArray(value) ? value : [value]) visit(child);
  }
  visit(ast);
  const now = Date.now();
  const date = new Date(now);
  const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const temptationSeriesRef = { current: { version: 2, seriesId: "test", status: "ready", dayKey, targetIds: ["a", "b", "c"], pendingCoins: 30, startedAt: now, completedAt: now, resolutions: Object.fromEntries(["a", "b", "c"].map((id) => [id, { firstAction: "save", lastAction: "save", firstAt: now, lastAt: now, actionCount: 1 }])) } };
  let balance = 0;
  let scheduled = 0;
  const context = { ...series, temptationSeriesRef, updateTemptationSeries: (value) => { temptationSeriesRef.current = value; },
    setHealthPoints: (updater) => { balance = updater(balance); }, scheduleAlmiTutorial: () => { scheduled++; },
    registerUsageStreakAction() {}, recordRatingPromptSeriesCompletion() {}, pendingUsageStreakRef: {}, pendingLevelCelebrationRef: {},
    playerLevel: 1, lastCelebratedLevel: 1, persistLastCelebratedLevel() {}, logEvent() {}, triggerSuccessHaptic() {}, getDayKey: () => dayKey };
  const claim = vm.runInNewContext(`(${source.slice(callback.start, callback.end)})`, context);
  assert.equal(claim(), true);
  assert.equal(balance, 30); assert.equal(scheduled, 1);
  assert.equal(claim(), false);
  assert.equal(balance, 30); assert.equal(scheduled, 1);
  // Current series decisions can credit coins before the chest is collected.
  temptationSeriesRef.current = { ...temptationSeriesRef.current, status: "ready", pendingCoins: 30, creditedCoins: 30, claimedCoins: 0, claimedAt: null };
  assert.equal(claim(), true);
  assert.equal(balance, 30); assert.equal(scheduled, 2);
  temptationSeriesRef.current = { ...temptationSeriesRef.current, status: "ready", pendingCoins: 0, creditedCoins: 0, claimedCoins: 0, claimedAt: null };
  assert.equal(claim(), true);
  assert.equal(balance, 30); assert.equal(scheduled, 2);
});

test("all supported tutorial translations preserve progress placeholders and complete copy", () => {
  const source = fs.readFileSync("src/constants/almiTutorialTranslations.js", "utf8").replace("export const", "const");
  const dictionaries = vm.runInNewContext(source + "\nALMI_TUTORIAL_TRANSLATIONS");
  const languages = ["en", "es", "fr", "ru", "de", "pt", "it", "ar", "zh", "zh-Hant", "ko", "ja"];
  assert.deepEqual(Object.keys(dictionaries).sort(), languages.sort());
  for (const [language, copy] of Object.entries(dictionaries)) {
    assert.equal(Object.keys(copy).length, 8, language);
    for (const value of Object.values(copy)) { assert.ok(value.trim(), language); assert.equal(/[\u2013\u2014]/.test(value), false, language); }
    assert.deepEqual(copy.almiTutorialProgress.match(/\{\{\w+\}\}/g).sort(), ["{{step}}", "{{total}}"]);
  }
});


test("a completed zero-coin series does not consume the first-paid-reward guide", async () => {
  const app = harness(); await app.hydrate(null, '{"claimedAt":123,"claimedCoins":0}');
  assert.equal(app.render().status, "unseen");
  app.render().schedule(); assert.equal(app.render().status, "pending");
});

test("queued app and native reviews wait for the guide and remain eligible after it", () => {
  const source = fs.readFileSync("App.js", "utf8");
  const context = { appStateRef: { current: "active" }, automaticModalPresentationPausedRef: { current: false },
    onboardingStep: "done", interfaceReady: true, startupHardLockPendingBeforePaywall: false,
    getModalCloseSettleRemainingMs: () => 0, storeReviewInFlightRef: { current: false }, getStoreReviewModalGuardRemainingMs: () => 0,
    queuedModalType: null, queuedModalActiveRef: { current: null }, queuedModalQueueRef: { current: [] }, canShowQueuedModalRef: { current: () => false },
    blockingModalVisible: false, tutorialBlockingVisible: false, overlayActiveRef: { current: false }, overlayQueueRef: { current: [] },
    celebrationQueueRef: { current: [] }, celebrationGapTimerRef: { current: null }, overlay: null, pendingGoalCelebration: null, visibleModalHostCount: 0 };
  for (const name of ["canShowRatingPromptNowRef", "canTriggerStoreReviewNowRef"]) {
    const match = source.match(new RegExp(`${name}\\.current = (\\(\\) => \\{[\\s\\S]*?\\n  \\});`));
    assert.ok(match, name);
    for (const status of ["unseen", "pending", "active", "done"]) {
      const allowed = vm.runInNewContext(`(${match[1]})()`, { ...context, almiTutorialStatus: status });
      assert.equal(allowed, status === "unseen" || status === "done", `${name}/${status}`);
    }
  }
});
