// Host microbenchmark of the actual file transaction with Screen Time stubs.
// This does not measure iPhone FPS or application startup.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almost-storage-bench-'));
try {
  const sourcePath = process.argv[2] || path.join(root, 'ios/ShoppingBlockerShared/ShoppingBlockerStore.swift');
  const test = fs.readFileSync(path.join(root, 'scripts/tests/shopping-blocker.test.js'), 'utf8');
  const stubs = test.match(/const stubs = `([\s\S]*?)`;/)[1]
    .replace('struct FamilyActivitySelection: Codable {', 'struct FamilyActivitySelection: Codable, Equatable {');
  const source = fs.readFileSync(sourcePath, 'utf8')
    .replace(/^import (FamilyControls|ManagedSettings|DeviceActivity)\n/gm, '')
    .replace('FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)', 'Optional(URL(fileURLWithPath: CommandLine.arguments[1]))');
  fs.writeFileSync(path.join(dir, 'Store.swift'), source + stubs);
  fs.writeFileSync(path.join(dir, 'main.swift'), `import Foundation
import Dispatch
let directory = URL(fileURLWithPath: CommandLine.arguments[1])
let file = directory.appendingPathComponent("shopping-blocker.json")
try ShoppingBlockerStore.transaction { state in
  state.events = (0..<200).map { ShoppingSaving(id: "s\\($0)", timestamp: Double($0 + 1), amountUSD: 1) }
}
var times: [Double] = []
var writes = 0
for _ in 0..<5 {
  var elapsed: UInt64 = 0
  for _ in 0..<200 {
    let before = try FileManager.default.attributesOfItem(atPath: file.path)[.systemFileNumber] as! NSNumber
    let start = DispatchTime.now().uptimeNanoseconds
    try ShoppingBlockerStore.transaction { state in ShoppingBlockerStore.apply(&state) }
    elapsed += DispatchTime.now().uptimeNanoseconds - start
    let after = try FileManager.default.attributesOfItem(atPath: file.path)[.systemFileNumber] as! NSNumber
    if before != after { writes += 1 }
  }
  times.append(Double(elapsed) / 200 / 1_000_000)
}
let result: [String: Any] = ["runs": 5, "transactionsPerRun": 200, "events": 200,
  "meanMsPerRun": times, "medianRunMeanMs": times.sorted()[2], "atomicReplacements": writes]
print(String(data: try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys]), encoding: .utf8)!)
`);
  const binary = path.join(dir, 'benchmark');
  execFileSync('xcrun', ['swiftc', '-O', path.join(root, 'ios/ShoppingBlockerShared/ShoppingSavings.swift'), path.join(dir, 'Store.swift'), path.join(dir, 'main.swift'), '-o', binary]);
  process.stdout.write(execFileSync(binary, [dir], { encoding: 'utf8' }));
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
