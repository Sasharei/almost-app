const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const parser = require("@babel/parser");
const policyModule = require("../../src/notifications/notificationPolicy");
const hour = 3600000;
const start = new Date(2026, 9, 9, 10, 0).getTime();
function fixture() {
  const scheduled = new Map();
  const values = new Map();
  let clock = start;
  let fail = false;
  let storageFails = false;
  const api = {
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    scheduleNotificationAsync: async (request) => {
      if (fail) throw new Error("OS unavailable");
      const id = request.identifier || `native-${scheduled.size}`;
      scheduled.set(id, { ...request, identifier: id });
      return id;
    },
    cancelScheduledNotificationAsync: async (id) => { scheduled.delete(id); },
    cancelAllScheduledNotificationsAsync: async () => { scheduled.clear(); },
  };
  const storage = {
    getItem: async (key) => { if (storageFails) throw new Error("Storage unavailable"); return values.get(key) || null; },
    setItem: async (key, value) => { if (storageFails) throw new Error("Storage unavailable"); values.set(key, value); },
  };
  const create = () => policyModule.createNotificationPolicy({ api, storage, now: () => clock });
  return { api, storage, scheduled, values, create, setTime: (at) => { clock = at; },
    fail: (value) => { fail = value; }, storageFails: (value) => { storageFails = value; } };
}
const request = (kind, at = start + 1000, body = "copy") => ({ content: { title: "Almi", body,
  data: { kind, targetScreen: "feed" } }, trigger: { type: "date", date: new Date(at) } });

test("all automatic sources share four slots per day, two-hour spacing and semantic dedupe", async () => {
  const fixture = fixtureFactory();
  const policy = fixture.create();
  assert.ok(await policy.schedule(request("tamagotchi_hourly_reward")));
  assert.equal(await policy.schedule(request("tamagotchi_hourly_reward", start + 5 * hour, "other language")), null);
  assert.equal(await policy.schedule(request("smart_insight", start + hour)), null);
  assert.equal(await policy.schedule(request("smart_insight", start + 2 * hour)), null); // One second short.
  assert.ok(await policy.schedule(request("daily_summary", start + 2 * hour + 1000)));
  assert.ok(await policy.schedule(request("smart_insight", start + 4 * hour + 1000)));
  assert.ok(await policy.schedule(request("tycoon_autosave_ready", start + 6 * hour + 1000)));
  assert.equal(await policy.schedule(request("spend_logging", start + 8 * hour + 1000)), null);
  assert.equal(fixture.scheduled.size, 4);
});
// Avoid shadowing the fixture factory in individual tests.
const fixtureFactory = fixture;

test("night-time, overdue, invalid and distant automatic requests fail closed", async () => {
  const fixture = fixtureFactory();
  const policy = fixture.create();
  for (const at of [start - hour, new Date(2026, 9, 9, 23).getTime(), start + 8 * 24 * hour, NaN]) {
    assert.equal(await policy.schedule(request("spend_logging", at)), null);
  }
  assert.equal(await policy.schedule({ content: { body: "unknown" }, trigger: { type: "unknown" } }), null);
  assert.equal(fixture.scheduled.size, 0);
});

test("nine daily templates produce a finite seven-day queue, one nudge per day", async () => {
  const fixture = fixtureFactory();
  const policy = fixture.create();
  for (const hour of [9, 12, 15, 19, 20, 21, 22, 23]) {
    await policy.schedule({ content: { title: "variant", body: "copy", data: { type: "daily_nudge" } },
      trigger: { type: "daily", hour, minute: 0, repeats: true } });
  }
  assert.equal(fixture.scheduled.size, 8); // Today plus the following seven local dates.
  const perDay = new Map();
  for (const entry of fixture.scheduled.values()) {
    assert.equal(entry.trigger.type, "date");
    assert.equal(entry.trigger.repeats, undefined);
    const key = entry.trigger.date.toDateString();
    perDay.set(key, (perDay.get(key) || 0) + 1);
  }
  assert.ok([...perDay.values()].every((count) => count === 1));
  assert.ok([...fixture.scheduled.values()].every((entry) => entry.content.data.notificationPolicyAt <= start + 7 * 24 * hour));
});

test("cancelling the first finite-plan ID cancels its future siblings", async () => {
  const fixture = fixtureFactory();
  const policy = fixture.create();
  const id = await policy.schedule({ content: { data: { type: "daily_nudge" } },
    trigger: { type: "daily", hour: 12, minute: 0, repeats: true } });
  assert.equal(fixture.scheduled.size, 7);
  await policy.cancel(id);
  assert.equal(fixture.scheduled.size, 0);
  assert.ok(await policy.schedule(request("tamagotchi_hunger", start + 2 * hour)));
});

test("budget survives delivered banner dismissal, cancellation and JS restart", async () => {
  const fixture = fixtureFactory();
  let policy = fixture.create();
  const id = await policy.schedule(request("tamagotchi_hourly_reward"));
  fixture.setTime(start + 10000);
  fixture.scheduled.clear(); // OS delivered it; the user also removed it from Notification Center.
  policy = fixture.create();
  await policy.cancel(id);
  assert.equal(await policy.schedule(request("tamagotchi_hourly_reward", start + 5 * hour, "French")), null);
  assert.equal(await policy.schedule(request("spend_logging", start + hour)), null);
  assert.ok(await policy.schedule(request("daily_summary", start + 2 * hour + 1000)));
});

test("upgrade removes unlimited automatic schedules and preserves user-requested deadlines", async () => {
  const fixture = fixtureFactory();
  fixture.scheduled.set("old-es", { identifier: "old-es", content: { data: { type: "daily_nudge", locale: "es" } },
    trigger: { repeats: true, type: "daily", hour: 15, minute: 30 } });
  fixture.scheduled.set("pending", { identifier: "pending", ...request("pending_decision") });
  fixture.scheduled.set("manual", { identifier: "manual", ...request("frequency_reminder") });
  await fixture.create().reconcile();
  assert.deepEqual([...fixture.scheduled.keys()], ["pending", "manual"]);
});

test("explicit deadlines keep timing, sound, actions and routing even at night or beyond seven days", async () => {
  const fixture = fixtureFactory();
  const policy = fixture.create();
  const original = request("pending_decision", start + 30 * 24 * hour);
  original.content.data.pendingId = "purchase";
  original.content.data.dueAt = start + 30 * 24 * hour;
  original.content.sound = true;
  original.content.categoryIdentifier = "impulse_action";
  original.content.data.targetScreen = "pending";
  const id = await policy.schedule(original);
  assert.deepEqual(fixture.scheduled.get(id).content, original.content);
  assert.deepEqual(fixture.scheduled.get(id).trigger, original.trigger);
  await policy.schedule(original);
  assert.equal(fixture.scheduled.size, 1);
});

test("a delivered explicit event cannot be replayed after restart or copy/language changes", async () => {
  const fixture = fixtureFactory();
  const original = request("subscription_due");
  Object.assign(original.content.data, { dayKey: "2026-10-09", subscriptionIds: ["music"], dedupeKey: "es:music" });
  await fixture.create().schedule(original);
  fixture.setTime(start + hour);
  fixture.scheduled.clear();
  original.content.body = "Russian copy";
  original.content.data.dedupeKey = "ru:music";
  original.trigger = null;
  assert.equal(await fixture.create().schedule(original), null);
});

test("automatic permission to send is not granted by native/storage failures; explicit cancel still works", async () => {
  const fixture = fixtureFactory();
  const policy = fixture.create();
  await policy.reconcile();
  fixture.fail(true);
  await assert.rejects(policy.schedule(request("tamagotchi_hunger")));
  fixture.fail(false);
  assert.ok(await policy.schedule(request("tamagotchi_hunger")));
  fixture.storageFails(true);
  await assert.rejects(policy.schedule(request("spend_logging", start + 2 * hour + 1000)));
  const id = await policy.schedule({ ...request("pending_decision"), content: { data: { kind: "pending_decision", pendingId: "user" } } });
  assert.ok(id);
  await fixture.create().cancel(id);
  assert.equal(fixture.scheduled.has(id), false);
  await fixture.create().cancelAll().catch(() => {});
  assert.equal(fixture.scheduled.size, 0);
});

test("auto-selected frequency suggestions are budgeted; manually configured frequency is preserved", async () => {
  const fixture = fixtureFactory();
  const policy = fixture.create();
  const automatic = request("frequency_reminder", new Date(2026, 9, 9, 23).getTime());
  automatic.content.data.userRequested = false;
  assert.equal(await policy.schedule(automatic), null);
  const manual = { ...automatic, content: { data: { ...automatic.content.data, userRequested: true } } };
  assert.ok(await policy.schedule(manual));
});

function find(node, name) {
  if (!node || typeof node !== "object") return null;
  if (node.type === "VariableDeclarator" && node.id?.name === name) return node.init;
  for (const value of Object.values(node)) for (const child of Array.isArray(value) ? value : [value]) {
    const result = find(child, name);
    if (result) return result;
  }
  return null;
}
test("production native wrapper serializes parallel direct SDK schedules through the budget", async () => {
  const fixture = fixtureFactory();
  // Use real wall clock while keeping the requests in a quiet-hours-safe future day.
  const at = new Date();
  at.setDate(at.getDate() + 1);
  at.setHours(10, 0, 0, 0);
  const app = fs.readFileSync("App.js", "utf8");
  const ast = parser.parse(app, { sourceType: "module", plugins: ["jsx"] });
  const wrapper = find(ast, "safeNotifications");
  const api = vm.runInNewContext(`(${app.slice(wrapper.start, wrapper.end)})`, {
    Notifications: fixture.api, AsyncStorage: fixture.storage, ...policyModule,
    normalizeNotificationTriggerInput: (value) => value, console,
  });
  const results = await Promise.all([
    api.scheduleNotificationAsync(request("tamagotchi_hourly_reward", at.getTime(), "es")),
    api.scheduleNotificationAsync(request("daily_nudge", at.getTime(), "ru")),
    api.scheduleNotificationAsync(request("smart_insight", at.getTime() + 2 * hour, "fr")),
    api.scheduleNotificationAsync(request("tycoon_autosave_ready", at.getTime() + 4 * hour)),
    api.scheduleNotificationAsync(request("daily_summary", at.getTime() + 6 * hour)),
    api.scheduleNotificationAsync(request("spend_logging", at.getTime() + 8 * hour)),
  ]);
  assert.equal(results.filter(Boolean).length, 4);
  assert.equal(fixture.scheduled.size, 4);
});

test("serialized iOS calendar dates and Android date values resolve to the actual delivery date", () => {
  const at = new Date(2026, 9, 12, 15, 30).getTime();
  assert.equal(policyModule.nextTime({ type: "date", value: at }, start), at);
  assert.equal(policyModule.nextTime({ type: "date", timestamp: at }, start), at);
  assert.equal(policyModule.nextTime({ type: "calendar", repeats: false,
    dateComponents: { year: 2026, month: 10, day: 12, hour: 15, minute: 30 } }, start), at);
});

test("a corrupt budget still retires legacy spam and preserves user deadlines", async () => {
  const fixture = fixtureFactory();
  fixture.scheduled.set("legacy", { identifier: "legacy", ...request("tamagotchi_hunger") });
  fixture.scheduled.set("pending", { identifier: "pending", ...request("pending_decision") });
  fixture.storageFails(true);
  await assert.rejects(fixture.create().reconcile());
  assert.deepEqual([...fixture.scheduled.keys()], ["pending"]);
});

test("quiet-hours boundary applies to the actual instant-banner delivery time", async () => {
  const fixture = fixtureFactory();
  fixture.setTime(new Date(2026, 9, 9, 20, 59, 59, 500).getTime());
  assert.equal(await fixture.create().schedule({ content: { body: "near quiet time" }, trigger: null }), null);
});

test("cold cancellation of a repeating-plan root removes every sibling", async () => {
  const fixture = fixtureFactory();
  const id = await fixture.create().schedule({ content: { data: { type: "daily_nudge" } },
    trigger: { type: "daily", hour: 12, minute: 0, repeats: true } });
  await fixture.create().cancel(id);
  assert.equal(fixture.scheduled.size, 0);
});

test("real Swift receipt-notice code coalesces concurrent Wallet callbacks and retries native errors", () => {
  const os = require("node:os");
  const path = require("node:path");
  const { execFileSync } = require("node:child_process");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "almost-receipt-notice-"));
  try {
    const source = fs.readFileSync("ios/Almost/BankExpenses.swift", "utf8");
    const method = source.slice(source.indexOf("  static func notify()"), source.indexOf("  static func changed()"));
    const harness = `import Foundation
    enum Authorization { case authorized, provisional, denied }
    struct Settings { let authorizationStatus: Authorization }
    class UNMutableNotificationContent { var title = ""; var body = ""; var userInfo: [String: String] = [:] }
    struct UNNotificationRequest { let identifier: String; let content: UNMutableNotificationContent; let trigger: String? }
    enum Failure: Error { case native }
    class UNUserNotificationCenter {
      static let instance = UNUserNotificationCenter()
      var status = Authorization.authorized
      var fail = false
      var deliveries = 0
      static func current() -> UNUserNotificationCenter { instance }
      func getNotificationSettings(_ completion: (Settings) -> Void) { completion(Settings(authorizationStatus: status)) }
      func add(_ request: UNNotificationRequest, withCompletionHandler completion: (Error?) -> Void) {
        if fail { completion(Failure.native); return }
        precondition(request.identifier == "bank-expenses")
        precondition(request.content.userInfo["kind"] == "bank_expense")
        deliveries += 1; completion(nil)
      }
    }
    enum BankExpenseStore {
      static let suite = UUID().uuidString
      static let defaults = UserDefaults(suiteName: suite)!
      static let noticeQueue = DispatchQueue(label: "test.notices")
      ${method}
    }
    let defaults = BankExpenseStore.defaults
    defer { defaults.removePersistentDomain(forName: BankExpenseStore.suite) }
    defaults.set("Receipt", forKey: "expenseNoticeTitle")
    defaults.set("Review receipts", forKey: "expenseNoticeBody")
    DispatchQueue.concurrentPerform(iterations: 20) { _ in BankExpenseStore.notify() }
    BankExpenseStore.noticeQueue.sync {}
    precondition(UNUserNotificationCenter.instance.deliveries == 1)
    defaults.set(Date().timeIntervalSince1970 - 1801, forKey: "expenseLastNoticeAt")
    BankExpenseStore.notify(); BankExpenseStore.noticeQueue.sync {}
    precondition(UNUserNotificationCenter.instance.deliveries == 2)
    defaults.removeObject(forKey: "expenseLastNoticeAt")
    UNUserNotificationCenter.instance.fail = true
    BankExpenseStore.notify(); BankExpenseStore.noticeQueue.sync {}; BankExpenseStore.noticeQueue.sync {}
    precondition(defaults.double(forKey: "expenseLastNoticeAt") == 0)
    UNUserNotificationCenter.instance.fail = false
    BankExpenseStore.notify(); BankExpenseStore.noticeQueue.sync {}
    precondition(UNUserNotificationCenter.instance.deliveries == 3)
    defaults.removeObject(forKey: "expenseLastNoticeAt")
    UNUserNotificationCenter.instance.status = .denied
    BankExpenseStore.notify(); BankExpenseStore.noticeQueue.sync {}
    precondition(defaults.double(forKey: "expenseLastNoticeAt") == 0)
    precondition(UNUserNotificationCenter.instance.deliveries == 3)
    print("receipt banner policy passed")`;
    const file = path.join(directory, "notice.swift");
    fs.writeFileSync(file, harness);
    const result = execFileSync("xcrun", ["swift", file], { encoding: "utf8", timeout: 30000 });
    assert.ok(result.includes("receipt banner policy passed"));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("cloud payloads cannot claim a user-deadline exemption", async () => {
  const fixture = fixtureFactory();
  const policy = fixture.create();
  const message = request("pending_decision", start + 1000);
  message.content.data.notificationSource = "cloud";
  assert.ok(await policy.schedule(message));
  message.trigger = { date: new Date(start + 6 * hour) };
  message.content.data.kind = "bank_expense";
  assert.equal(await policy.schedule(message), null);
});

test("automatic banners reserve native queue capacity for user deadlines", async () => {
  const fixture = fixtureFactory();
  for (let index = 0; index < 48; index += 1) {
    fixture.scheduled.set(`user-${index}`, { identifier: `user-${index}`, ...request("pending_decision", start + 24 * hour) });
  }
  const policy = fixture.create();
  assert.equal(await policy.schedule(request("tamagotchi_hunger")), null);
  const deadline = request("pending_decision", start + 24 * hour);
  deadline.content.data.pendingId = "new";
  assert.ok(await policy.schedule(deadline));
  assert.equal(fixture.scheduled.size, 49);
});

function appCallback(name, context) {
  const app = fs.readFileSync("App.js", "utf8");
  const ast = parser.parse(app, { sourceType: "module", plugins: ["jsx"] });
  const node = find(ast, name).arguments[0];
  return vm.runInNewContext(`(${app.slice(node.start, node.end)})`, { ...policyModule, ...context });
}
test("startup duplicate cleanup distinguishes different owners and matches one event across languages", async () => {
  const fixture = fixtureFactory();
  for (const [id, owner, body] of [["first", "a", "copy"], ["second", "b", "copy"], ["old-fr", "a", "French"]]) {
    const payload = request("pending_decision", start + hour, body);
    Object.assign(payload.content.data, { pendingId: owner, dedupeKey: `pending:${owner}` });
    fixture.scheduled.set(id, { identifier: id, ...payload });
  }
  const clean = appCallback("cleanupDuplicateScheduledNotifications", {
    safeNotifications: fixture.api, Date: class extends Date { static now() { return start; } },
    resolveNotificationTriggerTime: policyModule.nextTime, IDENTICAL_PUSH_TIME_WINDOW_MS: 90000,
    buildNotificationContentSignature: (content) => `${content.title}|${content.body}`, console,
  });
  await clean();
  assert.deepEqual([...fixture.scheduled.keys()], ["first", "second"]);
});

function appSchedulerFixture() {
  const fixture = fixtureFactory();
  const policy = fixture.create();
  let signatureQueries = 0;
  const schedule = appCallback("scheduleNotificationWithCooldown", {
    Date: class extends Date { static now() { return start; } },
    startupHardLockPendingBeforePaywall: false, runScheduledNotificationTransaction: async (task) => task(),
    resolveNotificationTriggerTime: (trigger) => policyModule.nextTime(trigger, start),
    buildNotificationContentSignature: (content) => `${content.title}|${content.body}`,
    findScheduledNotificationByDedupeKey: async (key) => [...fixture.scheduled.values()].find((entry) => entry.content.data.dedupeKey === key),
    findScheduledNotificationByContentSignature: async () => { signatureQueries++; return [...fixture.scheduled.values()][0]; },
    readScheduledNotificationTimes: async () => [], lastInstantNotificationRef: { current: 0 },
    PUSH_NOTIFICATION_COOLDOWN_MS: 30 * 60000,
    safeNotifications: { scheduleNotificationAsync: policy.schedule, cancelScheduledNotificationAsync: policy.cancel },
  });
  return { ...fixture, schedule, signatureQueries: () => signatureQueries };
}

test("the actual app scheduler preserves distinct pending actions even with identical notification text", async () => {
  const fixture = appSchedulerFixture();
  for (const owner of ["first", "second"]) {
    const payload = request("pending_decision", start + hour);
    Object.assign(payload.content.data, { pendingId: owner, dedupeKey: `pending:${owner}`, dueAt: start + hour });
    assert.ok((await fixture.schedule(payload)).id);
  }
  assert.equal(fixture.scheduled.size, 2);
  assert.equal(fixture.signatureQueries(), 0);
  assert.deepEqual([...fixture.scheduled.values()].map((entry) => entry.content.data.pendingId), ["first", "second"]);
});

test("updating a legacy deadline's copy replaces its native ID atomically and records the event identity", async () => {
  const fixture = appSchedulerFixture();
  const payload = request("pending_decision", start + hour, "French");
  Object.assign(payload.content.data, { pendingId: "same", dedupeKey: "pending:same", dueAt: start + hour });
  fixture.scheduled.set("legacy", { identifier: "legacy", ...payload });
  const updated = { ...payload, content: { ...payload.content, body: "Russian" } };
  assert.equal((await fixture.schedule(updated)).id, "legacy");
  assert.equal(fixture.scheduled.size, 1);
  assert.equal(fixture.scheduled.get("legacy").content.body, "Russian");
  fixture.setTime(start + 2 * hour);
  fixture.scheduled.clear();
  assert.equal(await fixture.create().schedule({ ...updated, trigger: null }), null);
});

test("ISO trigger strings retain their existing timestamp behavior", () => {
  const at = start + hour;
  assert.equal(policyModule.nextTime(new Date(at).toISOString(), start), at);
});
