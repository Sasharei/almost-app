const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const load = (os, granted = true, clock = Date) => {
  const calls = { tokens: 0, autoInit: [], scheduled: [], urls: [], timers: new Map(), removed: 0 };
  let receive;
  let resume;
  const api = {
    getMessaging: () => ({ isDeviceRegisteredForRemoteMessages: true }),
    getToken: async () => { calls.tokens += 1; },
    setAutoInitEnabled: async (_, enabled) => calls.autoInit.push(enabled),
    onMessage: (_, handler) => { receive = handler; return () => { calls.removed += 1; }; },
    onNotificationOpenedApp: () => () => { calls.removed += 1; },
    getInitialNotification: async () => null,
    setBackgroundMessageHandler: (_, handler) => { calls.background = handler; },
  };
  const notifications = {
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
    getPermissionsAsync: async () => ({ granted }),
    setNotificationChannelAsync: async () => {},
    scheduleNotificationAsync: async (value) => calls.scheduled.push(value),
  };
  const source = fs.readFileSync(path.join(__dirname, "../../src/notifications/cloudNotifications.js"), "utf8")
    .replace(/^import .*;\n/gm, "").replace(/export /g, "");
  const exports = new Function("AppState", "Linking", "Platform", "Notifications", "require", "setTimeout", "clearTimeout", "Date", `${source}\nreturn { startCloudNotifications, openCloudAnnouncement, configureCloudNotificationBackgroundHandler };`)(
    { addEventListener: (_, handler) => { resume = handler; return { remove: () => { calls.removed += 1; } }; } },
    { openURL: async (url) => calls.urls.push(url) }, { OS: os }, notifications, () => api,
    (fn) => { calls.timers.set(1, fn); return 1; }, (id) => calls.timers.delete(id), clock,
  );
  return { ...exports, calls, api, setPermission: (value) => { granted = value; }, receive: (message) => receive(message), resume: () => resume("active") };
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("registration respects denied permission without an extra prompt", async () => {
  const state = load("android", false);
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  assert.equal(state.calls.tokens, 0);
  assert.deepEqual(state.calls.autoInit, []);
  stop();
  assert.equal(state.calls.removed, 3);
});
test("Android foreground shows one banner and preserves custom data", async () => {
  const state = load("android");
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  await state.receive({ messageId: "test", notification: { title: "Release", body: "8.0.0" }, data: { kind: "app_update" } });
  assert.equal(state.calls.tokens, 1);
  assert.equal(state.calls.scheduled.length, 1);
  assert.equal(state.calls.scheduled[0].trigger.channelId, "app-announcements");
  assert.deepEqual(state.calls.scheduled[0].content.data, { kind: "app_update" });
  await state.receive({ data: { command: "untrusted" } });
  assert.equal(state.calls.scheduled.length, 1);
  stop();
});
test("iOS uses native presentation and fixed store destination", async () => {
  const state = load("ios");
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  await state.receive({ notification: { title: "Release" } });
  assert.equal(state.calls.scheduled.length, 0);
  assert.equal(state.openCloudAnnouncement({ url: "https://untrusted.test" }), false);
  assert.equal(state.openCloudAnnouncement({ kind: "app_update", url: "https://untrusted.test" }), true);
  assert.deepEqual(state.calls.urls, ["https://apps.apple.com/app/id6756276744"]);
  state.openCloudAnnouncement({ kind: "app_update" });
  assert.equal(state.calls.urls.length, 1);
  stop();
});
test("transient registration failures retry and cleanup cancels retry", async () => {
  const state = load("android");
  state.api.getToken = async () => { throw new Error("offline"); };
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  assert.equal(state.calls.timers.size, 1);
  state.api.getToken = async () => { state.calls.tokens += 1; };
  state.resume();
  await flush();
  assert.equal(state.calls.tokens, 1);
  assert.equal(state.calls.timers.size, 0);
  stop();
});
test("background messages never schedule a duplicate", async () => {
  const state = load("ios");
  state.configureCloudNotificationBackgroundHandler();
  await state.calls.background({ notification: { title: "Release" } });
  assert.equal(state.calls.scheduled.length, 0);
});
test("cold-start update tap survives permission/language effect restart", async () => {
  const state = load("android");
  let deliver;
  state.api.getInitialNotification = () => new Promise((resolve) => { deliver = resolve; });
  const stopFirst = state.startCloudNotifications({ channelName: "News" });
  stopFirst();
  const stopSecond = state.startCloudNotifications({ channelName: "Новости" });
  deliver({ data: { kind: "app_update" } });
  await flush();
  assert.deepEqual(state.calls.urls, ["https://play.google.com/store/apps/details?id=com.sasarei.almostclean"]);
  stopSecond();
});

for (const platform of ["ios", "android"]) {
  test(`${platform}: granting notification permission enables cloud messages without another opt-in`, async () => {
    const state = load(platform, false);
    const stop = state.startCloudNotifications({ channelName: "News" });
    await flush();
    assert.equal(state.calls.tokens, 0);
    state.setPermission(true);
    state.resume();
    await flush();
    assert.deepEqual(state.calls.autoInit, [true]);
    assert.equal(state.calls.tokens, 1);
    stop();
    const stopAfterRestart = state.startCloudNotifications({ channelName: "News" });
    await flush();
    assert.deepEqual(state.calls.autoInit, [true, true]);
    assert.equal(state.calls.tokens, 2);
    stopAfterRestart();
  });
}

test("Android suppresses parallel redelivery and identical announcements with different IDs", async () => {
  const state = load("android");
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  const message = { messageId: "same", notification: { title: "Release", body: "8.0.0" }, data: { kind: "app_update" } };
  await Promise.all([state.receive(message), state.receive(message), state.receive({ ...message, messageId: "other" })]);
  assert.equal(state.calls.scheduled.length, 1);
  stop();
  const stopRestarted = state.startCloudNotifications({ channelName: "Новости" });
  await state.receive(message);
  assert.equal(state.calls.scheduled.length, 1);
  await state.receive({ messageId: "new", notification: { title: "Other", body: "Different news" } });
  assert.equal(state.calls.scheduled.length, 2);
  stopRestarted();
});

test("Android announcement presentation failure permits retry", async () => {
  const state = load("android");
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  const message = { messageId: "retry", notification: { title: "Release" } };
  // A rejected native scheduling call must release both dedupe reservations.
  const originalPush = state.calls.scheduled.push;
  state.calls.scheduled.push = () => { throw new Error("native unavailable"); };
  await state.receive(message);
  state.calls.scheduled.push = originalPush;
  await state.receive(message);
  assert.equal(state.calls.scheduled.length, 1);
  stop();
});

test("Android allows later announcements but retains a previously shown message ID", async () => {
  let now = 1000000;
  const state = load("android", true, { now: () => now });
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  const message = { messageId: "first", notification: { title: "Release", body: "8.0.0" } };
  await state.receive(message);
  now += 90000;
  await state.receive(message);
  assert.equal(state.calls.scheduled.length, 1);
  await state.receive({ ...message, messageId: "later" });
  assert.equal(state.calls.scheduled.length, 2);
  now += 24 * 60 * 60 * 1000;
  await state.receive(message);
  assert.equal(state.calls.scheduled.length, 3);
  stop();
});
