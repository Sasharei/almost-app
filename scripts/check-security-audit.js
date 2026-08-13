#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const allowedAdvisories = new Set([
  'https://github.com/advisories/GHSA-5p2g-fcmc-qvqq',
  'https://github.com/advisories/GHSA-w3rx-r6r6-pgpr',
]);

const audit = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  cwd: projectRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

if (audit.error) {
  throw audit.error;
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch (error) {
  throw new Error(`Could not parse npm audit output: ${error.message}`);
}

const reportedAdvisories = new Set();
for (const vulnerability of Object.values(report.vulnerabilities || {})) {
  for (const via of vulnerability.via || []) {
    if (via && typeof via === 'object' && via.url) {
      reportedAdvisories.add(via.url);
    }
  }
}

const unexpectedAdvisories = [...reportedAdvisories].filter(
  (url) => !allowedAdvisories.has(url),
);
const missingAdvisories = [...allowedAdvisories].filter(
  (url) => !reportedAdvisories.has(url),
);

if (unexpectedAdvisories.length > 0) {
  throw new Error(
    `Unmitigated npm audit advisories: ${unexpectedAdvisories.join(', ')}`,
  );
}

const severity = report.metadata?.vulnerabilities || {};
if ((severity.critical || 0) > 0 || (severity.moderate || 0) > 0 || (severity.low || 0) > 0) {
  throw new Error(`Unexpected npm audit severity counts: ${JSON.stringify(severity)}`);
}

const imageSizePackage = require(path.join(
  projectRoot,
  'node_modules/image-size/package.json',
));
if (imageSizePackage.version !== '2.0.2') {
  throw new Error(`Expected image-size 2.0.2, found ${imageSizePackage.version}`);
}

const metroAssetsPath = path.join(projectRoot, 'node_modules/metro/src/Assets.js');
const metroAssetsSource = fs.readFileSync(metroAssetsPath, 'utf8');
for (const parser of ['heif', 'icns', 'jxl', 'jxl-stream']) {
  if (!metroAssetsSource.includes(`"${parser}"`)) {
    throw new Error(`Metro security patch does not disable the ${parser} parser`);
  }
}
if (!metroAssetsSource.includes('_fs.default.readFileSync(assetInfo.files[0])')) {
  throw new Error('Metro image-size 2.x compatibility patch is missing');
}

require(metroAssetsPath);
const imageSize = require('image-size').default;
const icnsProbe = Buffer.alloc(16);
icnsProbe.write('icns', 0, 'ascii');
icnsProbe.writeUInt32BE(16, 4);
try {
  imageSize(icnsProbe);
  throw new Error('The vulnerable ICNS parser is still enabled');
} catch (error) {
  if (!String(error.message).includes('disabled file type: icns')) {
    throw error;
  }
}

if (missingAdvisories.length > 0 && reportedAdvisories.size > 0) {
  throw new Error(
    `Security allowlist is stale; no longer reported: ${missingAdvisories.join(', ')}`,
  );
}

const rawCount = severity.total || 0;
console.log(
  `[OK] Dependency security gate passed (0 unmitigated; ${rawCount} transitive audit paths are limited to disabled image-size parsers).`,
);
