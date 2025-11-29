#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const HELP_TEXT = `Usage: node scripts/bump-version.js [major|minor|patch]\nDefaults to patch bump.`;

const bumpType = (process.argv[2] || "patch").toLowerCase();
const allowedTypes = ["major", "minor", "patch"];
if (bumpType === "--help" || bumpType === "-h") {
  console.log(HELP_TEXT);
  process.exit(0);
}
if (!allowedTypes.includes(bumpType)) {
  console.error(`Unknown bump type "${bumpType}". Expected one of ${allowedTypes.join(", ")}.`);
  console.log(HELP_TEXT);
  process.exit(1);
}

const readJson = (relativePath) => {
  const filePath = path.join(process.cwd(), relativePath);
  const contents = fs.readFileSync(filePath, "utf8");
  return { filePath, data: JSON.parse(contents) };
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
};

const bumpVersion = (version, type) => {
  const parts = version.split(".").map((value) => Number.parseInt(value, 10) || 0);
  while (parts.length < 3) {
    parts.push(0);
  }
  let [major, minor, patch] = parts;
  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
};

const { filePath: pkgPath, data: packageJson } = readJson("package.json");
const { filePath: appPath, data: appJson } = readJson("app.json");

const currentVersion = packageJson.version || appJson?.expo?.version;
if (!currentVersion) {
  console.error("Unable to determine current version from package.json or app.json");
  process.exit(1);
}

const nextVersion = bumpVersion(currentVersion, bumpType);
packageJson.version = nextVersion;
if (!appJson.expo) appJson.expo = {};
appJson.expo.version = nextVersion;

writeJson(pkgPath, packageJson);
writeJson(appPath, appJson);

console.log(`Version bumped (${bumpType}): ${currentVersion} -> ${nextVersion}`);
