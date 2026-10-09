const assert = require("node:assert/strict");
const test = require("node:test");

const {
  UI_SESSION_HOME_RESET_MS,
  createUiSessionState,
  normalizeUiSessionState,
  shouldResetUiSessionNavigation,
} = require("../../src/utils/uiSessionState");

test("opens home after a cold start or five minutes away", () => {
  assert.equal(shouldResetUiSessionNavigation({ isColdStart: true }), true);
  assert.equal(
    shouldResetUiSessionNavigation({
      backgroundedAt: 1_000,
      resumedAt: 1_000 + UI_SESSION_HOME_RESET_MS - 1,
    }),
    false
  );
  assert.equal(
    shouldResetUiSessionNavigation({
      backgroundedAt: 1_000,
      resumedAt: 1_000 + UI_SESSION_HOME_RESET_MS,
    }),
    true
  );
  assert.equal(
    shouldResetUiSessionNavigation({ backgroundedAt: 0, resumedAt: 999_999 }),
    false
  );
});

test("restores navigation and unfinished profile/card drafts", () => {
  const session = createUiSessionState({
    activeTab: "profile",
    tabHistory: ["feed", "cart"],
    progressHubPane: "progress",
    progressSection: "goals",
    rewardsPane: "rewards",
    heroCarouselIndex: 2,
    profileEditMode: "profile",
    profileDraft: { firstName: "Ada", bio: "unfinished" },
    priceEditor: {
      item: { id: "coffee", title: "Coffee" },
      value: "12.50",
      title: "Morning coffee",
      emoji: "☕️",
      category: "food",
      description: "draft",
      frequency: "daily",
      frequencyCustom: null,
      frequencyReminderHour: 9,
      frequencyReminderMinute: 30,
      frequencyWeeklyDay: 1,
      frequencyMonthlyDay: 1,
      frequencyWeeklyDays: [1, 3],
      frequencyMonthlyDays: [1, 15],
      initialFrequency: "daily",
      scheduleConfigVisible: true,
      isDuplicateCopy: false,
    },
    now: 123,
  });

  const restored = normalizeUiSessionState(JSON.stringify(session));
  assert.equal(restored.activeTab, "profile");
  assert.deepEqual(restored.tabHistory, ["feed", "cart"]);
  assert.equal(restored.navigation.progressSection, "goals");
  assert.equal(restored.navigation.heroCarouselIndex, 2);
  assert.equal(restored.profileEditor.draft.bio, "unfinished");
  assert.equal(restored.priceEditor.item.id, "coffee");
  assert.equal(restored.priceEditor.value, "12.50");
  assert.equal(restored.updatedAt, 123);
});

test("explicitly closed editors are not restored", () => {
  const session = createUiSessionState({
    activeTab: "feed",
    profileEditMode: "none",
    profileDraft: { firstName: "Saved" },
    priceEditor: { item: null, value: "99" },
    showCustomSpend: false,
    newPendingModal: { visible: false, title: "Discarded" },
    newGoalModal: { visible: false, name: "Discarded" },
    goalEditorPrompt: { visible: false, name: "Discarded" },
    now: 456,
  });

  assert.equal(session.profileEditor, null);
  assert.equal(session.priceEditor, null);
  assert.equal(session.quickTemptationEditor, null);
  assert.equal(session.pendingEditor, null);
  assert.equal(session.goalEditor, null);
  assert.equal(session.linkedGoalEditor, null);
});

test("restores unfinished settings edits with their own scope", () => {
  const session = createUiSessionState({
    activeTab: "profile",
    profileEditMode: "settings",
    profileDraft: { firstName: "Ada", incomePayday: 18 },
    now: 321,
  });

  const restored = normalizeUiSessionState(JSON.stringify(session));
  assert.equal(restored.profileEditor.mode, "settings");
  assert.equal(restored.profileEditor.draft.incomePayday, 18);
});

test("rejects malformed sessions and unsafe navigation values", () => {
  assert.equal(normalizeUiSessionState("not json"), null);
  assert.equal(normalizeUiSessionState({ version: 999 }), null);

  const restored = normalizeUiSessionState({
    version: 1,
    activeTab: "admin",
    tabHistory: ["feed", "admin", "feed", 42],
    navigation: {
      progressHubPane: "unknown",
      progressSection: "unknown",
      rewardsPane: "unknown",
      heroCarouselIndex: -10,
    },
    profileEditor: { mode: "admin", draft: { name: "Ignored" } },
    priceEditor: { item: { missingId: true } },
  });

  assert.equal(restored.activeTab, "feed");
  assert.deepEqual(restored.tabHistory, ["feed"]);
  assert.equal(restored.navigation.progressHubPane, "progress");
  assert.equal(restored.navigation.progressSection, "overview");
  assert.equal(restored.navigation.rewardsPane, "rewards");
  assert.equal(restored.navigation.heroCarouselIndex, 0);
  assert.equal(restored.profileEditor, null);
  assert.equal(restored.priceEditor, null);
});

test("Rewards routing retains the requested destination from every Progress section", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const vm = require("node:vm");
  const source = fs.readFileSync(path.join(__dirname, "../../App.js"), "utf8");
  const start = source.indexOf("  const handleProgressSectionChange = useCallback");
  const end = source.indexOf("  const resolveMainTabLabel", start);
  assert.ok(start > 0 && end > start);
  for (const section of ["overview", "goals", "insights", "challenges"]) {
    const state = { tab: "feed", section, pane: "progress", scroll: 1800 };
    const context = vm.createContext({
      useCallback: (fn) => fn,
      setProgressSection: (next) => { state.section = next; },
      setProgressHubPane: (next) => { state.pane = next; },
      goToTab: (next) => { state.tab = next; },
      progressScrollRef: { current: { scrollTo: ({ y }) => { state.scroll = y; } } },
      logEvent: () => {},
    });
    vm.runInContext(source.slice(start, end) + '\nhandleProgressSectionChange("rewards");', context);
    assert.equal(state.tab, "cart");
    assert.equal(state.pane, "rewards");
    assert.equal(state.scroll, 0);
    vm.runInContext('handleProgressSectionChange("challenges");', context);
    assert.equal(state.pane, "progress");
    assert.equal(state.section, "challenges");
    vm.runInContext('handleProgressSectionChange("rewards");', context);
    assert.equal(state.pane, "rewards");
  }
});

test("Rewards detail consumes Back once and releases its handler on unmount", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const vm = require("node:vm");
  const source = fs.readFileSync(path.join(__dirname, "../../App.js"), "utf8");
  const start = source.indexOf("  useEffect(() => {", source.indexOf("const [redesignRewardsDetails"));
  const end = source.indexOf("  const claimableReward", start);
  assert.ok(start > 0 && end > start);
  for (const detail of [true, false]) {
    let handler, cleanup, removed = false, nextDetail = detail;
    const context = vm.createContext({
      redesignRewardsDetails: detail,
      setRedesignRewardsDetails: (value) => { nextDetail = value; },
      useEffect: (fn) => { cleanup = fn(); },
      BackHandler: { addEventListener: (_event, fn) => { handler = fn; return { remove: () => { removed = true; } }; } },
    });
    vm.runInContext(source.slice(start, end), context);
    assert.equal(handler(), detail);
    assert.equal(nextDetail, false);
    cleanup();
    assert.equal(removed, true);
  }
});

test("continuing after a series reward only dismisses the modal, without navigation or scroll", () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = fs.readFileSync(require("node:path").join(__dirname, "../../App.js"), "utf8");
  const ast = require("@babel/parser").parse(source, { sourceType: "module", plugins: ["jsx"] });
  let callback;
  require("@babel/traverse").default(ast, { VariableDeclarator(path) {
    if (path.node.id.name === "handleTemptationSeriesContinue") callback = path.node.init.arguments[0];
  } });
  assert.ok(callback);
  const events = [];
  // Any attempt to call the former scroll/state setters is an undefined reference here.
  const context = { setTemptationSeriesModalVisible: (visible) => events.push(["visible", visible]), queueModalCloseSettle: () => events.push(["settle"]) };
  vm.runInNewContext(`(${source.slice(callback.start, callback.end)})()`, context);
  assert.deepEqual(events, [["visible", false], ["settle"]]);
});

test("shared challenge cards keep claim/start/cancel reachable and explain locked/active states", () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = fs.readFileSync(require("node:path").join(__dirname, "../../App.js"), "utf8");
  const start = source.indexOf("const ChallengeTaskCard =");
  const end = source.indexOf("const ProgressScreen =", start);
  const code = require("@babel/core").transformSync(source.slice(start, end), { configFile: false, babelrc: false, plugins: [require.resolve("@babel/plugin-transform-react-jsx")] }).code;
  const React = { memo: (fn) => fn, createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat().filter(Boolean) }) };
  const context = vm.createContext({ React, View: "View", Text: "Text", TouchableOpacity: "Button", ChestRewardPreviewIcon: "Chest", styles: {}, CHALLENGE_STATUS: { ACTIVE: "active" } });
  vm.runInContext(`${code}\nthis.renderCard = ChallengeTaskCard;`, context);
  function flatten(node) { return typeof node === "object" ? [node, ...(node.children || []).flatMap(flatten)] : []; }
  for (const state of ["ready", "active", "claim", "locked", "complete"]) {
    const events = [];
    const challenge = { title: "Example", description: "Description", progressLabel: "1/3", status: state, canClaim: state === "claim", canStart: state === "ready" || state === "locked", isLevelLocked: state === "locked", actionLabel: state, unlockLevel: 4, progressPercent: 1 / 3 };
    const tree = context.renderCard({ challenge, colors: { primary: "accent", onPrimary: "foreground" }, t: (key) => key, isPrimary: true, handleActionPress: () => events.push("action"), confirmCancel: () => events.push("cancel") });
    const nodes = flatten(tree);
    const buttons = nodes.filter((node) => node.type === "Button");
    assert.equal(buttons.length, ["ready", "claim", "active"].includes(state) ? 1 : 0, state);
    buttons.forEach((button) => button.props.onPress());
    assert.deepEqual(events, ["ready", "claim"].includes(state) ? ["action"] : state === "active" ? ["cancel"] : [], state);
    assert.equal(nodes.find((node) => node.props.accessibilityRole === "progressbar").props.accessibilityValue.now, 33);
    if (state === "locked") assert.ok(nodes.some((node) => node.children.includes("challengeLockedLevel")));
  }
});

test("practical tutorial waits for the actual decision and recovers from cancellation/failure", async () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = fs.readFileSync(require("node:path").join(__dirname, "../../App.js"), "utf8");
  const ast = require("@babel/parser").parse(source, { sourceType: "module", plugins: ["jsx"] });
  let callback;
  require("@babel/traverse").default(ast, { VariableDeclarator(path) {
    if (path.node.id.name === "onTemptationAction" && path.node.init?.callee?.name === "useCallback") callback = path.node.init.arguments[0];
  } });
  assert.ok(callback);
  const code = source.slice(callback.start, callback.end);
  const { INITIAL_PRACTICE_TUTORIAL, practiceTutorialReducer } = require("../../src/utils/practiceTutorial");
  for (const result of [{ committed: true }, { committed: true, type: "pause" }, { cancelled: true }, undefined, new Error("failed")]) {
    let state = { ...INITIAL_PRACTICE_TUTORIAL, stage: "action" }, finish;
    const args = [];
    const context = { practiceSession: 0, emitPracticeEvent: (type, detail) => { state = practiceTutorialReducer(state, { type, ...detail }); },
      commitTemptationAction: (...values) => { args.push(values); return new Promise((resolve, reject) => { finish = () => result instanceof Error ? reject(result) : resolve(result); }); },
    };
    const action = vm.runInNewContext(`(${code})`, context);
    const item = { id: "real-card" }, options = { amountUSD: 8 };
    const pending = action("save", item, options);
    assert.equal(state.stage, "pending");
    assert.deepEqual(args, [["save", item, options]], "actual product handler receives the unchanged item and amount");
    finish();
    if (result instanceof Error) await assert.rejects(pending, /failed/); else assert.equal(await pending, result);
    assert.equal(state.stage, result?.committed ? "result" : "action");
  }
});
