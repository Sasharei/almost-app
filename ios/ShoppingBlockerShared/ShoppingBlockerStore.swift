import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import Darwin

struct ShoppingBlockerState: Codable, Equatable {
  var active = false
  var selection = FamilyActivitySelection()
  var goalUSD = 0.0
  var goalAmount = 0.0
  var goalCurrency = "USD"
  var startedAt = 0.0
  var excludedIds: Set<String> = []
  var events: [ShoppingSaving] = []
  var unlocked: ApplicationToken?
  var unlockUntil = 0.0
  var needsSelection = false
  var copy: [String: String] = [:]
  // Optional fields let pre-existing durable sessions decode without migration.
  var awaitingNextGoal: Bool?
  var lastGoalChangeAt: Double?
  var needsNextGoal: Bool { awaitingNextGoal == true }
  var goalChangeAvailableAt: Double { (lastGoalChangeAt ?? startedAt) + 7 * 24 * 60 * 60 * 1000 }

  mutating func updateGoal(_ usd: Double, amount: Double, currency: String, now: Double) throws {
    guard active, usd.isFinite, usd >= 0.01, usd <= 1e9,
          amount.isFinite, amount > 0, currency.count == 3 else {
      throw NSError(domain: "ShoppingBlocker", code: 4)
    }
    // A new cycle is mandatory after a consumed pass and exempt from editing
    // cooldown. Ordinary edits preserve credit and are enforced natively.
    guard needsNextGoal || now >= goalChangeAvailableAt else {
      throw NSError(domain: "ShoppingBlocker", code: 7)
    }
    if !needsNextGoal { lastGoalChangeAt = now }
    goalUSD = usd; goalAmount = amount; goalCurrency = currency
    awaitingNextGoal = false
  }

  var progressUSD: Double {
    ShoppingSavings.progress(events, startedAt: startedAt, excludedIds: excludedIds)
  }
  var ready: Bool { active && !needsNextGoal && ShoppingSavings.earned(progress: progressUSD, goal: goalUSD, goalAmount: goalAmount, currency: goalCurrency) }
}

@available(iOS 16.0, *)
enum ShoppingBlockerStore {
  static let group = "group.com.sasarei.almostclean"
  static let activity = DeviceActivityName("almost.shopping.pass")
  static let shields = ManagedSettingsStore(named: .init("almost.shopping"))
  static var now: Double { Date().timeIntervalSince1970 * 1000 }

  // The app and monitor share a file lock, so expiry cannot overwrite a newly
  // synced saving, stopped session, or subsequent pass. Tokens stay on device.
  static func transaction<T>(_ body: (inout ShoppingBlockerState) throws -> T) throws -> T {
    guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
      throw NSError(domain: "ShoppingBlocker", code: 1)
    }
    let lock = dir.appendingPathComponent("shopping-blocker.lock")
    let fd = open(lock.path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard fd >= 0 else { throw NSError(domain: "ShoppingBlocker", code: 2) }
    defer { flock(fd, LOCK_UN); close(fd) }
    try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: lock.path)
    guard flock(fd, LOCK_EX) == 0 else { throw NSError(domain: "ShoppingBlocker", code: 3) }
    let file = dir.appendingPathComponent("shopping-blocker.json")
    var state = ShoppingBlockerState()
    let hasStoredState = FileManager.default.fileExists(atPath: file.path)
    if hasStoredState {
      state = try JSONDecoder().decode(ShoppingBlockerState.self, from: Data(contentsOf: file))
    }
    var original = state
    do {
      let value = try body(&state)
      // Reconciliation still runs under the shared lock on every refresh. Only
      // unchanged durable state can skip encoding and atomic replacement; first
      // creation, expiry, revocation and every actual mutation must be saved.
      if !hasStoredState || state != original {
        try JSONEncoder().encode(state).write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
      }
      return value
    } catch {
      // Keep actual shields consistent with the last durable state if a write
      // fails after starting a session or granting a pass.
      apply(&original)
      throw error
    }
  }

  static func apply(_ state: inout ShoppingBlockerState, checkAuthorization: Bool = true) {
    if state.unlockUntil <= now {
      state.unlocked = nil
      state.unlockUntil = 0
    }
    // AuthorizationCenter initially reports notDetermined while loading. It
    // is not evidence of revocation, and extensions must not infer permission
    // changes from their own freshly initialized AuthorizationCenter.
    let authorization = checkAuthorization ? AuthorizationCenter.shared.authorizationStatus : .approved
    if authorization == .notDetermined { return }
    let authorized = authorization == .approved
    if (state.active || !state.selection.applicationTokens.isEmpty) && authorization == .denied {
      // Apple voids selection tokens on revocation. A fresh authorization must
      // be followed by fresh app selection, while the savings goal is kept.
      state.needsSelection = true
      state.unlocked = nil
      state.unlockUntil = 0
    }
    guard state.active, authorized, !state.needsSelection else {
      shields.clearAllSettings()
      return
    }
    var tokens = state.selection.applicationTokens
    if let token = state.unlocked, state.unlockUntil > now { tokens.remove(token) }
    shields.shield.applications = tokens.isEmpty ? nil : tokens
    // This store never applies category or web restrictions; removing one app
    // is sufficient to grant its pass and cannot accidentally open a category.
    shields.shield.applicationCategories = nil
    shields.shield.webDomains = nil
  }

  static func status(_ state: ShoppingBlockerState) -> [String: Any] {
    ["supported": true, "authorized": AuthorizationCenter.shared.authorizationStatus == .approved,
     "active": state.active, "appCount": state.selection.applicationTokens.count,
     "needsSelection": state.needsSelection,
     "needsNextGoal": state.needsNextGoal,
     "goalChangeAvailableAt": state.goalChangeAvailableAt,
     "startedAt": state.startedAt,
     "goalUSD": state.goalUSD, "progressUSD": state.progressUSD,
     "goalAmount": state.goalAmount, "goalCurrency": state.goalCurrency,
     "ready": state.ready,
     "unlockUntil": state.unlockUntil]
  }
}
