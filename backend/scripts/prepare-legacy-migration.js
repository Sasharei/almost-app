#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { inspectLegacySnapshot, importLegacySnapshot } from "../src/store/legacyMigration.js";

// Offline preparation only. Never opens the live database or changes service settings.
export const prepareLegacyMigration = ({ source, outputDir, resolutionFile = null }) => {
  const sourcePath = path.resolve(source);
  const target = path.resolve(outputDir);
  const bytes = fs.readFileSync(sourcePath);
  const data = JSON.parse(bytes.toString("utf8"));
  const sourceSHA256 = crypto.createHash("sha256").update(bytes).digest("hex");
  let ownershipResolutions = new Map();
  if (resolutionFile) {
    // Offline operator evidence, never accepted from a mobile/API caller.
    const resolution = JSON.parse(fs.readFileSync(resolutionFile, "utf8"));
    const age = Date.now() - Date.parse(resolution.verifiedAt);
    if (resolution.schemaVersion !== 1 || resolution.sourceSHA256 !== sourceSHA256 ||
        resolution.projectId !== "5ae2cbbc" || resolution.source !== "revenuecat-read-only-api" ||
        !Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000 || !Array.isArray(resolution.owners)) {
      throw new Error("migration_invalid_resolution_evidence");
    }
    for (const row of resolution.owners) {
      if (typeof row.reference !== "string" || !row.reference.trim() || typeof row.owner !== "string" || !row.owner.trim() || ownershipResolutions.has(row.reference)) {
        throw new Error("migration_invalid_resolution_evidence");
      }
      ownershipResolutions.set(row.reference, row.owner);
    }
  }
  const inspected = inspectLegacySnapshot(data, ownershipResolutions);
  fs.mkdirSync(target, { mode: 0o700 }); // Refuse every existing directory, including symlinks.
  fs.writeFileSync(path.join(target, "legacy-backup.json"), bytes, { mode: 0o600, flag: "wx" });
  if (resolutionFile) fs.copyFileSync(resolutionFile, path.join(target, "ownership-resolution.json"), fs.constants.COPYFILE_EXCL);
  if (resolutionFile) fs.chmodSync(path.join(target, "ownership-resolution.json"), 0o600);
  const databasePath = path.join(target, "candidate.sqlite");
  fs.closeSync(fs.openSync(databasePath, "wx", 0o600));
  const db = new DatabaseSync(databasePath);
  try {
    db.exec(`PRAGMA synchronous=FULL;
      CREATE TABLE identities (id TEXT PRIMARY KEY, secret_hash TEXT NOT NULL);
      CREATE TABLE transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, seen_at INTEGER NOT NULL);
      CREATE TABLE entitlements (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE metadata (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      BEGIN IMMEDIATE;`);
    importLegacySnapshot(db, data, ownershipResolutions);
    for (const [key, value] of inspected.entitlements) {
      if (db.prepare("SELECT payload FROM entitlements WHERE id=?").get(key)?.payload !== JSON.stringify(value)) throw new Error("migration_entitlement_verification_failed");
    }
    for (const [key, hash] of inspected.identities) {
      if (db.prepare("SELECT secret_hash FROM identities WHERE id=?").get(key)?.secret_hash !== hash) throw new Error("migration_identity_verification_failed");
    }
    for (const [key, value] of inspected.transactions) {
      const row = db.prepare("SELECT user_id, seen_at FROM transactions WHERE id=?").get(key);
      if (row?.user_id !== value.appUserId || row?.seen_at !== value.seenAt) throw new Error("migration_transaction_verification_failed");
    }
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") throw new Error("migration_integrity_check_failed");
    db.prepare("INSERT INTO metadata VALUES ('legacy_import', '1')").run();
    db.prepare("INSERT INTO metadata VALUES ('legacy_source_sha256', ?)").run(sourceSHA256);
    db.exec("COMMIT");
  } finally { db.close(); }
  const unchanged = crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex") === sourceSHA256;
  const report = { schemaVersion: 1, preparedAt: new Date().toISOString(), sourceSHA256,
    sourceUnchanged: unchanged, dataPreserved: true, ...inspected.summary,
    readyForStrictAuthCutover: unchanged && inspected.summary.readyForStrictAuthCutover,
    note: "Offline candidate only. Quiesce writers and prepare a fresh snapshot before any cutover. Unbound identities are not registered or granted access." };
  fs.writeFileSync(path.join(target, "report.json"), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  return report;
};

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const args = process.argv.slice(2);
  if ((args.length !== 4 && args.length !== 6) || (args.length === 6 && args[4] !== "--ownership-resolution") || args[0] !== "--source" || args[2] !== "--output-dir") {
    console.error("Usage: node scripts/prepare-legacy-migration.js --source <protected-snapshot.json> --output-dir <new-protected-directory> [--ownership-resolution <protected-evidence.json>]");
    process.exitCode = 1;
  } else {
    try {
      const report = prepareLegacyMigration({ source: args[1], outputDir: args[3], resolutionFile: args[5] || null });
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.readyForStrictAuthCutover ? 0 : 2;
    } catch {
      // Never print JSON parse excerpts, IDs, file contents or credentials.
      console.error("Migration preparation failed; source unchanged. Inspect inputs securely. Do not activate the candidate.");
      process.exitCode = 1;
    }
  }
}
