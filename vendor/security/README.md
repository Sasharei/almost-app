# Maintained security forks

These are explicitly named local forks, not upstream fixed releases. Sources and licenses are retained; installed consumers must resolve these exact forks. `source-integrity.json` pins all JS files, and `scripts/security-vendor-contract.js` executes malicious and valid regression cases before every security audit. The existing advisory allowlist and severity assertions remain unchanged.

- braces 3.0.3 → @almost-security/braces 3.0.3-almost.1: GHSA-vfj7-8cjw-p6xm has no patched upstream version. Parser nesting is bounded to 128 stack entries, including parentheses; every public recursive AST walker checks depth and cycles iteratively before recursion. Ordinary nested globs/ranges are retained. Root fill-range is explicit so npm local-link dependencies resolve on a clean install.
- node-forge 1.4.0 → @almost-security/node-forge 1.4.0-almost.1: GHSA-86w9-cpqp-85rv has no patched upstream version. RSA PKCS1 verification rejects extra DigestAlgorithm elements and parameters other than ASN.1 NULL. Valid signatures with NULL or omitted SHA256 parameters, and certificate signing/verification remain covered. Unused prebuilt distribution bundles were omitted so there is no unpatched alternative entry point.
- sprintf-js was removed from the tree by resolving js-yaml consumers to 4.3.2 (argparse 2), which removes the affected formatter dependency. YAML consumers/builds and repository gates verify compatibility.

References: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm, https://github.com/advisories/GHSA-86w9-cpqp-85rv, https://github.com/advisories/GHSA-hp3w-g68c-fv3c.

When upstream fixes become available, replace each fork after retaining the adversarial and compatibility tests; do not remove the protections merely to obtain a clean audit. Run `npm run check:security-audit` after a clean install.
