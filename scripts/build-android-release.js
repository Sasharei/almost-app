#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repositoryRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(repositoryRoot, "android");
const bundlePath = path.join(
  androidRoot,
  "app",
  "build",
  "outputs",
  "bundle",
  "release",
  "app-release.aab"
);
const provenancePath = bundlePath.replace(/\.aab$/, ".provenance.json");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repositoryRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    env: options.env || process.env,
  });
  if (result.status !== 0) {
    if (options.capture && result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status || 1);
  }
  return options.capture ? String(result.stdout || "").trim() : "";
};

const git = (...args) => run("git", args, { capture: true });
const dirtyFiles = git("status", "--porcelain", "--untracked-files=all");
if (dirtyFiles) {
  console.error("Refusing to create a release bundle from a dirty worktree:");
  console.error(dirtyFiles);
  process.exit(2);
}

const commit = git("rev-parse", "HEAD");
const tree = git("rev-parse", "HEAD^{tree}");
const branch = git("branch", "--show-current") || null;
const commitTimestamp = git("show", "-s", "--format=%ct", "HEAD");
const buildEnvironment = {
  ...process.env,
  SOURCE_DATE_EPOCH: commitTimestamp,
};

// The publishable bundle is never built unless AppsFlyer/AppLovin scope, both tracking
// URLs, and the Reporting API key pass the strict release-only measurement gate.
run("npm", ["run", "release:gate"], { env: buildEnvironment });
run("./gradlew", ["app:bundleRelease", "--no-daemon"], {
  env: buildEnvironment,
  cwd: androidRoot,
});

if (!fs.existsSync(bundlePath)) {
  console.error(`Release bundle was not produced at ${bundlePath}`);
  process.exit(3);
}

const bundle = fs.readFileSync(bundlePath);
const stat = fs.statSync(bundlePath);
const provenance = {
  schemaVersion: 1,
  artifact: path.relative(repositoryRoot, bundlePath),
  sha256: crypto.createHash("sha256").update(bundle).digest("hex"),
  bytes: stat.size,
  source: {
    commit,
    tree,
    branch,
    cleanWorktree: true,
    sourceDateEpoch: Number(commitTimestamp),
  },
  build: {
    createdAt: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
  },
  ci: {
    provider: process.env.GITHUB_ACTIONS === "true" ? "github-actions" : process.env.CI ? "ci" : "local",
    runId: process.env.GITHUB_RUN_ID || null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
    workflow: process.env.GITHUB_WORKFLOW || null,
    repository: process.env.GITHUB_REPOSITORY || null,
    actor: process.env.GITHUB_ACTOR || null,
  },
};

fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`Android release bundle: ${bundlePath}`);
console.log(`SHA-256: ${provenance.sha256}`);
console.log(`Provenance: ${provenancePath}`);
