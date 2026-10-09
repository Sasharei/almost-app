const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const babel = require("@babel/core");
const parser = require("@babel/parser");
const app = fs.readFileSync("App.js", "utf8");
const ast = parser.parse(app, { sourceType: "module", plugins: ["jsx"] });
const declarations = new Map();
function visit(node) {
  if (!node || typeof node !== "object") return;
  if (node.type === "VariableDeclarator" && node.id.type === "Identifier") declarations.set(node.id.name, node.init);
  for (const value of Object.values(node)) for (const child of Array.isArray(value) ? value : [value]) visit(child);
}
visit(ast);
function source(name, callback = false) {
  const node = declarations.get(name);
  const selected = callback ? node.arguments[0] : node;
  return app.slice(selected.start, selected.end);
}
function evaluate(name, context, callback = false) {
  return vm.runInNewContext(`(${source(name, callback)})`, context);
}
const now = Date.UTC(2026, 9, 7, 9);
const hour = 3600000;
const clock = class extends Date { static now() { return now; } };
const pressureContext = {
  Date: clock, TAMAGOTCHI_START_STATE: { hunger: 100, mood: 100 },
  TAMAGOTCHI_MAX_HUNGER: 100, TAMAGOTCHI_NEED_ATTENTION_THRESHOLD: 30,
  TAMAGOTCHI_NEED_URGENT_THRESHOLD: 10, TAMAGOTCHI_LOW_MOOD_THRESHOLD: 30,
  TAMAGOTCHI_PLAY_NEGLECT_MS: 24 * hour,
  normalizeTamagotchiStateValue: (value, fallback) => value ?? fallback,
};
const pressure = evaluate("resolveTamagotchiCarePressure", pressureContext);

test("party protection suppresses hunger copy through its exact expiry without hiding play needs", () => {
  const state = { hunger: 0, mood: 100, hungerImmunityUntil: now + 12 * hour };
  assert.equal(pressure(state, now).hungry, false);
  assert.equal(pressure(state, now).starving, false);
  assert.equal(pressure(state, state.hungerImmunityUntil - 1).hungry, false);
  assert.equal(pressure(state, state.hungerImmunityUntil).hungry, true);
  assert.equal(pressure({ ...state, mood: 0 }, now).neglected, true);
  assert.equal(pressure({ ...state, hungerImmunityUntil: 0 }, now).starving, true);
});

const threshold = evaluate("estimateTamagotchiHungerThresholdAt", {
  ...pressureContext, TAMAGOTCHI_HUNGER_LOW_THRESHOLD: 30,
  TAMAGOTCHI_DECAY_STEP: 10, TAMAGOTCHI_DECAY_INTERVAL_MS: hour,
  computeTamagotchiDecay: (state, at) => ({ state: { ...state,
    hunger: Math.max(0, state.hunger - Math.floor(Math.max(0, at - Math.max(state.lastDecayAt, state.hungerImmunityUntil || 0)) / hour) * 10),
  } }),
});
test("hunger thresholds preserve the full post-party decay window, including prolonged protection", () => {
  for (const duration of [0, 12 * hour, 100 * hour]) {
    const state = { hunger: 100, hungerImmunityUntil: now + duration };
    assert.equal(threshold(state, 30, now), now + duration + 7 * hour);
    assert.equal(threshold(state, 0, now), now + duration + 10 * hour);
    assert.equal(threshold({ ...state, hunger: 0 }, 0, now), now + duration);
  }
});

function hungerFixture({ protectedUntil = 0, pending = false } = {}) {
  const events = [];
  const revision = { current: 0 };
  let finish;
  const context = {
    Date: clock, notificationPermissionGranted: true,
    tamagotchiState: { hunger: 100, hungerImmunityUntil: protectedUntil },
    tamagotchiHungerScheduleRevisionRef: revision,
    TAMAGOTCHI_MAX_HUNGER: 100, TAMAGOTCHI_HUNGER_LOW_THRESHOLD: 30,
    TAMAGOTCHI_HUNGER_NOTIFICATION_WINDOW_MS: 12 * hour,
    getTamagotchiHungerLastAt: () => 0, estimateTamagotchiHungerThresholdAt: threshold,
    cancelTamagotchiHungerNotifications: async () => { events.push("cancel-old"); },
    persistTamagotchiHungerNotificationIds: (ids) => { events.push({ ids }); },
    scheduleNotificationWithCooldown: async (payload) => {
      events.push({ payload });
      if (pending) await new Promise((resolve) => { finish = resolve; });
      return { id: "new" };
    },
    safeNotifications: { cancelScheduledNotificationAsync: async (id) => events.push({ cancelled: id }) },
    Platform: { OS: "ios" }, t: (key) => key,
  };
  return { run: evaluate("scheduleTamagotchiHungerNotifications", context, true), events, revision, release: () => finish() };
}
test("party replaces old hunger pushes and schedules the first actual hunger threshold after immunity", async () => {
  const fixture = hungerFixture({ protectedUntil: now + 12 * hour });
  await fixture.run();
  assert.equal(fixture.events[0], "cancel-old");
  const payload = fixture.events.find((event) => event.payload).payload;
  assert.equal(payload.trigger.getTime(), now + 19 * hour);
  assert.equal(payload.content.body, "tamagotchiHungerNotificationLowBody");
});
test("a party activated during an OS scheduling wait cancels the stale push instead of persisting it", async () => {
  const fixture = hungerFixture({ pending: true });
  const task = fixture.run();
  await new Promise((resolve) => setImmediate(resolve));
  fixture.revision.current += 1;
  fixture.release();
  await task;
  assert.ok(fixture.events.some((event) => event.cancelled === "new"));
  assert.equal(fixture.events.some((event) => event.ids), false);
});

test("miss-you push chooses neutral or play copy during protection, hungry copy after expiration", async () => {
  for (const [duration, mood, expected] of [
    [12 * hour, 100, "tamagotchiMissYouNotificationBody"],
    [12 * hour, 0, "tamagotchiMissYouNotificationBodyNeglected"],
    [0, 100, "tamagotchiMissYouNotificationBodyHungry"],
  ]) {
    let payload;
    const run = evaluate("scheduleTamagotchiMissYouNotification", {
      ...pressureContext, tamagotchiMissYouScheduleRevisionRef: { current: 0 },
      persistTamagotchiLastActiveAt: (at) => at, notificationPermissionGranted: true, onboardingStep: "done",
      cancelTamagotchiMissYouNotification: async () => {}, TAMAGOTCHI_MISS_YOU_INACTIVITY_MS: 6 * hour,
      tamagotchiState: { hunger: 0, mood, hungerImmunityUntil: now + duration },
      computeTamagotchiDecay: (state) => ({ state }), resolveTamagotchiCarePressure: pressure,
      scheduleNotificationWithCooldown: async (request) => { payload = request; return { id: "miss" }; },
      persistTamagotchiMissYouNotificationId: () => {}, Platform: { OS: "android" },
      TAMAGOTCHI_MISS_YOU_NOTIFICATION_KIND: "miss-you", ANDROID_TAMAGOTCHI_CHANNEL_ID: "cat", t: (key) => key,
    }, true);
    await run(now);
    assert.equal(payload.content.body, expected);
  }
});

test("an immediate hunger push rechecks protection after asynchronous permission/cooldown checks", async () => {
  let schedules = 0;
  const run = evaluate("sendImmediateNotification", {
    Date: clock, startupHardLockPendingBeforePaywall: false,
    runScheduledNotificationTransaction: async (task) => task(),
    PUSH_DEDUPE_WINDOW_MS: hour, IDENTICAL_PUSH_TIME_WINDOW_MS: hour,
    Platform: { OS: "ios" }, buildNotificationContentSignature: () => null,
    ensureNotificationPermission: async () => true, isNotificationOnCooldown: async () => false,
    safeNotifications: { scheduleNotificationAsync: async () => { schedules++; return "id"; } },
  }, true);
  assert.equal(await run({ body: "hungry" }, { shouldSend: () => false }), false);
  assert.equal(schedules, 0);
});

test("closed series cards hide coin text and accessibility amounts, while opened rewards remain readable", () => {
  const React = { memo: (fn) => fn, createElement: (type, props, ...children) => ({ type, props, children }) };
  const code = babel.transformSync(`(${source("TemptationSeriesProgressCard")})`, {
    configFile: false, babelrc: false, plugins: ["@babel/plugin-transform-react-jsx"],
  }).code;
  const render = vm.runInNewContext(code, {
    React, normalizeTemptationSeriesState: (value) => value,
    getTemptationSeriesDisplayProgress: () => ({ total: 3, completed: 2, remaining: 1 }),
    TEMPTATION_SERIES_STATUS: { READY: "ready", CLAIMED: "claimed", IDLE: "idle" },
    getChestRewardTierForAmount: () => ({ assets: { open: "open", closed: "closed" } }),
    DEFAULT_CHEST_REWARD_TIER: {}, getHealthCoinTierForAmount: () => ({ asset: "coin" }),
    GREEN_HEALTH_COIN_ASSET: "coin", PlatformPressable: "button", PlatformSurface: "surface",
    PlatformTouchableOpacity: "button", View: "view", Text: "text", Image: "image", TemptationSeriesCheckIcon: "check",
    styles: {}, StyleSheet: { hairlineWidth: 1 }, colorWithAlpha: (color) => color,
  });
  for (const compact of [true, false]) for (const status of ["active", "ready", "claimed"]) {
    const tree = render({ compact, series: { status, pendingCoins: 123, claimedCoins: 123 }, colors: {},
      t: (key, params) => key === "temptationSeriesChestBalance" ? `balance:${params.coins}` : key });
    const serialized = JSON.stringify(tree);
    assert.equal(serialized.includes("123"), status === "claimed", `${compact}/${status}`);
    assert.equal(serialized.includes('"open"'), status === "claimed");
  }
});

test("every supported language coin push preserves the amount and drops game-currency wording", () => {
  const generated = fs.readFileSync("src/constants/translations.generated.js", "utf8").replace(/export const /g, "const ");
  const dictionaries = fs.readFileSync("src/constants/translations.js", "utf8").replace(/^import .*;\n/gm, "").replace(/export const /g, "const ");
  const translations = vm.runInNewContext(generated + "\n" + dictionaries + "\nTRANSLATIONS");
  const forbidden = /in.game|игров|de jeu|del juego|Spielbelohnung|do jogo|del gioco|داخل اللعبة|遊戲|游戏|게임 보상|ゲーム内/;
  for (const [language, dictionary] of Object.entries(translations)) {
    assert.ok(dictionary.tamagotchiHourlyRewardPushBody.includes("{{amount}}"), language);
    assert.equal(forbidden.test(dictionary.tamagotchiHourlyRewardPushBody), false, language);
  }
});

function findHourlyScheduleEffect(node) {
  if (!node || typeof node !== "object") return null;
  if (node.type === "CallExpression" && node.callee?.name === "useEffect" &&
      app.slice(node.start, node.end).includes("const notificationCopyKey =")) return node.arguments[0];
  for (const value of Object.values(node)) for (const child of Array.isArray(value) ? value : [value]) {
    const found = findHourlyScheduleEffect(child);
    if (found) return found;
  }
  return null;
}
test("scheduled coin push refreshes obsolete copy at the same time and reuses current language copy", async () => {
  const effect = findHourlyScheduleEffect(ast);
  for (const current of [false, true]) {
    const events = [];
    let state = {
      scheduledHourlyRewardNotificationId: "old",
      scheduledHourlyRewardNotificationAt: now + 6 * hour,
      scheduledHourlyRewardNotificationCopyKey: current ? "revision:en" : "old:en",
    };
    const status = { ready: false, eligible: true, nextReadyAt: now + 6 * hour };
    const context = {
      Date: clock, startupHardLockPendingBeforePaywall: false, onboardingStep: "done",
      tamagotchiHydratedRef: { current: true }, tamagotchiState: state,
      tamagotchiHourlyRewardStatus: status, language: "en", NOTIFICATION_COPY_REVISION: "revision",
      TAMAGOTCHI_HOURLY_REWARD_NOTIFICATION_MIN_DELAY_MS: 1000,
      TAMAGOTCHI_HOURLY_REWARD_INTERVAL_MS: hour, tamagotchiHourlyRewardScheduleInFlightRef: { current: 0 },
      computeTamagotchiDecay: (value) => ({ state: value }),
      advanceTamagotchiHourlyRewardState: () => ({ pendingHourlyReward: 6, pendingHourlyRewardHours: 6 }),
      ensureNotificationPermission: async () => true, Platform: { OS: "ios" }, t: (key) => key,
      resolveTamagotchiHourlyRewardStatus: () => status,
      safeNotifications: {
        cancelScheduledNotificationAsync: async (id) => events.push({ cancel: id }),
        scheduleNotificationAsync: async (request) => { events.push({ request }); return "new"; },
      },
      setTamagotchiState: (update) => { state = update(state); }, logEvent: () => {},
    };
    vm.runInNewContext(`(${app.slice(effect.start, effect.end)})`, context)();
    await new Promise((resolve) => setImmediate(resolve));
    if (current) assert.equal(events.length, 0);
    else {
      assert.equal(events[0].cancel, "old");
      assert.equal(events[1].request.trigger.getTime(), now + 6 * hour);
      assert.equal(state.scheduledHourlyRewardNotificationCopyKey, "revision:en");
      assert.equal(state.scheduledHourlyRewardNotificationId, "new");
    }
  }
});

test("miss-you scheduling interrupted by a party discards the OS result", async () => {
  const revision = { current: 0 };
  const cancelled = [];
  const persisted = [];
  let finish;
  const run = evaluate("scheduleTamagotchiMissYouNotification", {
    ...pressureContext, tamagotchiMissYouScheduleRevisionRef: revision,
    persistTamagotchiLastActiveAt: (at) => at, notificationPermissionGranted: true, onboardingStep: "done",
    cancelTamagotchiMissYouNotification: async () => {}, TAMAGOTCHI_MISS_YOU_INACTIVITY_MS: 6 * hour,
    tamagotchiState: { hunger: 0, mood: 100 }, computeTamagotchiDecay: (state) => ({ state }),
    resolveTamagotchiCarePressure: pressure,
    scheduleNotificationWithCooldown: async () => {
      await new Promise((resolve) => { finish = resolve; }); return { id: "stale" };
    },
    safeNotifications: { cancelScheduledNotificationAsync: async (id) => cancelled.push(id) },
    persistTamagotchiMissYouNotificationId: (id) => persisted.push(id), Platform: { OS: "android" },
    TAMAGOTCHI_MISS_YOU_NOTIFICATION_KIND: "miss-you", ANDROID_TAMAGOTCHI_CHANNEL_ID: "cat", t: (key) => key,
  }, true);
  const task = run(now);
  await new Promise((resolve) => setImmediate(resolve));
  revision.current += 1;
  finish();
  await task;
  assert.deepEqual(cancelled, ["stale"]);
  assert.deepEqual(persisted, []);
});

function immediateFixture({ failFirst = false } = {}) {
  const events = [];
  const last = { current: 0 };
  const context = {
    Date: clock, startupHardLockPendingBeforePaywall: false,
    PUSH_DEDUPE_WINDOW_MS: hour, IDENTICAL_PUSH_TIME_WINDOW_MS: 90000,
    Platform: { OS: "ios" },
    buildNotificationContentSignature: (content) => `${content.title}|${content.body}`,
    notificationDedupeRef: { current: new Map() },
    notificationContentDedupeRef: { current: new Map() },
    notificationScheduleQueueRef: { current: Promise.resolve() },
    lastInstantNotificationRef: last, pruneNotificationSignatureMap: () => {},
    ensureNotificationPermission: async () => { await new Promise((resolve) => setImmediate(resolve)); return true; },
    isNotificationOnCooldown: async () => last.current > 0,
    safeNotifications: { scheduleNotificationAsync: async (request) => {
      events.push(request);
      await new Promise((resolve) => setImmediate(resolve));
      return failFirst && events.length === 1 ? null : `id-${events.length}`;
    } },
    AsyncStorage: { setItem: async () => {} }, STORAGE_KEYS: { LAST_NOTIFICATION_AT: "last" },
  };
  context.runScheduledNotificationTransaction = evaluate("runScheduledNotificationTransaction", context, true);
  return { run: evaluate("sendImmediateNotification", context, true), events, context };
}

test("parallel identical immediate reminders schedule only one notification", async () => {
  const fixture = immediateFixture();
  const content = { title: "Almi", body: "Reward ready" };
  const results = await Promise.all([fixture.run(content), fixture.run(content)]);
  assert.deepEqual(results, [true, false]);
  assert.equal(fixture.events.length, 1);
});

test("parallel distinct immediate reminders respect the global cooldown", async () => {
  const fixture = immediateFixture();
  const results = await Promise.all([
    fixture.run({ title: "Almi", body: "Reward ready" }),
    fixture.run({ title: "Budget", body: "Review today" }),
  ]);
  assert.deepEqual(results, [true, false]);
  assert.equal(fixture.events.length, 1);
});

test("failed immediate scheduling permits a queued retry", async () => {
  const fixture = immediateFixture({ failFirst: true });
  const content = { title: "Almi", body: "Reward ready" };
  const results = await Promise.all([fixture.run(content), fixture.run(content)]);
  assert.deepEqual(results, [false, true]);
  assert.equal(fixture.events.length, 2);
});
