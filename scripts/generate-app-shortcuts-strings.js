const fs = require("node:fs");
const path = require("node:path");

// Ship the reviewed phrase catalog as .strings. An empty catalog deliberately
// clears the retired bank-notification App Shortcut in every supported locale.
// Wallet import is an App Intent inside a personal Transaction automation.
const root = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "ios/Almost/AppShortcuts.xcstrings"), "utf8"));
const copy = JSON.parse(fs.readFileSync(path.join(root, "src/constants/bankExpenseCopy.js"), "utf8")
  .replace("export const BANK_EXPENSE_COPY = ", "").trim().replace(/;$/, ""));
const check = process.argv.includes("--check");
for (const language of Object.keys(copy)) {
  const lines = ["/* Generated from AppShortcuts.xcstrings; run node scripts/generate-app-shortcuts-strings.js. */"];
  for (const [key, entry] of Object.entries(catalog.strings)) {
    const value = entry.localizations?.[language]?.stringUnit?.value;
    if (typeof value !== "string" || !value.includes("${applicationName}")) {
      throw new Error(`Missing App Shortcut translation or applicationName token: ${language}/${key}`);
    }
    lines.push(`${JSON.stringify(key)} = ${JSON.stringify(value)};`);
  }
  const file = path.join(root, `ios/Almost/${language}.lproj/AppShortcuts.strings`);
  const contents = `${lines.join("\n")}\n`;
  if (check) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== contents) {
      throw new Error(`App Shortcut strings are missing or out of sync: ${language}`);
    }
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
}
console.log(Object.keys(catalog.strings).length
  ? `[OK] App Shortcut phrases cover all ${Object.keys(copy).length} languages with applicationName preserved.`
  : `[OK] Retired App Shortcut phrases are cleared in all ${Object.keys(copy).length} languages.`);
