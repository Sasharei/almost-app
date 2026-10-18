import Foundation
import SQLite3
import CryptoKit
import AppIntents
import UserNotifications
import React
import UIKit
import ActivityKit

enum BankExpenseError: Error, LocalizedError {
  case unavailable, disabled, premiumRequired, walletInputRequired
  var errorDescription: String? { NSLocalizedString(self == .disabled ? "expenseDisabled" : self == .premiumRequired ? "expensePremiumRequired" : self == .walletInputRequired ? "expenseWalletInputRequired" : "expenseError", comment: "Expense import error") }
}

// App Intents live in the application target and use the same serialized local database as RN.
enum BankExpenseStore {
  static let queue = DispatchQueue(label: "com.sasarei.almost.expenses")
  static let noticeQueue = DispatchQueue(label: "com.sasarei.almost.expenses.notices")
  static let defaults = UserDefaults.standard
  static let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

  static func withDB<T>(_ body: (OpaquePointer) throws -> T) throws -> T {
    let directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let path = directory.appendingPathComponent("bank-expenses.sqlite").path
    var db: OpaquePointer?
    guard sqlite3_open(path, &db) == SQLITE_OK, let db else { if let db { sqlite3_close(db) }; throw BankExpenseError.unavailable }
    defer { sqlite3_close(db) }
    sqlite3_busy_timeout(db, 5000)
    try execute(db, "CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, source TEXT NOT NULL, label TEXT NOT NULL, text TEXT NOT NULL, amount TEXT, currency TEXT, created INTEGER NOT NULL, status TEXT NOT NULL, fingerprint TEXT NOT NULL)")
    try execute(db, "CREATE INDEX IF NOT EXISTS receipts_recent ON receipts(created DESC)")
    try execute(db, "CREATE INDEX IF NOT EXISTS receipts_wallet_identity ON receipts(source,fingerprint)")
    try execute(db, "CREATE TABLE IF NOT EXISTS expense_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)")
    try execute(db, "INSERT OR IGNORE INTO expense_meta VALUES ('revision',0)")
    try execute(db, "CREATE TABLE IF NOT EXISTS wallet_deliveries (receipt TEXT PRIMARY KEY, merchant TEXT NOT NULL, amount TEXT NOT NULL, currency TEXT NOT NULL, created INTEGER NOT NULL)")
    try execute(db, "CREATE INDEX IF NOT EXISTS wallet_deliveries_recent ON wallet_deliveries(merchant,amount,currency,created)")
    try execute(db, "CREATE TABLE IF NOT EXISTS wallet_duplicate_signals (id TEXT PRIMARY KEY, receipt TEXT NOT NULL, label TEXT NOT NULL, amount TEXT NOT NULL, currency TEXT NOT NULL, created INTEGER NOT NULL)")
    try execute(db, "CREATE INDEX IF NOT EXISTS wallet_duplicate_signals_receipt ON wallet_duplicate_signals(receipt)")
    try execute(db, "CREATE TABLE IF NOT EXISTS expense_categories (receipt TEXT PRIMARY KEY, category TEXT NOT NULL)")
    try execute(db, "CREATE TABLE IF NOT EXISTS expense_merchant_categories (merchant TEXT PRIMARY KEY, category TEXT NOT NULL)")
    for operation in ["INSERT", "UPDATE", "DELETE"] {
      try execute(db, "CREATE TRIGGER IF NOT EXISTS receipts_revision_\(operation) AFTER \(operation) ON receipts BEGIN UPDATE expense_meta SET value=value+1 WHERE key='revision'; END")
    }
    if !defaults.bool(forKey: "expenseDuplicateMigrationV1") {
      try execute(db, "INSERT OR IGNORE INTO wallet_deliveries SELECT id,lower(label),amount,currency,created FROM receipts WHERE source='apple-pay'")
      // Coalesce repeated deliveries from the legacy journal.
      // Retain tombstones so later deliveries cannot resurrect deleted purchases.
      try execute(db, "INSERT OR IGNORE INTO wallet_duplicate_signals SELECT r.id,(SELECT p.id FROM receipts p WHERE p.source='apple-pay' AND lower(p.label)=lower(r.label) AND p.amount=r.amount AND p.currency=r.currency AND p.created BETWEEN r.created-5000 AND r.created AND p.rowid<r.rowid ORDER BY p.rowid LIMIT 1),r.label,r.amount,r.currency,r.created FROM receipts r WHERE r.source='apple-pay' AND length(r.fingerprint)=36 AND r.status<>'deleted' AND EXISTS (SELECT 1 FROM receipts p WHERE p.source='apple-pay' AND lower(p.label)=lower(r.label) AND p.amount=r.amount AND p.currency=r.currency AND p.created BETWEEN r.created-5000 AND r.created AND p.rowid<r.rowid)")
      try execute(db, "UPDATE receipts AS r SET status='deleted' WHERE source='apple-pay' AND length(fingerprint)=36 AND status<>'deleted' AND EXISTS (SELECT 1 FROM receipts p WHERE p.source='apple-pay' AND length(p.fingerprint)=36 AND lower(p.label)=lower(r.label) AND p.amount=r.amount AND p.currency=r.currency AND p.created BETWEEN r.created-5000 AND r.created AND p.rowid<r.rowid)")
      try execute(db, "UPDATE receipts SET status='deleted' WHERE source='apple-pay' AND status<>'deleted' AND rowid NOT IN (SELECT MIN(rowid) FROM receipts WHERE source='apple-pay' GROUP BY label,amount,currency,created)")
      defaults.set(true, forKey: "expenseDuplicateMigrationV1")
    }
    var values = URLResourceValues(); values.isExcludedFromBackup = true
    var file = URL(fileURLWithPath: path); try file.setResourceValues(values)
    try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: path)
    return try body(db)
  }
  static func statement(_ db: OpaquePointer, _ sql: String, _ params: [String] = []) throws -> OpaquePointer {
    var stmt: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let stmt else { throw BankExpenseError.unavailable }
    for (index, value) in params.enumerated() {
      guard sqlite3_bind_text(stmt, Int32(index + 1), value, -1, transient) == SQLITE_OK else { sqlite3_finalize(stmt); throw BankExpenseError.unavailable }
    }
    return stmt
  }
  static func execute(_ db: OpaquePointer, _ sql: String, _ params: [String] = []) throws {
    let stmt = try statement(db, sql, params); defer { sqlite3_finalize(stmt) }
    guard sqlite3_step(stmt) == SQLITE_DONE else { throw BankExpenseError.unavailable }
  }
  static func exists(_ db: OpaquePointer, _ sql: String, _ params: [String]) throws -> Bool {
    let stmt = try statement(db, sql, params); defer { sqlite3_finalize(stmt) }
    let result = sqlite3_step(stmt)
    guard result == SQLITE_ROW || result == SQLITE_DONE else { throw BankExpenseError.unavailable }
    return result == SQLITE_ROW
  }
  static var premiumActive: Bool { defaults.double(forKey: "expensePremiumUntil") > Date().timeIntervalSince1970 * 1000 }
  static func captureWallet(amount: Decimal, currency: String, merchant: String? = nil, transactionDate: Date? = nil) throws -> Bool {
    try queue.sync {
      guard defaults.bool(forKey: "expenseEnabled") else { throw BankExpenseError.disabled }
      guard premiumActive else { throw BankExpenseError.premiumRequired }
      let code = currency.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
      let currencyCodes: [String]
      if #available(iOS 16.0, *) { currencyCodes = Locale.commonISOCurrencyCodes }
      else { currencyCodes = Locale.isoCurrencyCodes }
      guard currencyCodes.contains(code), let value = ExpenseParser.parseAmount(NSDecimalNumber(decimal: amount).stringValue, currency: code) else { throw BankExpenseError.unavailable }
      let now = Date().timeIntervalSince1970 * 1000
      let eventTime = transactionDate.map { $0.timeIntervalSince1970 * 1000 }
      if let eventTime, !eventTime.isFinite || eventTime <= 0 || eventTime > now + 300_000 { throw BankExpenseError.unavailable }
      let created = String(Int64(eventTime ?? now))
      let merchant = String((merchant ?? "").trimmingCharacters(in: .whitespacesAndNewlines).prefix(160))
      let label = merchant.isEmpty ? "Apple Pay" : "Apple Pay · " + merchant
      let merchantIdentity = merchant.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US_POSIX"))
      // Exact dates identify separate transactions. A missing date requires a
      // short delivery window, scoped to merchant, currency and amount.
      let fingerprint: String
      if let eventTime {
        let identity = "\(eventTime)|\(value)|\(code)|\(merchantIdentity)"
        fingerprint = SHA256.hash(data: Data(identity.utf8)).map { String(format: "%02x", $0) }.joined()
      } else { fingerprint = UUID().uuidString }
      return try withDB { db in
        try execute(db, "BEGIN IMMEDIATE")
        defer { try? execute(db, "ROLLBACK") }
        if eventTime != nil, try exists(db, "SELECT id FROM receipts WHERE source=? AND fingerprint=? LIMIT 1", ["apple-pay", fingerprint]) { return false }
        if eventTime == nil {
          let candidate = try statement(db, "SELECT receipt FROM wallet_deliveries WHERE merchant=lower(?) AND amount=? AND currency=? AND created>=? AND created<=? ORDER BY created LIMIT 1", [label, value, code, String(Int64(now) - 5_000), String(Int64(now) + 5_000)])
          defer { sqlite3_finalize(candidate) }
          let result = sqlite3_step(candidate)
          guard result == SQLITE_ROW || result == SQLITE_DONE else { throw BankExpenseError.unavailable }
          if result == SQLITE_ROW, let pointer = sqlite3_column_text(candidate, 0) {
            let receipt = String(cString: pointer)
            // Keep the signal recoverable: two genuine equal payments can be
            // separated by the user, without double-counting an automation retry.
            try execute(db, "INSERT INTO wallet_duplicate_signals VALUES (?,?,?,?,?,?)", [UUID().uuidString, receipt, label, value, code, created])
            try execute(db, "UPDATE expense_meta SET value=value+1 WHERE key='revision'")
            try execute(db, "COMMIT")
            return false
          }
        }
        let id = UUID().uuidString
        try execute(db, "INSERT INTO receipts VALUES (?,?,?,?,?,?,?,?,?)", [id, "apple-pay", label, "", value, code, created, "saved", fingerprint])
        try execute(db, "INSERT INTO wallet_deliveries VALUES (?,lower(?),?,?,?)", [id, label, value, code, created])
        try execute(db, "COMMIT")
        defaults.set("\(value) \(code)", forKey: "expenseWalletLastAmount")
        defaults.set(true, forKey: "expenseWalletReceived")
        defaults.set(now, forKey: "expenseWalletLastReceived")
        return true
      }
    }
  }
  static func page(_ offset: Int) throws -> [String: Any] {
    try withDB { db in
      try execute(db, "BEGIN DEFERRED TRANSACTION")
      defer { try? execute(db, "COMMIT") }
      let stmt = try statement(db, "SELECT r.id,r.label,r.text,r.amount,r.currency,r.created,r.status,r.source,COALESCE(c.category,m.category,''),(SELECT COUNT(*) FROM wallet_duplicate_signals d WHERE d.receipt=r.id) FROM receipts r LEFT JOIN expense_categories c ON c.receipt=r.id LEFT JOIN expense_merchant_categories m ON m.merchant=lower(r.label) WHERE r.status<>'deleted' ORDER BY r.created DESC,r.id LIMIT 50 OFFSET ?", [String(max(0, offset))])
      defer { sqlite3_finalize(stmt) }
      var items: [[String: Any]] = []
      var result = sqlite3_step(stmt)
      while result == SQLITE_ROW {
        func string(_ column: Int32) -> String { sqlite3_column_text(stmt, column).map { String(cString: $0) } ?? "" }
        items.append(["id": string(0), "label": string(1), "text": string(2), "amount": string(3), "currency": string(4), "created": sqlite3_column_int64(stmt, 5), "status": string(6), "source": string(7), "merchant": string(1).hasPrefix("Apple Pay · ") ? String(string(1).dropFirst(12)) : "", "category": string(8), "duplicateCount": sqlite3_column_int(stmt, 9)])
        result = sqlite3_step(stmt)
      }
      guard result == SQLITE_DONE else { throw BankExpenseError.unavailable }
      let count = try statement(db, "SELECT COUNT(*) FROM receipts WHERE status<>'deleted'")
      defer { sqlite3_finalize(count) }
      guard sqlite3_step(count) == SQLITE_ROW else { throw BankExpenseError.unavailable }
      let revision = try statement(db, "SELECT value FROM expense_meta WHERE key='revision'")
      defer { sqlite3_finalize(revision) }
      guard sqlite3_step(revision) == SQLITE_ROW else { throw BankExpenseError.unavailable }
      return ["items": items, "total": Int(sqlite3_column_int(count, 0)), "revision": sqlite3_column_int64(revision, 0)]
    }
  }
  static func updateReceipt(_ id: String, amount: String, currency: String, delete: Bool, category: String? = nil) throws {
    try withDB { db in
      try execute(db, "BEGIN IMMEDIATE")
      defer { try? execute(db, "ROLLBACK") }
      guard try exists(db, "SELECT id FROM receipts WHERE id=? AND status<>'deleted'", [id]) else { throw BankExpenseError.unavailable }
      if delete { try execute(db, "UPDATE receipts SET status='deleted',text='' WHERE id=?", [id]) }
      else {
        let currencyCodes: [String]
        if #available(iOS 16.0, *) { currencyCodes = Locale.commonISOCurrencyCodes }
        else { currencyCodes = Locale.isoCurrencyCodes }
        guard currencyCodes.contains(currency), let value = ExpenseParser.parseAmount(amount, currency: currency) else { throw BankExpenseError.unavailable }
        try execute(db, "UPDATE receipts SET status='saved',text='',amount=?,currency=? WHERE id=?", [value, currency, id])
        if let category {
          let allowed = ["food", "rent", "utilities", "car", "mandatory", "home", "transport", "health", "beauty", "fun", "things", "clothing", "education", "pets", "subscriptions", "vices"]
          guard allowed.contains(category) else { throw BankExpenseError.unavailable }
          try execute(db, "INSERT OR REPLACE INTO expense_categories VALUES (?,?)", [id, category])
          try execute(db, "INSERT OR REPLACE INTO expense_merchant_categories SELECT lower(label),? FROM receipts WHERE id=? AND label<>'Apple Pay'", [category, id])
        }
      }
      try execute(db, "COMMIT")
    }
  }
  static func separateDuplicate(_ receipt: String) throws {
    try withDB { db in
      try execute(db, "BEGIN IMMEDIATE")
      defer { try? execute(db, "ROLLBACK") }
      let signal = try statement(db, "SELECT d.id,d.label,d.amount,d.currency,d.created FROM wallet_duplicate_signals d JOIN receipts r ON r.id=d.receipt WHERE d.receipt=? AND r.status<>'deleted' ORDER BY d.created,d.id LIMIT 1", [receipt])
      defer { sqlite3_finalize(signal) }
      guard sqlite3_step(signal) == SQLITE_ROW else { throw BankExpenseError.unavailable }
      func string(_ col: Int32) -> String { sqlite3_column_text(signal, col).map { String(cString: $0) } ?? "" }
      let id = UUID().uuidString
      let created = String(sqlite3_column_int64(signal, 4))
      try execute(db, "INSERT INTO receipts VALUES (?,?,?,?,?,?,?,?,?)", [id,"apple-pay",string(1),"",string(2),string(3),created,"saved","split-" + id])
      try execute(db, "INSERT INTO wallet_deliveries VALUES (?,lower(?),?,?,?)", [id,string(1),string(2),string(3),created])
      try execute(db, "INSERT INTO expense_categories SELECT ?,category FROM expense_categories WHERE receipt=?", [id,receipt])
      try execute(db, "DELETE FROM wallet_duplicate_signals WHERE id=?", [string(0)])
      try execute(db, "COMMIT")
    }
  }
  static func notify() {
    guard let title = defaults.string(forKey: "expenseNoticeTitle"), let body = defaults.string(forKey: "expenseNoticeBody") else { return }
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
      noticeQueue.async {
        let now = Date().timeIntervalSince1970
        let last = defaults.double(forKey: "expenseLastNoticeAt")
        // Keep every receipt. Coalesce only banners, including concurrent Wallet callbacks.
        guard last <= 0 || now < last || now - last >= 30 * 60 else { return }
        let content = UNMutableNotificationContent(); content.title = title; content.body = defaults.string(forKey: "expenseWalletLastAmount") ?? body
        content.userInfo = ["url": "com.sasarei.almostclean://bank-expenses", "kind": "bank_expense"]
        defaults.set(now, forKey: "expenseLastNoticeAt")
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "bank-expenses", content: content, trigger: nil)) { error in
          guard error != nil else { return }
          noticeQueue.async {
            if defaults.double(forKey: "expenseLastNoticeAt") == now {
              defaults.removeObject(forKey: "expenseLastNoticeAt")
            }
          }
        }
      }
    }
  }
  static func changed() {
    NotificationCenter.default.post(name: Notification.Name("BankExpensesChanged"), object: nil)
  }

}

// Wallet's Transaction automation supplies a currency amount, not notification text.
// No AppShortcutsProvider: this action belongs inside the user's Wallet automation.
@available(iOS 17.0, *)
struct ImportApplePayTransactionIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "expenseWalletIntentTitle"
  static var description = IntentDescription("expenseWalletIntentDescription")
  static var openAppWhenRun = false
  @Parameter(title: "expenseWalletAmount", inputConnectionBehavior: .connectToPreviousIntentResult)
  var amount: String?
  @Parameter(title: "expenseWalletCurrency") var currency: String?
  @Parameter(title: "expenseWalletMerchant") var merchant: String?
  @Parameter(title: "expenseWalletDate") var transactionDate: Date?
  func perform() async throws -> some IntentResult & ReturnsValue<Bool> {
    let currency = ExpenseParser.walletCurrency(self.currency)
    let amount = ExpenseParser.walletAmount(self.amount, currency: currency)
    guard let amount, let currency, let normalized = ExpenseParser.parseAmount(amount, currency: currency),
          let value = Decimal(string: normalized, locale: Locale(identifier: "en_US_POSIX")) else { throw BankExpenseError.walletInputRequired }
    let inserted = try BankExpenseStore.captureWallet(amount: value, currency: currency, merchant: merchant, transactionDate: transactionDate)
    BankExpenseStore.changed()
    if inserted {
      let code = currency.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
      let display = "\(normalized) \(code)"
      let title = BankExpenseStore.defaults.string(forKey: "expenseNoticeTitle") ?? NSLocalizedString("expenseWalletRecorded", comment: "Wallet expense confirmation")
      // LiveActivityIntent permits a background Wallet automation to start this.
      if ActivityAuthorizationInfo().areActivitiesEnabled {
        let state = WalletExpenseAttributes.ContentState(title: title, amount: display, merchant: merchant ?? "", expiresAt: Date().addingTimeInterval(15))
        do {
          for activity in Activity<WalletExpenseAttributes>.activities { await activity.end(nil, dismissalPolicy: .immediate) }
          let activity = try Activity.request(attributes: WalletExpenseAttributes(), content: ActivityContent(state: state, staleDate: state.expiresAt), pushType: nil)
          // Keep the confirmation in the island briefly, then end it.
          try? await Task.sleep(nanoseconds: 5_000_000_000)
          await activity.end(ActivityContent(state: state, staleDate: state.expiresAt), dismissalPolicy: .after(state.expiresAt))
        } catch { BankExpenseStore.notify() }
      } else { BankExpenseStore.notify() }
    }
    return .result(value: inserted)
  }
}

@objc(BankExpenses)
class BankExpenses: RCTEventEmitter, UIDocumentInteractionControllerDelegate {
  private var changeObserver: NSObjectProtocol?
  override func supportedEvents() -> [String]! { ["BankExpensesChanged"] }
  override func startObserving() {
    changeObserver = NotificationCenter.default.addObserver(forName: Notification.Name("BankExpensesChanged"), object: nil, queue: .main) { [weak self] _ in
      self?.sendEvent(withName: "BankExpensesChanged", body: nil)
    }
  }
  override func stopObserving() {
    if let changeObserver { NotificationCenter.default.removeObserver(changeObserver) }
    changeObserver = nil
  }

  // Retain the document until the system finishes handing it to Shortcuts or cancels.
  private var walletDocument: UIDocumentInteractionController?
  @objc func installWalletAutomation(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let name: String
      if #available(iOS 27.0, *) { name = "AlmostApplePayAutomation" }
      else { name = "AlmostApplePayAction" }
      guard #available(iOS 17.0, *), self.walletDocument == nil,
            let url = Bundle.main.url(forResource: name, withExtension: "shortcut"),
            let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
            let window = scene.windows.first(where: { $0.isKeyWindow }),
            let root = window.rootViewController else {
        reject("wallet_install_unavailable", "bank_expenses_error", nil); return
      }
      var presenter = root
      while let presented = presenter.presentedViewController { presenter = presented }
      let installURL = FileManager.default.temporaryDirectory.appendingPathComponent("Almost Apple Pay.shortcut")
      do { try Data(contentsOf: url).write(to: installURL, options: .atomic) }
      catch { reject("wallet_install_unavailable", "bank_expenses_error", nil); return }
      let document = UIDocumentInteractionController(url: installURL)
      document.uti = "com.apple.shortcut"
      document.delegate = self
      self.walletDocument = document
      let bounds = presenter.view.bounds
      if document.presentOpenInMenu(from: CGRect(x: bounds.midX, y: bounds.maxY - 1, width: 1, height: 1), in: presenter.view, animated: true) {
        // Handoff is not proof of installation or enablement. The app must not mark setup complete.
        resolve(true)
      } else {
        self.walletDocument = nil
        reject("wallet_install_unavailable", "bank_expenses_error", nil)
      }
    }
  }
  func documentInteractionControllerDidDismissOpenInMenu(_ controller: UIDocumentInteractionController) { walletDocument = nil }
  func documentInteractionController(_ controller: UIDocumentInteractionController, didEndSendingToApplication application: String?) { walletDocument = nil }

  func run(_ resolve: @escaping RCTPromiseResolveBlock, _ reject: @escaping RCTPromiseRejectBlock, body: @escaping () throws -> Any) {
    BankExpenseStore.queue.async {
      do { resolve(try body()) } catch { reject("bank_expenses_error", "bank_expenses_error", nil) }
    }
  }
  func json(_ data: Any) throws -> String {
    String(data: try JSONSerialization.data(withJSONObject: data), encoding: .utf8) ?? "{}"
  }
  @objc override static func requiresMainQueueSetup() -> Bool { false }
  @objc func status(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let walletAvailable: Bool
    if #available(iOS 17.0, *) { walletAvailable = true } else { walletAvailable = false }
    let walletTemplateAvailable: Bool
    if #available(iOS 27.0, *) { walletTemplateAvailable = Bundle.main.url(forResource: "AlmostApplePayAutomation", withExtension: "shortcut") != nil }
    else { walletTemplateAvailable = Bundle.main.url(forResource: "AlmostApplePayAction", withExtension: "shortcut") != nil }
    run(resolve, reject) { try self.json(["walletConnected": BankExpenseStore.defaults.bool(forKey: "expenseWalletReceived") || (try BankExpenseStore.withDB { try BankExpenseStore.exists($0, "SELECT id FROM receipts WHERE source='apple-pay' LIMIT 1", []) }), "walletTemplateAvailable": walletTemplateAvailable, "enabled": BankExpenseStore.defaults.bool(forKey: "expenseEnabled"), "authorized": true, "sources": [], "walletAvailable": walletAvailable]) }
  }
  @objc func setPremiumAccess(_ expiresAt: Double, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    run(resolve, reject) { BankExpenseStore.defaults.set(expiresAt.isFinite ? expiresAt : 0, forKey: "expensePremiumUntil"); return true }
  }
  @objc func setNoticeCopy(_ title: String, body: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    run(resolve, reject) {
      BankExpenseStore.defaults.set(title, forKey: "expenseNoticeTitle"); BankExpenseStore.defaults.set(body, forKey: "expenseNoticeBody")
      return true
    }
  }
  @objc func configure(_ enabled: Bool, sources: NSArray, title: String, body: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    run(resolve, reject) {
      guard !enabled || BankExpenseStore.premiumActive else { throw BankExpenseError.premiumRequired }
      BankExpenseStore.defaults.set(enabled, forKey: "expenseEnabled")
      BankExpenseStore.defaults.set(title, forKey: "expenseNoticeTitle"); BankExpenseStore.defaults.set(body, forKey: "expenseNoticeBody")
      return true
    }
  }
  @objc func page(_ offset: Double, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    run(resolve, reject) { try self.json(BankExpenseStore.page(Int(offset))) }
  }
  @objc func update(_ id: String, amount: String, currency: String, delete: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    run(resolve, reject) {
      try BankExpenseStore.updateReceipt(id, amount: amount, currency: currency, delete: delete)
      BankExpenseStore.changed()
      return true
    }
  }
  @objc func updateCategorized(_ id: String, amount: String, currency: String, category: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    run(resolve, reject) {
      try BankExpenseStore.updateReceipt(id, amount: amount, currency: currency, delete: false, category: category)
      BankExpenseStore.changed()
      return true
    }
  }
  @objc func separateDuplicate(_ receipt: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    run(resolve, reject) {
      try BankExpenseStore.separateDuplicate(receipt)
      BankExpenseStore.changed()
      return true
    }
  }
  @objc func reset(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    run(resolve, reject) {
      BankExpenseStore.defaults.set(false, forKey: "expenseEnabled")
      try BankExpenseStore.withDB { db in
        try BankExpenseStore.execute(db, "DELETE FROM receipts")
        try BankExpenseStore.execute(db, "DELETE FROM wallet_duplicate_signals")
        try BankExpenseStore.execute(db, "DELETE FROM wallet_deliveries")
        try BankExpenseStore.execute(db, "DELETE FROM expense_categories")
        try BankExpenseStore.execute(db, "DELETE FROM expense_merchant_categories")
      }
      BankExpenseStore.defaults.removeObject(forKey: "expenseWalletReceived")
      BankExpenseStore.defaults.removeObject(forKey: "expenseWalletLastReceived")
      BankExpenseStore.changed()
      UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["bank-expenses"])
      return true
    }
  }
}
