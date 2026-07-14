const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const contractPath = path.join(__dirname, "ui-functional-contracts.json");

const fail = (message) => {
  console.error(`[FAIL] ${message}`);
  process.exitCode = 1;
};

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(contractPath, "utf8"));
} catch (error) {
  fail(`Unable to read functional contract manifest: ${error.message}`);
  process.exit();
}

if (!Array.isArray(manifest.contracts) || manifest.contracts.length === 0) {
  fail("Functional contract manifest has no contracts.");
  process.exit();
}

let checkedContracts = 0;
let checkedFragments = 0;
let checkedPatterns = 0;

manifest.contracts.forEach((contract) => {
  const relativeFile = String(contract?.file || "").trim();
  const contractId = String(contract?.id || "unnamed-contract");
  const fragments = Array.isArray(contract?.requiredFragments)
    ? contract.requiredFragments.filter((fragment) => typeof fragment === "string" && fragment.length)
    : [];
  const patterns = Array.isArray(contract?.requiredPatterns)
    ? contract.requiredPatterns.filter((pattern) => typeof pattern === "string" && pattern.length)
    : [];

  if (!relativeFile || (fragments.length === 0 && patterns.length === 0)) {
    fail(`${contractId} must declare a file and at least one required fragment or pattern.`);
    return;
  }

  const absoluteFile = path.resolve(rootDir, relativeFile);
  if (!absoluteFile.startsWith(`${rootDir}${path.sep}`) || !fs.existsSync(absoluteFile)) {
    fail(`${contractId} references a missing or out-of-repo file: ${relativeFile}`);
    return;
  }

  const source = fs.readFileSync(absoluteFile, "utf8");
  checkedContracts += 1;
  fragments.forEach((fragment) => {
    checkedFragments += 1;
    if (!source.includes(fragment)) {
      fail(`${contractId} lost required behavior wiring in ${relativeFile}: ${JSON.stringify(fragment)}`);
    }
  });
  patterns.forEach((pattern) => {
    checkedPatterns += 1;
    let expression;
    try {
      expression = new RegExp(pattern, "s");
    } catch (error) {
      fail(`${contractId} contains an invalid required pattern: ${error.message}`);
      return;
    }
    if (!expression.test(source)) {
      fail(`${contractId} lost required reachable UI structure in ${relativeFile}: ${JSON.stringify(pattern)}`);
    }
  });
});

if (!process.exitCode) {
  console.log(
    `[OK] Functional parity contracts passed (${checkedContracts} contracts, ${checkedFragments} behavior fragments, ${checkedPatterns} reachability patterns).`
  );
}
