const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const load = (os, granted = true, clock = Date) => {
  const calls = { tokens: 0, deleted: 0, registered: 0, unregistered: 0, operations: [], autoInit: [], scheduled: [], urls: [], timers: new Map(), removed: 0 };
  let receive;
  let resume;
  const messaging = { isDeviceRegisteredForRemoteMessages: true };
  const api = {
    getMessaging: () => messaging,
    getToken: async () => { calls.tokens += 1; calls.operations.push("token"); },
    deleteToken: async () => { calls.deleted += 1; calls.operations.push("delete"); },
    registerDeviceForRemoteMessages: async () => {
      calls.registered += 1; calls.operations.push("register"); messaging.isDeviceRegisteredForRemoteMessages = true;
    },
    unregisterDeviceForRemoteMessages: async () => {
      calls.unregistered += 1; calls.operations.push("unregister"); messaging.isDeviceRegisteredForRemoteMessages = false;
    },
    setAutoInitEnabled: async (_, enabled) => { calls.autoInit.push(enabled); calls.operations.push(`auto:${enabled}`); },
    onMessage: (_, handler) => { receive = handler; return () => { calls.removed += 1; }; },
    onNotificationOpenedApp: () => () => { calls.removed += 1; },
    getInitialNotification: async () => null,
    setBackgroundMessageHandler: (_, handler) => { calls.background = handler; },
  };
  const notifications = {
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
    getPermissionsAsync: async () => typeof granted === "object" ? granted : ({ granted }),
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
  assert.deepEqual(state.calls.autoInit, [false]);
  assert.equal(state.calls.deleted, 1);
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
  assert.deepEqual(state.calls.scheduled[0].content.data, { kind: "app_update", notificationSource: "cloud" });
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
    assert.deepEqual(state.calls.autoInit, [false, true]);
    assert.equal(state.calls.tokens, 1);
    stop();
    const stopAfterRestart = state.startCloudNotifications({ channelName: "News" });
    await flush();
    assert.deepEqual(state.calls.autoInit, [false, true, true]);
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

test("Android foreground uses the injected shared anti-spam gate without a direct-SDK fallback", async () => {
  const state = load("android");
  const requests = [];
  const stop = state.startCloudNotifications({ channelName: "News", scheduleNotification: async (request) => {
    requests.push(request);
    return null; // The shared budget suppresses this banner.
  } });
  await flush();
  await state.receive({ messageId: "guarded", notification: { title: "Release", body: "8.0.0" }, data: { kind: "app_update" } });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].content.data.kind, "app_update");
  assert.equal(state.calls.scheduled.length, 0);
  stop();
});

test("revoking OS permission suppresses Android foreground banners from an existing FCM registration", async () => {
  const state = load("android");
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  state.setPermission(false);
  await state.receive({ messageId: "revoked", notification: { title: "Release", body: "8.0.0" } });
  assert.equal(state.calls.scheduled.length, 0);
  stop();
});

for (const platform of ["ios", "android"]) {
  test(`${platform}: permission revocation deletes the token before a later grant obtains a new one`, async () => {
    const state = load(platform);
    const stop = state.startCloudNotifications({ channelName: "News" });
    await flush();
    state.setPermission(false);
    state.resume();
    await flush();
    assert.deepEqual(state.calls.operations, platform === "ios"
      ? ["auto:true", "token", "auto:false", "delete", "unregister"]
      : ["auto:true", "token", "auto:false", "delete"]);
    assert.equal(state.calls.scheduled.length, 0);
    state.setPermission(true);
    state.resume();
    await flush();
    assert.equal(state.calls.tokens, 2);
    assert.equal(state.calls.registered, platform === "ios" ? 1 : 0);
    assert.equal(state.calls.autoInit.at(-1), true);
    stop();
  });
}

test("iOS still revokes APNs registration when token deletion fails, then retries deletion", async () => {
  const state = load("ios", false);
  const deleteToken = state.api.deleteToken;
  let attempts = 0;
  state.api.deleteToken = async (...args) => {
    attempts += 1;
    if (attempts === 1) throw Error("offline");
    return deleteToken(...args);
  };
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  assert.equal(state.calls.unregistered, 1);
  assert.equal(state.calls.tokens, 0);
  assert.equal(state.calls.timers.size, 1);
  state.calls.timers.values().next().value();
  await flush();
  assert.equal(attempts, 2);
  assert.equal(state.calls.deleted, 1);
  assert.equal(state.calls.timers.size, 0);
  stop();
});

test("permission revoked during getToken is reconciled without another foreground event", async () => {
  const state = load("android");
  let finishToken;
  state.api.getToken = () => new Promise((resolve) => { finishToken = resolve; });
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  state.setPermission(false);
  finishToken();
  await flush();
  assert.deepEqual(state.calls.autoInit, [true, false]);
  assert.equal(state.calls.deleted, 1);
  stop();
});

test("a grant arriving during deletion is reconciled after deletion completes", async () => {
  const state = load("ios", false);
  let finishDelete;
  const deleteToken = state.api.deleteToken;
  state.api.deleteToken = async (...args) => {
    await new Promise((resolve) => { finishDelete = resolve; });
    return deleteToken(...args);
  };
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  state.setPermission(true);
  state.resume();
  assert.equal(state.calls.tokens, 0);
  finishDelete();
  await flush();
  assert.deepEqual(state.calls.operations, ["auto:false", "delete", "unregister", "auto:true", "register", "token"]);
  stop();
});

test("an effect restart cannot let old deletion invalidate the replacement registration", async () => {
  const state = load("ios", false);
  let finishDelete;
  const deleteToken = state.api.deleteToken;
  state.api.deleteToken = async (...args) => {
    await new Promise((resolve) => { finishDelete = resolve; });
    return deleteToken(...args);
  };
  const stopOld = state.startCloudNotifications({ channelName: "News" });
  await flush();
  stopOld();
  state.setPermission(true);
  const stopNew = state.startCloudNotifications({ channelName: "Новости" });
  await flush();
  assert.equal(state.calls.tokens, 0);
  finishDelete();
  await flush();
  assert.deepEqual(state.calls.operations, ["auto:false", "delete", "unregister", "auto:true", "register", "token"]);
  stopNew();
});

test("iOS provisional authorization keeps push enabled and does not delete the token", async () => {
  const state = load("ios", { granted: false, ios: { status: 3 } });
  const stop = state.startCloudNotifications({ channelName: "News" });
  await flush();
  assert.deepEqual(state.calls.autoInit, [true]);
  assert.equal(state.calls.tokens, 1);
  assert.equal(state.calls.deleted, 0);
  stop();
});
