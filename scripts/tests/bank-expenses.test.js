const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { Buffer } = require("node:buffer");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const fixtures = require("./expense-fixtures.json");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("real iOS and Android parsers agree on multilingual purchases, ambiguous amounts and non-expenses", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "almost-expenses-test-"));
  try {
    fs.writeFileSync(path.join(dir, "ExpenseParserRunner.java"), `import com.sasarei.almostclean.expenses.ExpenseParser;
import java.util.Base64;
public class ExpenseParserRunner {
  public static void main(String[] args) {
    for (String arg : args) {
      ExpenseParser.Result r = ExpenseParser.parse(new String(Base64.getDecoder().decode(arg), java.nio.charset.StandardCharsets.UTF_8));
      System.out.println(r.expense + "|" + (r.amount == null ? "" : r.amount) + "|" + (r.currency == null ? "" : r.currency));
    }
  }
}`);
    execFileSync("/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/javac", ["-d", dir, path.join(root, "android/app/src/main/java/com/sasarei/almostclean/expenses/ExpenseParser.java"), path.join(dir, "ExpenseParserRunner.java")]);
    const args = fixtures.map((row) => Buffer.from(row.text).toString("base64"));
    const java = execFileSync("/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/java", ["-cp", dir, "ExpenseParserRunner", ...args], { encoding: "utf8" }).trim().split("\n");
    fs.writeFileSync(path.join(dir, "main.swift"), `import Foundation
for arg in CommandLine.arguments.dropFirst() {
  let text = String(data: Data(base64Encoded: arg)!, encoding: .utf8)!
  let r = ExpenseParser.parse(text)
  print("\\(r.expense)|\\(r.amount ?? "")|\\(r.currency ?? "")")
}`);
    execFileSync("xcrun", ["swiftc", path.join(root, "ios/Almost/ExpensePatterns.swift"), path.join(root, "ios/Almost/ExpenseParser.swift"), path.join(dir, "main.swift"), "-o", path.join(dir, "parser")]);
    const swift = execFileSync(path.join(dir, "parser"), args, { encoding: "utf8" }).trim().split("\n");
    fixtures.forEach((row, index) => {
      const expected = `${row.expense}|${row.amount || ""}|${row.currency || ""}`;
      assert.equal(java[index], expected, `Android: ${row.text}`);
      assert.equal(swift[index], expected, `iOS: ${row.text}`);
    });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("App Intent metadata and screen copy are localized in every supported dictionary", () => {
  const source = read("src/constants/bankExpenseCopy.js");
  const copy = JSON.parse(source.replace("export const BANK_EXPENSE_COPY = ", "").trim().replace(/;$/, ""));
  const metadata = JSON.parse(read("ios/Almost/Localizable.xcstrings"));
  const mapping = { expenseWalletIntentTitle: "walletIntentTitle", expenseWalletIntentDescription: "walletIntentDescription", expenseWalletAmount: "walletAmount", expenseWalletCurrency: "walletCurrency", expenseWalletMerchant: "walletMerchant", expenseWalletDate: "walletDate", expenseWalletInputRequired: "walletInputRequired", expenseSource: "source", expenseDisabled: "disabled", expenseError: "error", expensePremiumRequired: "premiumRequired" };
  for (const language of ["en", "es", "fr", "ru", "de", "pt", "it", "ar", "zh", "zh-Hant", "ko", "ja"]) {
    assert.deepEqual(Object.keys(copy[language]).sort(), Object.keys(copy.en).sort());
    for (const [native, key] of Object.entries(mapping)) assert.equal(metadata.strings[native].localizations[language].stringUnit.value, copy[language][key]);
  }
  const rules = require("../../src/bankExpenses/parserRules.json");
  for (const [key, pattern] of Object.entries(rules)) assert.ok(read("ios/Almost/ExpensePatterns.swift").includes(`static let ${key} = #"${pattern}"#`));
});

test("the actual iOS Wallet ledger preserves money, rejects invalid input, enforces Premium, retains duplicate markers and exposes every page", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "almost-expenses-store-"));
  try {
    // Compile the production store for host-side execution without UIKit, devices or RN.
    // Only the filesystem location, preferences suite and iOS file-protection call are adapted.
    let store = read("ios/Almost/BankExpenses.swift").split("  static func notify()")[0] + "}\n";
    store = store.replace(/import (AppIntents|UserNotifications|React|UIKit|ActivityKit)\n/g, "")
      .replace("static let defaults = UserDefaults.standard", `static let defaults = UserDefaults(suiteName: ${JSON.stringify(path.basename(dir))})!`)
      .replace(/let directory = try FileManager.default.url\([^\n]+\)/, `let directory = URL(fileURLWithPath: ${JSON.stringify(dir)})`)
      .replace(/    try FileManager.default.setAttributes\([^\n]+\)\n/, "");
    fs.writeFileSync(path.join(dir, "Store.swift"), store);
    fs.writeFileSync(path.join(dir, "main.swift"), `import Foundation
func check(_ value: Bool) { if !value { fatalError("ledger invariant failed") } }
func rejected(_ amount: Decimal = 12, _ currency: String = "USD", date: Date? = nil) {
  do { _ = try BankExpenseStore.captureWallet(amount: amount, currency: currency, transactionDate: date); fatalError("invalid capture accepted") } catch {}
}
rejected()
BankExpenseStore.defaults.set(true, forKey: "expenseEnabled")
rejected()
BankExpenseStore.defaults.set(Date().timeIntervalSince1970 * 1000 + 100000, forKey: "expensePremiumUntil")
rejected(0); rejected(-1); rejected(Decimal.nan); rejected(1, ""); rejected(1, "ZZZ")
rejected(Decimal(string: "1.234")!, "USD")
rejected(1_000_000_001)
rejected(date: Date(timeIntervalSince1970: 0))
rejected(date: Date(timeIntervalSinceNow: 3600))
let event = Date(timeIntervalSinceNow: -30)
check(try BankExpenseStore.captureWallet(amount: Decimal(string: "12.34")!, currency: "USD", merchant: "Cafe", transactionDate: event))
check(!(try BankExpenseStore.captureWallet(amount: Decimal(string: "12.34")!, currency: "USD", merchant: "Cafe", transactionDate: event)))
var items = try BankExpenseStore.page(0)["items"] as! [[String: Any]]
check(items.count == 1 && items[0]["amount"] as! String == "12.34" && items[0]["currency"] as! String == "USD")
check(items[0]["label"] as! String == "Apple Pay · Cafe" && items[0]["text"] as! String == "" && items[0]["status"] as! String == "saved")
let id = items[0]["id"] as! String
try BankExpenseStore.withDB { try BankExpenseStore.execute($0, "UPDATE receipts SET status='deleted' WHERE id=?", [id]) }
check(!(try BankExpenseStore.captureWallet(amount: Decimal(string: "12.34")!, currency: "USD", merchant: "Cafe", transactionDate: event)))
check(try BankExpenseStore.captureWallet(amount: Decimal(string: "12.34")!, currency: "USD", merchant: "Cafe", transactionDate: event.addingTimeInterval(1)))
// Missing-date duplicate signals coalesce, while different merchants survive.
check(try BankExpenseStore.captureWallet(amount: 7, currency: "SAR"))
check(!(try BankExpenseStore.captureWallet(amount: 7, currency: "SAR")))
check(try BankExpenseStore.captureWallet(amount: 7, currency: "SAR", merchant: "Other"))
items = try BankExpenseStore.page(0)["items"] as! [[String: Any]]
let equalPurchases = items.filter { $0["currency"] as! String == "SAR" }
check(equalPurchases.count == 2 && equalPurchases.filter { $0["status"] as! String == "review" }.count == 0)
check(try BankExpenseStore.captureWallet(amount: Decimal(string: "1.234")!, currency: " kwd "))
let kwd = (try BankExpenseStore.page(0)["items"] as! [[String: Any]]).first { $0["currency"] as! String == "KWD" }!
check(kwd["amount"] as! String == "1.234" && kwd["label"] as! String == "Apple Pay")
// Native corrections are atomic, update revisions and teach future merchant matches.
let correctionRevision = try BankExpenseStore.page(0)["revision"] as! Int64
let kwdID = kwd["id"] as! String
try BankExpenseStore.updateReceipt(kwdID, amount: "2.345", currency: "KWD", delete: false, category: "food")
check((try BankExpenseStore.page(0)["revision"] as! Int64) > correctionRevision)
do { try BankExpenseStore.updateReceipt(kwdID, amount: "9", currency: "KWD", delete: false, category: "invalid"); fatalError("invalid category accepted") } catch {}
let unchanged = (try BankExpenseStore.page(0)["items"] as! [[String: Any]]).first { $0["id"] as! String == kwdID }!
check(unchanged["amount"] as! String == "2.345" && unchanged["category"] as! String == "food")
check(try BankExpenseStore.captureWallet(amount: 44, currency: "SAR", merchant: "Learned merchant"))
let learned = (try BankExpenseStore.page(0)["items"] as! [[String: Any]]).first { $0["merchant"] as! String == "Learned merchant" }!
try BankExpenseStore.updateReceipt(learned["id"] as! String, amount: "45", currency: "SAR", delete: false, category: "transport")
check(!(try BankExpenseStore.captureWallet(amount: 44, currency: "SAR", merchant: "Learned merchant")))
check(try BankExpenseStore.captureWallet(amount: 46, currency: "SAR", merchant: "Learned merchant"))
let learnedNext = (try BankExpenseStore.page(0)["items"] as! [[String: Any]]).first { $0["amount"] as! String == "46" }!
check(learnedNext["category"] as! String == "transport")
try BankExpenseStore.updateReceipt(learnedNext["id"] as! String, amount: "", currency: "", delete: true)
check(!(try BankExpenseStore.captureWallet(amount: 46, currency: "SAR", merchant: "Learned merchant")))
// Legacy duplicate signals may have different milliseconds. Migrate once,
// keeping other merchants and later equal purchases intact.
try BankExpenseStore.withDB { db in
  let time = Int64(Date().timeIntervalSince1970 * 1000) - 100_000
  for (id, label, date) in [("legacy-a", "Apple Pay · Metro", time), ("legacy-b", "Apple Pay · Metro", time + 500), ("legacy-c", "Apple Pay · Metro", time + 10_000), ("legacy-d", "Apple Pay · Other", time + 500)] {
    try BankExpenseStore.execute(db, "INSERT INTO receipts VALUES (?,?,?,?,?,?,?,?,?)", [id,"apple-pay",label,"","99","SAR",String(date),"saved",UUID().uuidString])
  }
}
BankExpenseStore.defaults.set(false, forKey: "expenseDuplicateMigrationV1")
let migrated = try BankExpenseStore.page(0)["items"] as! [[String: Any]]
check(migrated.contains { $0["id"] as! String == "legacy-a" })
check(!migrated.contains { $0["id"] as! String == "legacy-b" })
check(migrated.contains { $0["id"] as! String == "legacy-c" })
check(migrated.contains { $0["id"] as! String == "legacy-d" })
let legacyCount = try BankExpenseStore.page(0)["total"] as! Int
let legacy = migrated.first { $0["id"] as! String == "legacy-a" }!
check(legacy["duplicateCount"] as! Int32 == 1)
try BankExpenseStore.separateDuplicate("legacy-a")
check(try BankExpenseStore.page(0)["total"] as! Int == legacyCount + 1)
do { try BankExpenseStore.separateDuplicate("legacy-a"); fatalError("same signal separated twice") } catch {}
let restored = try BankExpenseStore.page(0)["items"] as! [[String: Any]]
check(restored.filter { $0["label"] as! String == "Apple Pay · Metro" }.count == 3)

BankExpenseStore.defaults.set(Date().timeIntervalSince1970 * 1000 - 1, forKey: "expensePremiumUntil")
rejected()
BankExpenseStore.defaults.set(Date().timeIntervalSince1970 * 1000 + 100000, forKey: "expensePremiumUntil")
BankExpenseStore.defaults.set(false, forKey: "expenseEnabled")
rejected()
BankExpenseStore.defaults.set(true, forKey: "expenseEnabled")
try BankExpenseStore.withDB { try BankExpenseStore.execute($0, "DELETE FROM receipts") }
let group = DispatchGroup()
for _ in 0..<12 {
  group.enter(); DispatchQueue.global().async {
    _ = try! BankExpenseStore.captureWallet(amount: 18, currency: "EUR", transactionDate: event)
    group.leave()
  }
}
group.wait()
check(try BankExpenseStore.page(0)["total"] as! Int == 1)
try BankExpenseStore.withDB { try BankExpenseStore.execute($0, "DELETE FROM receipts") }
let noDateGroup = DispatchGroup()
for _ in 0..<12 {
  noDateGroup.enter(); DispatchQueue.global().async {
    _ = try! BankExpenseStore.captureWallet(amount: 55, currency: "SAR", merchant: "Parallel")
    noDateGroup.leave()
  }
}
noDateGroup.wait()
check(try BankExpenseStore.page(0)["total"] as! Int == 1)
for n in 0..<80 { check(try BankExpenseStore.captureWallet(amount: Decimal(n + 1), currency: "USD", transactionDate: event.addingTimeInterval(Double(n + 5)))) }
check(try BankExpenseStore.page(0)["total"] as! Int == 81)
check((try BankExpenseStore.page(0)["items"] as! [[String: Any]]).count == 50)
check((try BankExpenseStore.page(50)["items"] as! [[String: Any]]).count == 31)
try BankExpenseStore.withDB { try BankExpenseStore.execute($0, "DELETE FROM receipts") }
check(try BankExpenseStore.page(0)["total"] as! Int == 0)
BankExpenseStore.defaults.removePersistentDomain(forName: ${JSON.stringify(path.basename(dir))})
print("wallet ledger passed")
`);
    execFileSync("xcrun", ["swiftc", path.join(root, "ios/Almost/ExpensePatterns.swift"), path.join(root, "ios/Almost/ExpenseParser.swift"), path.join(dir, "Store.swift"), path.join(dir, "main.swift"), "-o", path.join(dir, "ledger")]);
    assert.match(execFileSync(path.join(dir, "ledger"), [], { encoding: "utf8" }), /ledger passed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("background imports are opt-in, source-limited, local and do not replay existing notifications", () => {
  const service = read("android/app/src/main/java/com/sasarei/almostclean/expenses/ExpenseNotifications.kt");
  assert.ok(service.includes('prefs.getBoolean("enabled", false)'));
  assert.ok(service.includes('getStringSet("sources", emptySet())'));
  assert.ok(service.includes('sbn.postTime < prefs.getLong("enabledAt", Long.MAX_VALUE)'));
  assert.ok(service.includes("Notification.FLAG_GROUP_SUMMARY"));
  const store = read("android/app/src/main/java/com/sasarei/almostclean/expenses/ExpenseStore.kt");
  assert.ok(store.includes("db.beginTransaction()"));
  assert.ok(store.includes("CONFLICT_IGNORE"));
  assert.ok(store.includes('values.put("status", "deleted")'));
  const swift = read("ios/Almost/BankExpenses.swift");
  assert.ok(swift.includes('guard defaults.bool(forKey: "expenseEnabled")'));
  assert.ok(swift.includes("openAppWhenRun = false"));
  assert.ok(swift.includes("completeUntilFirstUserAuthentication"));
  for (const source of [service, store, swift]) assert.doesNotMatch(source, /https?:|logEvent\(|af_purchase|Analytics\./);
});

 test("premium access rejects expired, revoked and malformed entitlements, and preserves lifetime", async () => {
  const source = read("src/bankExpenses/premiumAccess.js");
  const { expensePremiumUntil } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const now = 100000000;
  assert.equal(expensePremiumUntil({ isPremium: false }, now), 0);
  assert.equal(expensePremiumUntil({ isPremium: true, entitlement: { expirationDate: "invalid" } }, now), 0);
  assert.equal(expensePremiumUntil({ isPremium: true, entitlement: { expirationDate: now - 1 } }, now), 0);
  assert.equal(expensePremiumUntil({ isPremium: true, entitlement: { expirationDate: now + 100 } }, now), now + 100);
  assert.equal(expensePremiumUntil({ isPremium: true }, now), 0);
  assert.equal(expensePremiumUntil({ isPremium: true, enabled: true }, now), now + 86400000);
  assert.equal(expensePremiumUntil({ isPremium: true, enabled: true, customerInfoErrorReason: "offline" }, now), 0);
  assert.equal(expensePremiumUntil({ isPremium: true, entitlement: { productIdentifier: "almost_premium_lifetime" } }, now), 8640000000000000);
  const android = read("android/app/src/main/java/com/sasarei/almostclean/expenses/ExpenseStore.kt");
  assert.ok(android.includes('preferences.getLong("premiumUntil", 0) <= System.currentTimeMillis()'));
  const service = read("android/app/src/main/java/com/sasarei/almostclean/expenses/ExpenseNotifications.kt");
  assert.equal(service.split('prefs.getLong("premiumUntil", 0) <= System.currentTimeMillis()').length - 1, 2);
});

test("every paywall locale includes automatic expenses and feature gates name it", async () => {
  const bankSource = read("src/constants/bankExpenseCopy.js");
  const source = read("src/monetization/constants.js")
    .replace(/import \{ BANK_EXPENSE_COPY \}[^;]+;/, bankSource.replace("export const", "const"))
    .replace(/import \{ LANGUAGE_MAP_FALLBACK_TRANSLATIONS \}[^;]+;/, "const LANGUAGE_MAP_FALLBACK_TRANSLATIONS = {};");
  const { buildPaywallCopy, PREMIUM_FEATURE_KEYS } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const bank = JSON.parse(bankSource.split(" = ")[1].trim().replace(/;$/, ""));
  for (const [language, copy] of Object.entries(bank)) {
    const paywall = buildPaywallCopy({ language, kind: "feature", featureKey: PREMIUM_FEATURE_KEYS.automaticExpenses });
    assert.equal(paywall.benefitBullets.find((row) => row.id === "automaticExpenses").label, copy.title);
    assert.ok(paywall.v2ContextTitle.includes(copy.title), language);
  }
  const modal = read("src/components/PremiumPaywallModalV2.js");
  assert.ok(modal.indexOf('{ id: "automaticExpenses", icon:') < modal.indexOf('{ id: "reports", icon:'));
});


test("iOS Wallet setup uses an explicit amount and ISO currency and removes the standalone notification shortcut", () => {
  const swift = read("ios/Almost/BankExpenses.swift");
  assert.ok(swift.includes("struct ImportApplePayTransactionIntent: LiveActivityIntent"));
  assert.ok(swift.includes("var amount: String?"));
  assert.ok(swift.includes("var currency: String?"));
  assert.ok(swift.includes("inputConnectionBehavior: .connectToPreviousIntentResult"));
  assert.ok(swift.includes("guard let amount, let currency, let normalized = ExpenseParser.parseAmount(amount, currency: currency)"));
  assert.doesNotMatch(swift, /struct ImportBankNotificationIntent|struct BankExpenseShortcuts|ShortcutsUIButton/);
  const panel = read("src/components/BankExpensesPanel.js");
  assert.ok(panel.includes("copy.walletSetupPending"));
  assert.ok(panel.includes("copy.walletUnavailable"));
  assert.ok(panel.includes('else if (walletSetup) setWalletSetup(false)'));
  assert.ok(panel.includes('expenses-wallet-open-automation'));
  assert.ok(read("src/bankExpenses/useBankExpenses.js").includes("native.installWalletAutomation()"));
  assert.ok(swift.includes('document.uti = "com.apple.shortcut"'));
  assert.ok(swift.includes("presentOpenInMenu"));
  assert.deepEqual(JSON.parse(read("ios/Almost/AppShortcuts.xcstrings")).strings, {});
  const copy = JSON.parse(read("src/constants/bankExpenseCopy.js").split(" = ")[1].trim().replace(/;$/, ""));
  for (const [language, entry] of Object.entries(copy)) {
    assert.deepEqual([...entry.iosSetup.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort(), [], language);
    for (const key of ["walletSetupPending", "walletUnavailable", "walletSetup", "walletInputRequired"]) assert.ok(entry[key], `${language}/${key}`);
    assert.equal(entry.notificationText, undefined);
    assert.equal(entry.shortcuts, undefined);
  }
});

test("signed Wallet packages preserve their real payload and cannot ship a stripped trigger", () => {
  execFileSync("python3", ["-c", `
import sys, pathlib, plistlib
sys.path.insert(0, 'scripts/shortcuts')
from verify_wallet_shortcuts import verify
root = pathlib.Path('.')
for name, trigger in [('AlmostApplePayAction', False), ('AlmostApplePayAutomation', True)]:
    source = plistlib.loads((root / 'scripts/shortcuts' / (name + '.unsigned.shortcut')).read_bytes())
    action = source['WFWorkflowActions'][0]
    assert action['WFWorkflowActionIdentifier'] == 'com.sasarei.almostclean.ImportApplePayTransactionIntent'
    assert source['WFWorkflowImportQuestions'] == []
    parameters = action['WFWorkflowActionParameters']
    assert parameters['AppIntentDescriptor']['TeamIdentifier'] == 'CGRYGJXPS2'
    for field, props in [('amount', ['Amount', 'Currency Amount']), ('currency', ['Amount', 'Currency Code']), ('merchant', ['Merchant'])]:
        token = parameters[field]
        assert token['WFSerializationType'] == 'WFTextTokenString'
        value = token['Value']['attachmentsByRange']['{0, 1}']
        assert [part['PropertyName'] for part in value['Aggrandizements']] == props
        assert value['Type'] == ('TriggerOutput' if trigger else 'ExtensionInput')
    if trigger:
        assert source['WFWorkflowTriggers'][0]['WFTriggerIdentifier'] == 'WFWalletTransactionTrigger'
        assert source['WFWorkflowTriggers'][0]['WFTriggerSerializedParameters'] == {}
    signed = root / 'ios/Almost' / (name + '.shortcut')
    assert signed.exists(), f"Missing bundled Wallet template: {name}"
    verify(source, signed)
`], { cwd: root });
  const swift = read("ios/Almost/BankExpenses.swift");
  assert.ok(swift.includes('"walletTemplateAvailable": walletTemplateAvailable'));
  assert.ok(read("src/components/BankExpensesPanel.js").includes("!walletTemplateAvailable"));
  assert.doesNotMatch(read("src/bankExpenses/useBankExpenses.js"), /shortcuts:\/\//);
});

test("Wallet receipts drive ordinary spend history once, with category correction and currency safety", async () => {
  const source = read("src/bankExpenses/walletHistory.js");
  const { classifyMerchant, walletHistoryEvents, mergeWalletHistory } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  assert.equal(classifyMerchant("81005 Riyadh Metro").category, "transport");
  assert.equal(classifyMerchant("Shababik").category, "food");
  assert.equal(classifyMerchant("شبابيك").category, "food");
  assert.equal(classifyMerchant("Unfamiliar merchant").recognized, false);
  assert.equal(classifyMerchant("Metropolis").recognized, false);
  const rates = { SAR: 3.75, USD: 1 };
  const convert = (amount, currency) => rates[currency] ? amount / rates[currency] : NaN;
  const receipt = { id: "receipt-1", source: "apple-pay", merchant: "81005 Riyadh Metro", amount: "100", currency: "SAR", created: Date.now(), status: "saved" };
  const projected = walletHistoryEvents([receipt], convert, classifyMerchant);
  assert.equal(projected[0].kind, "spend");
  assert.equal(projected[0].meta.category, "transport");
  assert.equal(projected[0].meta.amountUSD, 100 / 3.75);
  assert.equal(projected[0].meta.amountLocal, 100);
  assert.equal(projected[0].timestamp, receipt.created);
  const manual = { id: "manual", kind: "spend", timestamp: receipt.created - 1, meta: { amountUSD: 5 } };
  const history = mergeWalletHistory([manual], projected);
  assert.equal(history.reduce((sum, row) => sum + row.meta.amountUSD, 0), 5 + 100 / 3.75);
  assert.deepEqual(mergeWalletHistory(history, projected), history);
  const corrected = walletHistoryEvents([{ ...receipt, amount: "20", category: "food" }], convert, classifyMerchant);
  const edited = mergeWalletHistory(history, corrected);
  assert.equal(edited.length, 2);
  assert.equal(edited[0].id, projected[0].id);
  assert.equal(edited[0].meta.category, "food");
  assert.equal(edited[0].meta.amountUSD, 20 / 3.75);
  assert.deepEqual(mergeWalletHistory(history, []), [manual]);
  assert.deepEqual(walletHistoryEvents([{ ...receipt, currency: "ZZZ" }, { ...receipt, status: "review" }, { ...receipt, status: "deleted" }], convert, classifyMerchant), []);
});

test("Live Activity raster assets match their point sizes at every device scale", () => {
  const view = read("ios/Almost Widget/Almost_WidgetLiveActivity.swift");
  const images = [...view.matchAll(/Image\("([^"]+)"\)[^\n]*?\.frame\(width: (\d+), height: (\d+)\)/g)];
  assert.equal(images.length, 3, "lock-screen, expanded and compact cat presentations must be covered");
  for (const [, name, width, height] of images) {
    const folder = path.join(root, "ios/Almost Widget/Assets.xcassets", `${name}.imageset`);
    const catalog = JSON.parse(fs.readFileSync(path.join(folder, "Contents.json"), "utf8"));
    assert.deepEqual(catalog.images.map((image) => image.scale).sort(), ["1x", "2x", "3x"]);
    for (const image of catalog.images) {
      const png = fs.readFileSync(path.join(folder, image.filename));
      assert.equal(png.toString("ascii", 12, 16), "IHDR");
      const scale = Number.parseInt(image.scale, 10);
      assert.equal(png.readUInt32BE(16), Number(width) * scale, `${name}/${image.scale}: incorrect pixel width can cause WidgetKit redaction`);
      assert.equal(png.readUInt32BE(20), Number(height) * scale, `${name}/${image.scale}: incorrect pixel height can cause WidgetKit redaction`);
    }
  }
});
