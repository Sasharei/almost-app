const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildAlmiWidgetContext } = require('../../src/utils/almiWidgetContext');
const { resolve, timeline, HOUR } = require('../../src/utils/almiWidgetGuardian');
const anchor = 1700000000000;
test('home widget artwork fits the small WidgetKit archive budget at native pixel size', () => {
  // SwiftUI frame/scaledToFit does not shrink the pixels WidgetKit archives.
  // 1254-square scene assets previously rejected the entire family reload batch.
  const root = path.join(__dirname, '../../ios/Almost Widget/Assets.xcassets');
  for (const name of ['AlmiSavings', 'AlmiFire', 'AlmiTreasury', 'AlmiNeglected', 'AlmiWidget']) {
    const directory = path.join(root, `${name}.imageset`);
    const catalog = JSON.parse(fs.readFileSync(path.join(directory, 'Contents.json'), 'utf8'));
    for (const image of catalog.images.filter((item) => item.filename)) {
      const png = fs.readFileSync(path.join(directory, image.filename));
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
      assert.equal(png.subarray(12, 16).toString(), 'IHDR');
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      const limit = name === 'AlmiWidget' ? 96 : 768;
      assert.ok(width > 0 && height > 0 && width <= limit && height <= limit,
        `${image.filename}: ${width}×${height} exceeds ${limit}px widget budget`);
      assert.equal(width, height, 'Square artwork must retain its proportions');
    }
  }
});
test('real events drive scenes, without inventing an exhausted budget', () => {
  const expense = { kind: 'spend', timestamp: anchor, amountUSD: 100 };
  assert.equal(buildAlmiWidgetContext({ history: [expense], now: anchor }).eventScene, 'balance');
  assert.equal(buildAlmiWidgetContext({ history: [expense], now: anchor, budgetTotal: 1000, budgetRemaining: 0 }).eventScene, 'empty_treasury');
  assert.equal(buildAlmiWidgetContext({ history: [expense], now: anchor, budgetTotal: 1000, budgetRemaining: 500 }).eventScene, 'spending_fire');
  const saving = { ...expense, kind: 'refuse_spend' };
  const context = buildAlmiWidgetContext({ history: [saving], now: anchor + HOUR });
  assert.equal(context.eventScene, 'savings_guard');
  const synced = buildAlmiWidgetContext({ history: [saving], now: anchor + 7 * HOUR });
  assert.equal(synced.eventAt, anchor);
  assert.equal(resolve(synced, anchor + 7 * HOUR).scene, 'balance');
  assert.equal(buildAlmiWidgetContext({ history: null }).eventScene, 'balance');
});
test('expiry and late continuation leave a real balance widget', () => {
  const snapshot = { lastOpenedAt: anchor };
  for (let day = 1; day <= 365; day++) {
    assert.equal(resolve(snapshot, anchor + day * 24 * HOUR).scene, 'neglected');
    assert.equal(resolve(snapshot, anchor + (day * 24 + 6) * HOUR).scene, 'balance');
  }
  assert.equal(timeline(snapshot, anchor).entries.at(-1).scene, 'balance');
});
test('scene priority, exact boundaries and bad timestamps preserve the balance fallback', () => {
  for (const scene of ['savings_guard', 'spending_fire', 'empty_treasury']) {
    const ttl = scene === 'spending_fire' ? 4 * HOUR : 6 * HOUR;
    const snapshot = { eventScene: scene, eventAt: anchor, financialUpdatedAt: anchor, lastOpenedAt: anchor - 24 * HOUR };
    assert.equal(resolve(snapshot, anchor).scene, scene, 'Fresh events take priority over absence');
    assert.equal(resolve(snapshot, anchor + ttl - 1).scene, scene);
    assert.equal(resolve(snapshot, anchor + ttl).scene, scene === 'spending_fire' ? 'neglected' : 'balance');
    assert.equal(resolve({ ...snapshot, lastOpenedAt: anchor }, anchor + ttl).scene, 'balance');
    for (const invalid of [0, -1, anchor + HOUR, null]) {
      assert.equal(resolve({ ...snapshot, lastOpenedAt: 0, eventAt: invalid }, anchor).scene, 'balance');
      assert.equal(resolve({ ...snapshot, lastOpenedAt: 0, financialUpdatedAt: invalid }, anchor).scene, 'balance');
    }
    assert.equal(resolve({ ...snapshot, lastOpenedAt: 0, financialUpdatedAt: anchor - 24 * HOUR }, anchor).scene, 'balance');
  }
  assert.equal(resolve({ lastOpenedAt: anchor }, anchor + 48 * HOUR).copy, 'neglected_long');
  assert.equal(resolve({ lastOpenedAt: anchor }, anchor + 54 * HOUR).scene, 'balance');
  assert.equal(resolve({ lastOpenedAt: anchor }, anchor + 72 * HOUR).copy, 'neglected');
});
test('all supported scene translations have a caption and the open action', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../src/constants/almiWidgetCopy.js'), 'utf8');
  const copies = JSON.parse(source.replace(/^export const ALMI_WIDGET_COPY = /, '').trim().replace(/;$/, ''));
  assert.deepEqual(Object.keys(copies).sort(), ['en', 'es', 'fr', 'ru', 'de', 'pt', 'it', 'ar', 'zh', 'zh-Hant', 'ko', 'ja'].sort());
  for (const [language, words] of Object.entries(copies)) {
    for (const key of ['savings_guard', 'spending_fire', 'empty_treasury', 'neglected', 'neglected_long', 'open']) {
      assert.equal(typeof words[key], 'string', `${language}.${key}`);
      assert.ok(words[key].trim(), `${language}.${key} must not silently fall back to balance`);
    }
  }
});
test('actual iOS Foundation resolver matches the deadline model', { skip: process.platform !== 'darwin' }, () => {
  const source = fs.readFileSync(path.join(__dirname, '../../ios/Almost Widget/Almost_Widget.swift'), 'utf8');
  const native = source.slice(source.indexOf('private struct AlmiWidgetState'), source.indexOf('private struct AlmiSpeechBubble'));
  const nativeSchedule = source.slice(source.indexOf('    func getTimeline('), source.indexOf('    private func loadEntry('))
    .replace('let now = Date()', 'let now = qaNow');
  const samples = [];
  for (const hour of [0, 23, 24, 29, 30, 47, 48, 54, 72, 174, 365 * 24, 365 * 24 + 6]) {
    const snapshot = { lastOpenedAt: anchor };
    const now = anchor + hour * HOUR;
    samples.push({ ...snapshot, now, expected: resolve(snapshot, now).scene, expectedCopy: resolve(snapshot, now).copy });
  }
  for (const scene of ['empty_treasury', 'spending_fire', 'savings_guard']) {
    for (const hour of [0, 3.999, 4, 5.999, 6, 24, 30]) {
      const snapshot = { eventScene: scene, eventAt: anchor, financialUpdatedAt: anchor, lastOpenedAt: anchor };
      const now = anchor + hour * HOUR;
      samples.push({ ...snapshot, now, expected: resolve(snapshot, now).scene, expectedCopy: resolve(snapshot, now).copy });
    }
    for (const key of ['eventAt', 'financialUpdatedAt', 'lastOpenedAt']) {
      for (const invalid of [0, -1, anchor + HOUR, null]) {
        const snapshot = { eventScene: scene, eventAt: anchor, financialUpdatedAt: anchor, lastOpenedAt: 0, [key]: invalid };
        samples.push({ ...snapshot, now: anchor, expected: resolve(snapshot, anchor).scene, expectedCopy: resolve(snapshot, anchor).copy });
      }
    }
  }
  for (const extra of [{ raw: '{broken' }, { version: 2 }, { hasData: false }, { missingCopy: true }, { emptyCopy: true }]) {
    samples.push({ eventScene: 'savings_guard', eventAt: anchor, financialUpdatedAt: anchor, lastOpenedAt: 0, now: anchor, ...extra, expected: 'balance' });
  }
  for (const sample of samples.filter((item) => item.expectedCopy)) {
    sample.expectedTimeline = timeline(sample, sample.now).entries.map(({ date, scene }) => ({ date, scene }));
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almi-native-guard-'));
  try {
    fs.writeFileSync(path.join(dir, 'samples.json'), JSON.stringify(samples));
    const script = `import Foundation
private let keyHasData = "widget_has_data"
${native}
let samples = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))) as! [[String: Any]]
let suite = "almi.widget.test." + UUID().uuidString
let appGroupId = suite
let defaults = UserDefaults(suiteName: suite)!
var qaNow = Date()
struct Context {}
struct AlmostWidgetEntry { let date: Date; let scene: String }
enum ReloadPolicy { case after(Date) }
struct Timeline<Entry> { let entries: [Entry]; let policy: ReloadPolicy }
struct NativeScheduleProvider {
  func loadEntry(at date: Date = Date(), forceBalance: Bool = false) -> AlmostWidgetEntry {
    AlmostWidgetEntry(date: date, scene: forceBalance ? "balance" : almiWidgetState(defaults, at: date).scene)
  }
${nativeSchedule}
}
defer { defaults.removePersistentDomain(forName: suite) }
for sample in samples {
  defaults.set(sample["hasData"] as? Bool ?? true, forKey: keyHasData)
  if let last = sample["lastOpenedAt"] as? NSNumber {
    defaults.set(last, forKey: "widget_almi_last_opened")
  } else { defaults.removeObject(forKey: "widget_almi_last_opened") }
  var context = sample
  context["version"] = sample["version"] ?? 1
  context["copy"] = ["neglected": "neglected", "neglected_long": "neglected_long", "empty_treasury": "empty_treasury", "spending_fire": "spending_fire", "savings_guard": "savings_guard", "open": "open"]
  if sample["missingCopy"] as? Bool == true { context.removeValue(forKey: "copy") }
  if sample["emptyCopy"] as? Bool == true { context["copy"] = ["savings_guard": ""] }
  let data = try JSONSerialization.data(withJSONObject: context)
  defaults.set(sample["raw"] as? String ?? String(data: data, encoding: .utf8)!, forKey: "widget_almi_context")
  let now = (sample["now"] as! NSNumber).doubleValue
  let actual = almiWidgetState(defaults, at: Date(timeIntervalSince1970: now / 1000))
  precondition(actual.scene == sample["expected"] as! String, "Native deadline mismatch")
  if actual.scene != "balance", let expectedCopy = sample["expectedCopy"] as? String {
    precondition(actual.caption == expectedCopy, "Native caption cycle mismatch")
  }
  if let expected = sample["expectedTimeline"] as? [[String: Any]] {
    qaNow = Date(timeIntervalSince1970: now / 1000)
    NativeScheduleProvider().getTimeline(in: Context()) { actualTimeline in
      precondition(actualTimeline.entries.count == expected.count, "Native timeline entry count mismatch")
      for (entry, target) in zip(actualTimeline.entries, expected) {
        let timestamp = (target["date"] as! NSNumber).doubleValue
        precondition(abs(entry.date.timeIntervalSince1970 * 1000 - timestamp) < 1, "Native timeline deadline mismatch")
        precondition(entry.scene == target["scene"] as! String, "Native timeline scene mismatch")
      }
      guard case .after(let reload) = actualTimeline.policy else { return }
      precondition(abs(reload.timeIntervalSince1970 * 1000 - (now + 156 * 3600000)) < 1, "Native reload deadline mismatch")
      precondition(actualTimeline.entries.last!.scene == "balance", "Delayed reload must end on usable balance")
    }
  }
}
print("native deadline parity passed")
`;
    const scriptPath = path.join(dir, 'guard.swift');
    fs.writeFileSync(scriptPath, script);
    const output = execFileSync('swift', ['-module-cache-path', path.join(dir, 'cache'), scriptPath, path.join(dir, 'samples.json')], { encoding: 'utf8', timeout: 60000 });
    assert.match(output, /native deadline parity passed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
