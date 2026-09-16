import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { prepareLegacyMigration } from "../scripts/prepare-legacy-migration.js";
import { inspectLegacySnapshot } from "../src/store/legacyMigration.js";

const fixture = () => ({ version: 1, entitlementByUser: {
  paid: { appUserId: "paid", isPremium: true, platform: "ios", transactionId: "order", originalTransactionId: "original", expiresDate: "2099-01-01T00:00:00Z" },
  free: { isPremium: false },
}, installSecretBindings: [], seenTransactions: [["order", { appUserId: "paid", seenAt: 123 }]] });

test("offline migration preserves data, blocks unbound cutover, protects files and refuses overwrite", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "almost-migration-"));
  try {
    const source = path.join(dir, "legacy.json"), outputDir = path.join(dir, "candidate");
    const bytes = JSON.stringify(fixture()); fs.writeFileSync(source, bytes);
    const report = prepareLegacyMigration({ source, outputDir });
    assert.equal(fs.readFileSync(source, "utf8"), bytes);
    assert.equal(report.dataPreserved, true);
    assert.equal(report.readyForStrictAuthCutover, false);
    assert.equal(report.unboundUsers, 2);
    const db = new DatabaseSync(path.join(outputDir, "candidate.sqlite"));
    assert.equal(db.prepare("SELECT count(*) AS n FROM identities").get().n, 0);
    assert.equal(JSON.parse(db.prepare("SELECT payload FROM entitlements WHERE id='paid'").get().payload).isPremium, true);
    assert.equal(db.prepare("SELECT user_id FROM transactions WHERE id='original'").get().user_id, "paid");
    assert.equal(db.prepare("SELECT seen_at FROM transactions WHERE id='order'").get().seen_at, 123);
    db.close();
    assert.equal(fs.statSync(outputDir).mode & 0o777, 0o700);
    for (const name of fs.readdirSync(outputDir)) assert.equal(fs.statSync(path.join(outputDir, name)).mode & 0o777, 0o600);
    assert.throws(() => prepareLegacyMigration({ source, outputDir }), /EEXIST/);
    assert.equal(fs.readFileSync(source, "utf8"), bytes);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("bound legacy credentials survive migration exactly", () => {
  const data = fixture();
  const hash = crypto.createHash("sha256").update("existing-install-secret").digest("base64url");
  data.installSecretBindings = ["paid", "free"].map(key => [key, { secretHash: hash }]);
  const result = inspectLegacySnapshot(data);
  assert.equal(result.summary.readyForStrictAuthCutover, true);
  assert.equal(result.identities.get("paid"), hash);
});

test("ambiguous ownership, malformed collections and invalid hashes abort before creating output", () => {
  const variants = [
    d => d.seenTransactions.push(["order", { appUserId: "attacker", seenAt: 123 }]),
    d => d.entitlementByUser.free.transactionId = "original",
    d => d.installSecretBindings.push(["paid", { secretHash: "not-a-hash" }]),
    d => d.seenTransactions = {},
    d => d.entitlementByUser.paid.appUserId = "attacker",
  ];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "almost-migration-reject-"));
  try {
    for (const mutate of variants) {
      const data = fixture(); mutate(data);
      const source = path.join(dir, "legacy.json"), outputDir = path.join(dir, "candidate");
      fs.writeFileSync(source, JSON.stringify(data));
      assert.throws(() => prepareLegacyMigration({ source, outputDir }), /legacy_migration_/);
      assert.equal(fs.existsSync(outputDir), false);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("early v1 snapshots without a bindings field stay unbound", () => {
  const data = fixture(); delete data.installSecretBindings;
  const result = inspectLegacySnapshot(data);
  assert.equal(result.summary.unboundUsers, 2);
  assert.equal(result.summary.readyForStrictAuthCutover, false);
});

test("operator reconciliation resolves ownership without modifying entitlements or granting identities", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "almost-reconciliation-"));
  try {
    const data = fixture(); data.entitlementByUser.free.transactionId = "original";
    const source = path.join(dir, "legacy.json"), resolutionFile = path.join(dir, "resolution.json");
    const bytes = JSON.stringify(data); fs.writeFileSync(source, bytes);
    const evidence = { schemaVersion: 1, source: "revenuecat-read-only-api", projectId: "5ae2cbbc", verifiedAt: new Date().toISOString(),
      sourceSHA256: crypto.createHash("sha256").update(bytes).digest("hex"), owners: [{ reference: "original", owner: "canonical-owner" }] };
    fs.writeFileSync(resolutionFile, JSON.stringify(evidence));
    const outputDir = path.join(dir, "candidate");
    const report = prepareLegacyMigration({ source, outputDir, resolutionFile });
    assert.equal(report.resolvedOwnershipConflicts, 1); assert.equal(report.readyForStrictAuthCutover, false);
    const db = new DatabaseSync(path.join(outputDir, "candidate.sqlite"));
    assert.equal(db.prepare("SELECT user_id FROM transactions WHERE id='original'").get().user_id, "canonical-owner");
    assert.equal(db.prepare("SELECT count(*) AS n FROM identities").get().n, 0);
    for (const [key, value] of Object.entries(data.entitlementByUser)) assert.deepEqual(JSON.parse(db.prepare("SELECT payload FROM entitlements WHERE id=?").get(key).payload), value);
    db.close();
    for (const change of [{ sourceSHA256: "different" }, { verifiedAt: "2000-01-01" }, { owners: [...evidence.owners, ...evidence.owners] }]) {
      fs.writeFileSync(resolutionFile, JSON.stringify({ ...evidence, ...change }));
      assert.throws(() => prepareLegacyMigration({ source, outputDir: path.join(dir, "rejected"), resolutionFile }), /invalid_resolution_evidence/);
      assert.equal(fs.existsSync(path.join(dir, "rejected")), false);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
