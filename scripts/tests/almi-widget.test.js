const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildAlmiWidgetContext } = require('../../src/utils/almiWidgetContext');
const { resolve, timeline, HOUR } = require('../../src/utils/almiWidgetGuardian');
const anchor = 1700000000000;
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
test('actual iOS Foundation resolver matches the deadline model', { skip: process.platform !== 'darwin' }, () => {
  const source = fs.readFileSync(path.join(__dirname, '../../ios/Almost Widget/Almost_Widget.swift'), 'utf8');
  const native = source.slice(source.indexOf('private struct AlmiWidgetState'), source.indexOf('private struct AlmiSpeechBubble'));
  const samples = [];
  for (const hour of [0, 23, 24, 29, 30, 47, 48, 54, 72, 174, 365 * 24, 365 * 24 + 6]) {
    const snapshot = { lastOpenedAt: anchor };
    const now = anchor + hour * HOUR;
    samples.push({ ...snapshot, now, expected: resolve(snapshot, now).scene });
  }
  for (const scene of ['empty_treasury', 'spending_fire', 'savings_guard']) {
    for (const hour of [0, 3.999, 4, 5.999, 6, 24, 30]) {
      const snapshot = { eventScene: scene, eventAt: anchor, financialUpdatedAt: anchor, lastOpenedAt: anchor };
      const now = anchor + hour * HOUR;
      samples.push({ ...snapshot, now, expected: resolve(snapshot, now).scene });
    }
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almi-native-guard-'));
  try {
    fs.writeFileSync(path.join(dir, 'samples.json'), JSON.stringify(samples));
    const script = `import Foundation
private let keyHasData = "widget_has_data"
${native}
let samples = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))) as! [[String: Any]]
let suite = "almi.widget.test." + UUID().uuidString
let defaults = UserDefaults(suiteName: suite)!
defer { defaults.removePersistentDomain(forName: suite) }
for sample in samples {
  defaults.set(true, forKey: keyHasData)
  defaults.set(sample["lastOpenedAt"], forKey: "widget_almi_last_opened")
  var context = sample
  context["version"] = 1
  context["copy"] = ["neglected": "hello", "neglected_long": "hello", "empty_treasury": "hello", "spending_fire": "hello", "savings_guard": "hello", "open": "open"]
  let data = try JSONSerialization.data(withJSONObject: context)
  defaults.set(String(data: data, encoding: .utf8)!, forKey: "widget_almi_context")
  let now = (sample["now"] as! NSNumber).doubleValue
  let actual = almiWidgetState(defaults, at: Date(timeIntervalSince1970: now / 1000))
  precondition(actual.scene == sample["expected"] as! String, "Native deadline mismatch")
}
print("native deadline parity passed")
`;
    const scriptPath = path.join(dir, 'guard.swift');
    fs.writeFileSync(scriptPath, script);
    const output = execFileSync('swift', ['-module-cache-path', path.join(dir, 'cache'), scriptPath, path.join(dir, 'samples.json')], { encoding: 'utf8', timeout: 60000 });
    assert.match(output, /native deadline parity passed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
