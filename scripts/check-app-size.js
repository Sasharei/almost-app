#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT_DIR, "app-size-budget.json");
const ARTIFACT_EXTENSIONS = new Set([".aab", ".apk", ".ipa"]);

function readBudget() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  const budget = JSON.parse(raw);

  for (const key of ["maxBytes", "baselineBytes", "allowedGrowthBytes"]) {
    if (!Number.isFinite(budget[key]) || budget[key] < 0) {
      throw new Error(`Invalid ${key} in ${path.relative(ROOT_DIR, CONFIG_PATH)}`);
    }
  }

  return budget;
}

function formatBytes(bytes) {
  const mb = bytes / 1000 / 1000;
  const mib = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB (${mib.toFixed(1)} MiB)`;
}

function walk(dir, artifacts) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, artifacts);
      continue;
    }

    if (!entry.isFile() || !ARTIFACT_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    const stats = fs.statSync(fullPath);
    artifacts.push({
      path: fullPath,
      size: stats.size,
      mtimeMs: stats.mtimeMs,
    });
  }
}

function artifactSearchRoots() {
  const roots = [
    path.join(ROOT_DIR, "android", "app", "build", "outputs"),
    path.join(ROOT_DIR, "ios", "build"),
  ];

  const androidAppDir = path.join(ROOT_DIR, "android", "app");
  if (fs.existsSync(androidAppDir)) {
    for (const entry of fs.readdirSync(androidAppDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith("release")) {
        roots.push(path.join(androidAppDir, entry.name));
      }
    }
  }

  return roots;
}

function findArtifacts() {
  const explicitArtifact = process.env.APP_SIZE_ARTIFACT;
  if (explicitArtifact) {
    const fullPath = path.resolve(ROOT_DIR, explicitArtifact);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`APP_SIZE_ARTIFACT does not exist: ${explicitArtifact}`);
    }

    const stats = fs.statSync(fullPath);
    return [{ path: fullPath, size: stats.size, mtimeMs: stats.mtimeMs }];
  }

  const artifacts = [];
  for (const root of artifactSearchRoots()) {
    walk(root, artifacts);
  }

  return artifacts.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function main() {
  const budget = readBudget();
  const artifacts = findArtifacts();

  if (artifacts.length === 0) {
    console.error("[FAIL] No final app artifact found.");
    console.error("  Build a release .aab, .apk, or .ipa first, then run npm run size:check.");
    console.error("  You can also set APP_SIZE_ARTIFACT=path/to/file.aab.");
    process.exit(1);
  }

  const artifact = artifacts[0];
  const relativePath = path.relative(ROOT_DIR, artifact.path);
  const growth = artifact.size - budget.baselineBytes;
  const allowedSize = budget.baselineBytes + budget.allowedGrowthBytes;

  console.log(`[OK] Latest app artifact: ${relativePath}`);
  console.log(`     size: ${formatBytes(artifact.size)}`);
  console.log(`     baseline: ${formatBytes(budget.baselineBytes)}`);
  console.log(`     max: ${formatBytes(budget.maxBytes)}`);

  if (artifact.size > budget.maxBytes) {
    console.error(`[FAIL] App artifact is over the ${formatBytes(budget.maxBytes)} budget.`);
    console.error(`       over by ${formatBytes(artifact.size - budget.maxBytes)}`);
    process.exit(1);
  }

  if (artifact.size > allowedSize) {
    console.error("[FAIL] App artifact grew more than the allowed drift from baseline.");
    console.error(`       growth: ${formatBytes(growth)}`);
    console.error(`       allowed drift: ${formatBytes(budget.allowedGrowthBytes)}`);
    console.error("       If this growth is intentional, update app-size-budget.json baselineBytes.");
    process.exit(1);
  }

  if (growth > 0) {
    console.log(`[WARN] App artifact grew by ${formatBytes(growth)} from baseline.`);
  }

  console.log("App size check passed.");
}

try {
  main();
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exit(1);
}
