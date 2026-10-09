const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");
const { eligibleShoppingSavings, hasShoppingDecision, parseShoppingGoal } = require("../../src/shoppingBlocker/eligibleSavings.js");

const { formatShoppingCycleAmount } = require("../../src/shoppingBlocker/amounts.js");

const event = (id, timestamp, amountUSD, extra = {}) => ({ id, timestamp, kind: "refuse_spend", meta: { amountUSD }, ...extra });

test("only committed positive savings enter Screen Time, without product data", () => {
  const entries = [event("save", 100, 20), event("save", 100, 20),
    event("spend", 101, 50, { kind: "spend" }), event("pending", 102, 60, { kind: "pending_added" }),
    event("auto", 103, 70, { meta: { amountUSD: 70, source: "autosave" } }),
    event("unconfirmed", 104, 80, { meta: { amountUSD: 80, confirmed: false } }),
    event("bad", 105, NaN), event("negative", 106, -5), event("future", 1001, 100),
    event("huge", 108, 1e10), event("zero", 109, 0)];
  assert.deepEqual(eligibleShoppingSavings(entries, 1000), [{ id: "save", timestamp: 100, amountUSD: 20 }]);
});

test("goal input supports decimal commas, Arabic, Persian and full-width digits without accepting signs or exponent notation", () => {
  for (const value of ["200.50", "200,50", "٢٠٠٫٥٠", "۲۰۰٫۵۰", "２００.５０"]) assert.equal(parseShoppingGoal(value), 200.5);
  assert.equal(parseShoppingGoal("١٬٢٠٠٫٥٠"), 1200.5);
  for (const value of ["", "-200", "+200", "2e2", "Infinity", "20abc", "2,0,0"]) assert.ok(Number.isNaN(parseShoppingGoal(value)));
});

test("first purchase offers protection without earning credit; existing decisions also qualify", () => {
  const purchase = event("purchase", 100, 20, { kind: "spend" });
  assert.equal(hasShoppingDecision([], 1000), false);
  assert.equal(hasShoppingDecision([purchase], 1000), true);
  assert.deepEqual(eligibleShoppingSavings([purchase], 1000), []);
  assert.equal(hasShoppingDecision([event("existing", 10, 20)], 1000), true);
  for (const entry of [event("pending", 100, 20, { kind: "pending_added" }),
    event("auto", 100, 20, { meta: { amountUSD: 20, source: "autosave" } }),
    event("draft", 100, 20, { meta: { amountUSD: 20, confirmed: false } }),
    event("future", 1001, 20), event("bad", 100, -20)]) {
    assert.equal(hasShoppingDecision([entry], 1000), false);
  }
});

test("native ledger enforces baseline, consumed IDs, deduplication and recalculation", { skip: process.platform !== "darwin" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "almost-shopping-ledger-"));
  try {
    const main = path.join(dir, "main.swift");
    fs.writeFileSync(main, `import Foundation
let old = ShoppingSaving(id: "old", timestamp: 90, amountUSD: 1000)
let first = ShoppingSaving(id: "one", timestamp: 110, amountUSD: 40)
let second = ShoppingSaving(id: "two", timestamp: 120, amountUSD: 60)
let invalid = ShoppingSaving(id: "invalid", timestamp: 130, amountUSD: .infinity)
precondition(ShoppingSavings.progress([old, first, second, first, invalid], startedAt: 100, excludedIds: []) == 100)
precondition(ShoppingSavings.progress([first], startedAt: 100, excludedIds: []) == 40)
let edited = ShoppingSaving(id: "one", timestamp: 110, amountUSD: 30)
precondition(ShoppingSavings.progress([edited, second], startedAt: 100, excludedIds: []) == 90)
let reused = ShoppingSaving(id: "one", timestamp: 300, amountUSD: 900)
let fresh = ShoppingSaving(id: "three", timestamp: 301, amountUSD: 25)
precondition(ShoppingSavings.progress([reused, fresh], startedAt: 200, excludedIds: ["one", "two"]) == 25)
let roundTrip = try JSONDecoder().decode([ShoppingSaving].self, from: JSONEncoder().encode([fresh]))
precondition(ShoppingSavings.progress(roundTrip, startedAt: 200, excludedIds: []) == 25)
precondition(ShoppingSavings.earned(progress: 0.3 + 0.6, goal: 0.9))
precondition(!ShoppingSavings.earned(progress: 199.99, goal: 200))
precondition(!ShoppingSavings.earned(progress: 200, goal: 0))
// EUR conversion and sums are compared in cents, never whole display euros.
for rate in [0.87, 0.923451, 1.12] {
  let targetUSD = 100 / rate
  for amount in [99.99, 99.60] {
    precondition(!ShoppingSavings.earned(progress: amount / rate, goal: targetUSD, goalAmount: 100, currency: "EUR"))
  }
  for amount in [100.0, 100.000000001, 101.0] {
    precondition(ShoppingSavings.earned(progress: amount / rate, goal: targetUSD, goalAmount: 100, currency: "EUR"))
  }
  let sum = (0..<1000).reduce(0.0) { value, _ in value + 0.1 / rate }
  precondition(ShoppingSavings.earned(progress: sum, goal: targetUSD, goalAmount: 100, currency: "EUR"))
  precondition(ShoppingSavings.earned(progress: 99.999999 / rate, goal: targetUSD, goalAmount: 100, currency: "EUR"))
}
precondition(ShoppingSavings.earned(progress: 100, goal: 100.004, goalAmount: 100.004, currency: "EUR"))
precondition(!ShoppingSavings.earned(progress: 100, goal: 100.006, goalAmount: 100.006, currency: "EUR"))
precondition(!ShoppingSavings.earned(progress: 99, goal: 100, goalAmount: 100, currency: "JPY"))
precondition(ShoppingSavings.earned(progress: 100, goal: 100, goalAmount: 100, currency: "JPY"))
precondition(!ShoppingSavings.earned(progress: 99.999, goal: 100, goalAmount: 100, currency: "KWD"))
precondition(!ShoppingSavings.earned(progress: .infinity, goal: 100, goalAmount: 100, currency: "EUR"))
let now = Date(timeIntervalSince1970: 1700000000.875)
let end = ShoppingSavings.passDeadline(from: now)
precondition(end.timeIntervalSince1970.truncatingRemainder(dividingBy: 1) == 0)
precondition(end.timeIntervalSince(now) > 1799 && end.timeIntervalSince(now) <= 1800)
print("Native shopping ledger passed")
`);
    const binary = path.join(dir, "ledger-test");
    execFileSync("xcrun", ["swiftc", path.resolve(__dirname, "../../ios/ShoppingBlockerShared/ShoppingSavings.swift"), main, "-o", binary]);
    assert.match(execFileSync(binary, { encoding: "utf8" }), /Native shopping ledger passed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("native permission reconciliation preserves tokens during initialization and monitor callbacks", { skip: process.platform !== "darwin" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "almost-shopping-permission-"));
  try {
    const source = fs.readFileSync(path.resolve(__dirname, "../../ios/ShoppingBlockerShared/ShoppingBlockerStore.swift"), "utf8")
      .replace(/^import (FamilyControls|ManagedSettings|DeviceActivity)\n/gm, "")
      .replace("FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)", "Optional(URL(fileURLWithPath: CommandLine.arguments[1]))");
    const stubs = `
enum AuthorizationStatus { case approved, denied, notDetermined }
class AuthorizationCenter {
  static let shared = AuthorizationCenter()
  var authorizationStatus: AuthorizationStatus = .approved
}
typealias ApplicationToken = String
struct FamilyActivitySelection: Codable, Equatable { var applicationTokens: Set<String> = [] }
struct DeviceActivityName { init(_ name: String) {} }
class ManagedSettingsStore {
  struct Name { init(_ name: String) {} }
  struct Shield { var applications: Set<String>?; var applicationCategories: Set<String>?; var webDomains: Set<String>? }
  var shield = Shield()
  init(named: Name) {}
  func clearAllSettings() { shield = Shield() }
}
`;
    const store = path.join(dir, "Store.swift");
    fs.writeFileSync(store, source + stubs);
    const main = path.join(dir, "main.swift");
    fs.writeFileSync(main, `import Foundation
var state = ShoppingBlockerState()
state.active = true; state.selection.applicationTokens = ["shop", "other"]
state.goalUSD = 100; state.startedAt = 1
state.events = [ShoppingSaving(id: "saving", timestamp: 2, amountUSD: 100)]
ShoppingBlockerStore.apply(&state)
precondition(ShoppingBlockerStore.shields.shield.applications == ["shop", "other"])
AuthorizationCenter.shared.authorizationStatus = .notDetermined
ShoppingBlockerStore.apply(&state)
precondition(!state.needsSelection && state.ready)
precondition(ShoppingBlockerStore.shields.shield.applications == ["shop", "other"])
state.unlocked = "shop"; state.unlockUntil = ShoppingBlockerStore.now + 1800000
ShoppingBlockerStore.apply(&state, checkAuthorization: false)
precondition(!state.needsSelection && state.unlocked == "shop")
precondition(ShoppingBlockerStore.shields.shield.applications == ["other"])
let saved = try JSONEncoder().encode(state)
state = try JSONDecoder().decode(ShoppingBlockerState.self, from: saved)
ShoppingBlockerStore.apply(&state, checkAuthorization: false)
precondition(ShoppingBlockerStore.shields.shield.applications == ["other"])
state.unlockUntil = ShoppingBlockerStore.now - 1
ShoppingBlockerStore.apply(&state, checkAuthorization: false)
precondition(state.unlocked == nil && state.unlockUntil == 0 && !state.needsSelection)
precondition(ShoppingBlockerStore.shields.shield.applications == ["shop", "other"])
AuthorizationCenter.shared.authorizationStatus = .denied
ShoppingBlockerStore.apply(&state)
precondition(state.needsSelection && state.ready && state.active)
precondition(ShoppingBlockerStore.shields.shield.applications == nil)
AuthorizationCenter.shared.authorizationStatus = .approved
ShoppingBlockerStore.apply(&state)
precondition(state.needsSelection && state.selection.applicationTokens == ["shop", "other"])
state.goalAmount = 100; state.goalCurrency = "EUR"; state.goalUSD = 100 / 0.923451
state.events = [ShoppingSaving(id: "eur", timestamp: 2, amountUSD: 99.99 / 0.923451)]
precondition(!state.ready)
state.events[0].amountUSD = 100 / 0.923451
precondition(state.ready)
state = try JSONDecoder().decode(ShoppingBlockerState.self, from: JSONEncoder().encode(state))
precondition(state.ready && state.goalCurrency == "EUR")
// Legacy JSON with absent new optional fields still decodes and uses startedAt.
var object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(state)) as! [String: Any]
object.removeValue(forKey: "awaitingNextGoal"); object.removeValue(forKey: "lastGoalChangeAt")
state = try JSONDecoder().decode(ShoppingBlockerState.self, from: JSONSerialization.data(withJSONObject: object))
let week = 7.0 * 24 * 60 * 60 * 1000
state.startedAt = 1000; state.lastGoalChangeAt = nil; state.needsSelection = false
precondition(!state.needsNextGoal && state.goalChangeAvailableAt == 1000 + week)
let initialGoal = state.goalUSD
for time in [1000.0, 1000 + week - 1] {
  do { try state.updateGoal(200, amount: 200, currency: "USD", now: time); preconditionFailure("Early edit allowed") }
  catch { precondition(state.goalUSD == initialGoal && state.lastGoalChangeAt == nil) }
}
let credit = state.progressUSD
try state.updateGoal(200, amount: 200, currency: "USD", now: 1000 + week)
precondition(state.lastGoalChangeAt == 1000 + week && state.progressUSD == credit)
do { try state.updateGoal(50, amount: 50, currency: "USD", now: 1000 + week + 1); preconditionFailure("Repeat edit allowed") }
catch { precondition(state.goalUSD == 200) }
state.awaitingNextGoal = true; state.unlockUntil = ShoppingBlockerStore.now + 1800000; state.unlocked = "shop"
state.excludedIds = ["eur"]; state.startedAt = 1000 + week
state.events.append(ShoppingSaving(id: "new", timestamp: state.startedAt + 1, amountUSD: 25))
precondition(!state.ready && state.needsNextGoal)
state = try JSONDecoder().decode(ShoppingBlockerState.self, from: JSONEncoder().encode(state))
precondition(state.needsNextGoal)
let deadline = state.unlockUntil
try state.updateGoal(50, amount: 50, currency: "USD", now: 1000 + week + 2)
precondition(!state.needsNextGoal && state.goalUSD == 50 && state.progressUSD == 25)
precondition(state.unlockUntil == deadline && state.unlocked == "shop" && state.excludedIds == ["eur"])
precondition(state.lastGoalChangeAt == 1000 + week) // next-cycle choice is exempt, not a weekly edit
ShoppingBlockerStore.apply(&state, checkAuthorization: false)
precondition(ShoppingBlockerStore.shields.shield.applications == ["other"])
state.unlockUntil = ShoppingBlockerStore.now - 1
ShoppingBlockerStore.apply(&state, checkAuthorization: false)
precondition(ShoppingBlockerStore.shields.shield.applications == ["shop", "other"])
state.awaitingNextGoal = true
state.unlockUntil = ShoppingBlockerStore.now - 1
ShoppingBlockerStore.apply(&state, checkAuthorization: false)
precondition(state.needsNextGoal && !state.ready)
for invalid in [0.0, -10, Double.infinity, 1e10] {
  do { try state.updateGoal(invalid, amount: 100, currency: "EUR", now: 1e12); preconditionFailure("Invalid goal allowed") }
  catch { precondition(state.goalUSD == 50 && state.needsNextGoal) }
}
// Real filesystem transactions must preserve durable state and skip no-op writes.
let file = URL(fileURLWithPath: CommandLine.arguments[1]).appendingPathComponent("shopping-blocker.json")
try ShoppingBlockerStore.transaction { _ in }
precondition(FileManager.default.fileExists(atPath: file.path))
try ShoppingBlockerStore.transaction { current in current = state }
let durable = try Data(contentsOf: file)
let inode = try FileManager.default.attributesOfItem(atPath: file.path)[.systemFileNumber] as! NSNumber
for _ in 0..<20 {
  try ShoppingBlockerStore.transaction { current in
    ShoppingBlockerStore.apply(&current)
    precondition(current.goalUSD == state.goalUSD)
  }
}
let afterPolls = try Data(contentsOf: file)
let afterInode = try FileManager.default.attributesOfItem(atPath: file.path)[.systemFileNumber] as! NSNumber
precondition(afterPolls == durable && afterInode == inode, "No-op poll replaced durable state")
try ShoppingBlockerStore.transaction { current in
  current.events = [ShoppingSaving(id: "edited", timestamp: 2, amountUSD: 3)]
  current.selection.applicationTokens = ["new-shop"]
  current.copy = ["locale": "ar"]
  current.awaitingNextGoal = true
}
try ShoppingBlockerStore.transaction { current in
  precondition(current.events.count == 1 && current.events[0].amountUSD == 3)
  precondition(current.selection.applicationTokens == ["new-shop"])
  precondition(current.copy["locale"] == "ar" && current.needsNextGoal)
  current.events = []
  current.unlocked = "new-shop"; current.unlockUntil = ShoppingBlockerStore.now - 1
}
try ShoppingBlockerStore.transaction { current in ShoppingBlockerStore.apply(&current) }
let expired = try JSONDecoder().decode(ShoppingBlockerState.self, from: Data(contentsOf: file))
precondition(expired.events.isEmpty && expired.unlocked == nil && expired.unlockUntil == 0)
let committed = try Data(contentsOf: file)
do {
  try ShoppingBlockerStore.transaction { current in
    current.active = false
    throw NSError(domain: "test", code: 1)
  }
  preconditionFailure("Failed operation accepted")
} catch {
  let unchanged = try Data(contentsOf: file)
  precondition(unchanged == committed)
}
do {
  try ShoppingBlockerStore.transaction { current in
    current.events = [ShoppingSaving(id: "invalid", timestamp: 2, amountUSD: .infinity)]
  }
  preconditionFailure("Failed encoding accepted")
} catch {
  let unchanged = try Data(contentsOf: file)
  precondition(unchanged == committed)
}
// Failed atomic writes restore shields and leave the last commit intact.
do {
  let directory = file.deletingLastPathComponent()
  let shieldsBefore = ShoppingBlockerStore.shields.shield.applications
  try FileManager.default.setAttributes([.posixPermissions: 0o500], ofItemAtPath: directory.path)
  defer { try? FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: directory.path) }
  // Read-only/no-op transactions remain valid without requiring a disk write.
  try ShoppingBlockerStore.transaction { _ in }
  do {
    try ShoppingBlockerStore.transaction { current in
      current.active = false
      ShoppingBlockerStore.apply(&current)
    }
    preconditionFailure("Failed atomic write accepted")
  } catch {
    let unchanged = try Data(contentsOf: file)
    precondition(unchanged == committed)
    precondition(ShoppingBlockerStore.shields.shield.applications == shieldsBefore)
  }
}
print("Native permission reconciliation passed")
`);
    const binary = path.join(dir, "permission-test");
    execFileSync("xcrun", ["swiftc", path.resolve(__dirname, "../../ios/ShoppingBlockerShared/ShoppingSavings.swift"), store, main, "-o", binary]);
    assert.match(execFileSync(binary, [dir], { encoding: "utf8" }), /Native permission reconciliation passed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("pass scheduling and cancellation run outside shared transactions and monitor permission probes", () => {
  const native = fs.readFileSync(path.resolve(__dirname, "../../ios/Almost/ShoppingBlocker.swift"), "utf8");
  // Follow lexical brace depth to catch moving either IPC back into any transaction.
  for (const match of native.matchAll(/ShoppingBlockerStore\.transaction\s*\{/g)) {
    let depth = 1;
    let end = match.index + match[0].length;
    const start = end;
    while (depth && end < native.length) {
      if (native[end] === "{") depth++;
      if (native[end] === "}") depth--;
      end++;
    }
    assert.doesNotMatch(native.slice(start, end), /\.(startMonitoring|stopMonitoring)\(/);
  }
  const grant = native.slice(native.indexOf("private func grantPass"), native.indexOf("private func validatePass"));
  assert.match(grant, /passQueue\.async/);
  assert.ok(grant.indexOf("startMonitoring") < grant.indexOf("current.unlocked = token"));
  assert.match(grant, /if registered \{ DeviceActivityCenter\(\)\.stopMonitoring/);
  const monitor = fs.readFileSync(path.resolve(__dirname, "../../ios/ShoppingBlockerMonitor/ShoppingBlockerMonitor.swift"), "utf8");
  assert.equal((monitor.match(/apply\(&state, checkAuthorization: false\)/g) || []).length, 2);
});

test("native pass executes reentrant monitor callback without lock contention and preserves credit on failure", { skip: process.platform !== "darwin" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "almost-shopping-pass-"));
  try {
    const native = fs.readFileSync(path.resolve(__dirname, "../../ios/Almost/ShoppingBlocker.swift"), "utf8");
    const methods = native.slice(native.lastIndexOf("  @available", native.indexOf("private func grantPass")), native.indexOf("  @objc func stop"));
    const main = path.join(dir, "main.swift");
    fs.writeFileSync(main, `import Foundation
import Dispatch
typealias ApplicationToken = String
typealias RCTPromiseResolveBlock = (Any?) -> Void
typealias RCTPromiseRejectBlock = (String?, String?, Error?) -> Void
enum AuthorizationStatus { case approved, denied, notDetermined }
class AuthorizationCenter { static let shared = AuthorizationCenter(); var authorizationStatus = AuthorizationStatus.approved }
struct Selection { var applicationTokens: Set<String> = ["shop", "other"] }
struct ShoppingBlockerState {
  var awaitingNextGoal: Bool?
  var ready = true; var needsSelection = false; var unlockUntil = 0.0
  var selection = Selection(); var unlocked: ApplicationToken?; var startedAt = 0.0
  var events = [ShoppingSaving(id: "saved", timestamp: 1, amountUSD: 100)]
  var excludedIds: Set<String> = []
}
enum ShoppingBlockerStore {
  static let activity = "pass"; static var now: Double { Date().timeIntervalSince1970 * 1000 }
  static var state = ShoppingBlockerState(); static var locked = false; static var failCommit = false
  static var blocked: Set<String> = ["shop", "other"]
  static func transaction<T>(_ body: (inout ShoppingBlockerState) throws -> T) throws -> T {
    precondition(!locked, "Monitor reentered a held file lock")
    locked = true; defer { locked = false }
    var draft = state
    do {
      let result = try body(&draft)
      if failCommit && draft.unlocked != nil { throw NSError(domain: "write", code: 1) }
      state = draft
      return result
    } catch { apply(&state); throw error }
  }
  static func apply(_ state: inout ShoppingBlockerState) {
    blocked = state.selection.applicationTokens
    if let token = state.unlocked { blocked.remove(token) }
  }
  static func status(_ state: ShoppingBlockerState) -> [String: Any] { ["unlockUntil": state.unlockUntil] }
}
struct DeviceActivitySchedule { init(intervalStart: DateComponents, intervalEnd: DateComponents, repeats: Bool) {} }
struct DeviceActivityCenter {
  static var failStart = false; static var revokeDuringStart = false; static var stopped = false
  func startMonitoring(_ activity: String, during schedule: DeviceActivitySchedule) throws {
    // Model the synchronous system callback into the extension at registration.
    try ShoppingBlockerStore.transaction { ShoppingBlockerStore.apply(&$0) }
    if Self.failStart { throw NSError(domain: "schedule", code: 1) }
    if Self.revokeDuringStart { AuthorizationCenter.shared.authorizationStatus = .denied }
  }
  func stopMonitoring(_ activities: [String]) {
    precondition(!ShoppingBlockerStore.locked)
    Self.stopped = true
    try! ShoppingBlockerStore.transaction { ShoppingBlockerStore.apply(&$0) }
  }
}
class ShoppingBlocker {
  let passQueue = DispatchQueue(label: "test.pass")
${methods}
  func exercise() -> Bool {
    let done = DispatchSemaphore(value: 0)
    var success = false
    grantPass("shop", resolve: { _ in success = true; done.signal() }, reject: { _, _, _ in done.signal() })
    precondition(done.wait(timeout: .now() + 5) == .success)
    return success
  }
}
let bridge = ShoppingBlocker()
precondition(bridge.exercise())
precondition(ShoppingBlockerStore.state.unlocked == "shop")
precondition(ShoppingBlockerStore.state.awaitingNextGoal == true)
precondition(ShoppingBlockerStore.blocked == ["other"])
precondition(ShoppingBlockerStore.state.excludedIds == ["saved"])
precondition(ShoppingBlockerStore.state.unlockUntil > ShoppingBlockerStore.now + 1790000)
precondition(!bridge.exercise()) // An active pass cannot be granted again.
for scenario in 0..<3 {
  ShoppingBlockerStore.state = ShoppingBlockerState()
  ShoppingBlockerStore.blocked = ["shop", "other"]
  ShoppingBlockerStore.failCommit = scenario == 1
  DeviceActivityCenter.failStart = scenario == 0
  DeviceActivityCenter.revokeDuringStart = scenario == 2
  DeviceActivityCenter.stopped = false
  AuthorizationCenter.shared.authorizationStatus = .approved
  precondition(!bridge.exercise())
  precondition(ShoppingBlockerStore.state.unlocked == nil)
  precondition(ShoppingBlockerStore.state.unlockUntil == 0)
  precondition(ShoppingBlockerStore.state.ready && ShoppingBlockerStore.state.excludedIds.isEmpty && ShoppingBlockerStore.state.awaitingNextGoal == nil)
  precondition(ShoppingBlockerStore.blocked == ["shop", "other"])
  precondition(DeviceActivityCenter.stopped == (scenario != 0))
}
print("Native pass transaction scenarios passed")
`);
    const binary = path.join(dir, "pass-test");
    execFileSync("xcrun", ["swiftc", path.resolve(__dirname, "../../ios/ShoppingBlockerShared/ShoppingSavings.swift"), main, "-o", binary]);
    assert.match(execFileSync(binary, { encoding: "utf8" }), /Native pass transaction scenarios passed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("real JS controller preserves status on cancellation, revalidates credit and serializes unlock/stop", async () => {
  const vm = require("node:vm");
  const values = [];
  let clock = Date.now();
  const source = fs.readFileSync(path.resolve(__dirname, "../../src/shoppingBlocker/useShoppingBlocker.js"), "utf8")
    .replace(/^import .*;\n/gm, "").replace("export function useShoppingBlocker", "function useShoppingBlocker");
  let current = { supported: true, authorized: true, active: true, appCount: 2, ready: true, unlockUntil: 0 };
  let fail = false;
  let finishUnlock;
  let unlockCalls = 0;
  const calls = [];
  const native = {
    sync: async () => { calls.push("sync"); return { ...current }; },
    updateGoal: async (goalUSD, currency, goalAmount) => {
      calls.push(["updateGoal", goalUSD, currency, goalAmount]);
      if (fail) throw new Error("Weekly edit unavailable");
      current = { ...current, goalUSD, goalCurrency: currency, goalAmount };
      return { ...current };
    },
    selectApps: async () => ({ cancelled: true }),
    unlock: async () => {
      unlockCalls++;
      calls.push("unlock");
      if (fail) throw new Error("System registration failed");
      await new Promise((resolve) => { finishUnlock = resolve; });
      current = { ...current, ready: false, needsNextGoal: true, unlockUntil: Date.now() + 1800000 };
      return { ...current };
    },
    stop: async () => { calls.push("stop"); current = { ...current, active: false, unlockUntil: 0 }; return { ...current }; },
  };
  const context = {
    useState: (initial) => { const index = values.length; values.push(initial); return [initial, (value) => { values[index] = typeof value === "function" ? value(values[index]) : value; }]; },
    useRef: (value) => ({ current: value }), useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect: () => {},
    Platform: { OS: "ios" }, NativeModules: { ShoppingBlocker: native },
    AsyncStorage: { setItem: async () => {} }, eligibleShoppingSavings, hasShoppingDecision,
    STORAGE_KEYS: { ONBOARDING: "onboarding" }, Date: { now: () => clock },
  };
  vm.createContext(context);
  vm.runInContext(source + "\nthis.controller = useShoppingBlocker({ history: [], hydrated: true, t: (key) => key, language: 'ru' });", context);
  const controller = context.controller;
  await controller.refresh();
  const savedStatus = values[0];
  await controller.refresh();
  assert.equal(values[0], savedStatus, "Unchanged native polls must preserve the React state reference");
  current = { ...current, progressUSD: 10 };
  await controller.refresh();
  assert.equal(values[0].progressUSD, 10, "New native fields must not be lost");
  const withProgress = values[0];
  current.progressUSD = 11;
  await controller.refresh();
  assert.notEqual(values[0], withProgress);
  assert.equal(values[0].progressUSD, 11, "Changed savings must update state");
  delete current.progressUSD;
  await controller.refresh();
  assert.equal(Object.hasOwn(values[0], "progressUSD"), false, "Removed native fields must not remain stale");
  current.goalChangeAvailableAt = clock + 15000;
  await controller.refresh();
  const lockedGoal = values[0];
  await controller.refresh();
  assert.equal(values[0], lockedGoal);
  clock += 16000;
  await controller.refresh();
  assert.notEqual(values[0], lockedGoal, "Weekly edit unlock must refresh UI even with identical native fields");
  const editableGoal = values[0];
  await controller.refresh();
  assert.equal(values[0], editableGoal);
  current.unlockUntil = clock + 30000;
  await controller.refresh();
  const openPass = values[0];
  clock += 31000;
  await controller.refresh();
  assert.notEqual(values[0], openPass, "Pass deadline must refresh UI even before the next native expiry reconciliation");
  current.unlockUntil = 0;
  await controller.refresh();
  const selectedStatus = values[0];
  await controller.selectApps();
  assert.equal(values[0], selectedStatus, "Cancelling a picker must preserve the current selection and credit");
  assert.equal(values[2], false);
  current.ready = false;
  await controller.unlock();
  assert.equal(unlockCalls, 0, "Edited/deleted savings must be revalidated before native unlock");
  assert.equal(values[0].ready, false);
  current.ready = true;
  await controller.refresh();
  fail = true;
  assert.equal(await controller.unlock(), null);
  assert.equal(values[0].ready, true);
  assert.equal(values[1], "blockError");
  assert.equal(values[2], false);
  fail = false;
  await controller.refresh();
  assert.equal(values[1], null, "Refresh allows retry after a registration failure");
  fail = true;
  const beforeEdit = values[0];
  assert.equal(await controller.updateGoal(150 / 0.923451, "EUR", 150), null);
  assert.equal(values[0], beforeEdit, "Rejected edits preserve the persisted cycle");
  fail = false;
  await controller.updateGoal(150 / 0.923451, "EUR", 150);
  assert.equal(values[0].goalAmount, 150);
  assert.equal(values[0].goalCurrency, "EUR");
  assert.equal(values[1], null);
  assert.deepEqual(calls.at(-1), ["updateGoal", 150 / 0.923451, "EUR", 150]);
  const grant = controller.unlock();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(values[2], true);
  controller.openSettings();
  assert.equal(values[4], true);
  const stop = controller.stop();
  assert.equal(calls.includes("stop"), false, "Stop must wait for the pending unlock");
  finishUnlock();
  await Promise.all([grant, stop]);
  assert.equal(values[0].active, false);
  assert.equal(values[0].unlockUntil, 0);
  assert.equal(values[2], false);
  assert.equal(calls.at(-1), "stop");
  assert.equal(values[3], true, "Successful grant prompts for the next limit");
  assert.equal(values[4], false, "Post-unlock prompt must not expose settings-only stop");
});


test("Shopping Pause shows currency minor units instead of hiding a shortfall behind whole amounts", () => {
  const format = (amount, currency, options) => new Intl.NumberFormat("en-US", {
    style: "currency", currency, minimumFractionDigits: options.precisionOverride,
    maximumFractionDigits: options.precisionOverride,
  }).format(amount);
  const status = { goalUSD: 100 / 0.923451, goalAmount: 100, goalCurrency: "EUR" };
  assert.equal(formatShoppingCycleAmount(99.99 / 0.923451, status, format), "€99.99");
  assert.equal(formatShoppingCycleAmount(status.goalUSD, status, format), "€100.00");
  assert.equal(formatShoppingCycleAmount(100, { goalUSD: 100, goalAmount: 100, goalCurrency: "JPY" }, format), "¥100");
  assert.equal(formatShoppingCycleAmount(99.999, { goalUSD: 100, goalAmount: 100, goalCurrency: "KWD" }, format), "KWD 99.999");
  assert.equal(formatShoppingCycleAmount(10, {}, format, (amount) => `$${amount}`), "$10");
});


test("stop is reachable only from the settings route, while limit changes and renewal stay wired", () => {
  const panel = fs.readFileSync(path.resolve(__dirname, "../../src/components/ShoppingBlockerPanel.js"), "utf8");
  assert.match(panel, /controller.settings && status\?\.active \? action\("blockStop", stop\)/);
  assert.match(panel, /if \(!controller.settings\) return/);
  assert.match(panel, /controller.updateGoal\(amountUSD, currency, value\)/);
  const app = fs.readFileSync(path.resolve(__dirname, "../../App.js"), "utf8");
  assert.match(app, /onShoppingBlockerPress=\{\(\) => shoppingBlocker.openSettings\(\)\}/);
  const native = fs.readFileSync(path.resolve(__dirname, "../../ios/Almost/ShoppingBlocker.swift"), "utf8");
  assert.match(native, /try state.updateGoal\(goalUSD, amount: goalAmount, currency: currency, now: ShoppingBlockerStore.now\)/);
});
