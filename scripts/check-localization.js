#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const parser = require("@babel/parser");

const ROOT_DIR = path.resolve(__dirname, "..");
const REQUIRED_TRANSLATION_EXPORTS = [
  {
    file: "src/constants/localizedUiCopy.js",
    names: [
      "WEEKDAY_FULL_LABELS",
      "HEALTH_COIN_LABELS",
      "ZERO_HEALTH_REWARD_LABELS",
      "WEEKDAY_LABELS",
      "WEEKDAY_LABELS_MONDAY_FIRST",
      "FREQUENCY_COUNTDOWN_TOKENS",
    ],
  },
  {
    file: "src/constants/themeConfig.js",
    names: ["PRO_THEME_ACCENT_COPY"],
  },
];

function parseFile(relativePath) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  const source = fs.readFileSync(fullPath, "utf8");
  return parser.parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
}

function propertyKeyName(key) {
  if (!key) return null;
  if (key.type === "Identifier") return key.name;
  if (key.type === "StringLiteral" || key.type === "NumericLiteral") return String(key.value);
  return null;
}

function evaluateNode(node) {
  if (!node) return undefined;

  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return node.value;
    case "NullLiteral":
      return null;
    case "UnaryExpression":
      if (node.operator === "-" && node.argument.type === "NumericLiteral") {
        return -node.argument.value;
      }
      break;
    case "TemplateLiteral":
      if (node.expressions.length === 0) {
        return node.quasis.map((quasi) => quasi.value.cooked || "").join("");
      }
      break;
    case "ArrayExpression":
      return node.elements.map((element) => evaluateNode(element));
    case "ObjectExpression": {
      const value = {};
      for (const property of node.properties) {
        if (property.type === "SpreadElement") {
          throw new Error("Spread syntax is not supported in localization objects.");
        }
        if (property.type !== "ObjectProperty") continue;
        const key = propertyKeyName(property.key);
        if (!key) {
          throw new Error("Computed keys are not supported in localization objects.");
        }
        value[key] = evaluateNode(property.value);
      }
      return value;
    }
    default:
      break;
  }

  throw new Error(`Unsupported syntax in localization data: ${node.type}`);
}

function readExportedConst(relativePath, exportName) {
  const ast = parseFile(relativePath);
  for (const statement of ast.program.body) {
    const declaration =
      statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (!declaration || declaration.type !== "VariableDeclaration") continue;
    for (const declarator of declaration.declarations) {
      if (declarator.id?.type === "Identifier" && declarator.id.name === exportName) {
        return evaluateNode(declarator.init);
      }
    }
  }
  throw new Error(`Unable to find export ${exportName} in ${relativePath}`);
}

function resolveTranslationLanguage(language) {
  return language === "ar-sa" || language === "ar-ae" ? "ar" : language;
}

function getRequiredLanguages() {
  const supported = readExportedConst("src/utils/language.js", "SUPPORTED_LANGUAGES");
  return [...new Set(supported.map(resolveTranslationLanguage))];
}

function describePath(parts) {
  return parts.join(".");
}

function collectPlaceholders(value, placeholders = new Set()) {
  if (typeof value === "string") {
    const pattern = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;
    let match;
    while ((match = pattern.exec(value))) {
      placeholders.add(match[1]);
    }
    return placeholders;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectPlaceholders(entry, placeholders));
    return placeholders;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectPlaceholders(entry, placeholders));
  }

  return placeholders;
}

function sameSet(left, right) {
  if (left.size !== right.size) return false;
  for (const entry of left) {
    if (!right.has(entry)) return false;
  }
  return true;
}

function checkShape(reference, candidate, pathParts, errors) {
  if (Array.isArray(reference)) {
    if (!Array.isArray(candidate)) {
      errors.push(`${describePath(pathParts)} must be an array.`);
      return;
    }
    if (candidate.length !== reference.length) {
      errors.push(`${describePath(pathParts)} has ${candidate.length} entries, expected ${reference.length}.`);
    }
    return;
  }

  if (reference && typeof reference === "object") {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      errors.push(`${describePath(pathParts)} must be an object.`);
      return;
    }
    for (const key of Object.keys(reference)) {
      if (!(key in candidate)) {
        errors.push(`${describePath([...pathParts, key])} is missing.`);
        continue;
      }
      checkShape(reference[key], candidate[key], [...pathParts, key], errors);
    }
  }
}

function checkMainTranslations(requiredLanguages, errors) {
  const manual = readExportedConst("src/constants/translations.js", "TRANSLATIONS");
  const generated = readExportedConst("src/constants/translations.generated.js", "GENERATED_TRANSLATIONS");
  const translations = { ...manual, ...generated };
  const defaultLanguage = "en";
  const defaultDictionary = translations[defaultLanguage] || {};
  const defaultKeys = Object.keys(defaultDictionary);

  if (defaultKeys.length === 0) {
    errors.push("The English translation dictionary is empty or missing.");
    return;
  }

  for (const language of requiredLanguages) {
    const dictionary = translations[language];
    if (!dictionary || typeof dictionary !== "object") {
      errors.push(`Translation dictionary ${language} is missing.`);
      continue;
    }

    for (const key of defaultKeys) {
      if (!(key in dictionary)) {
        errors.push(`TRANSLATIONS.${language}.${key} is missing.`);
        continue;
      }

      const expectedPlaceholders = collectPlaceholders(defaultDictionary[key]);
      const actualPlaceholders = collectPlaceholders(dictionary[key]);
      if (!sameSet(expectedPlaceholders, actualPlaceholders)) {
        errors.push(
          `TRANSLATIONS.${language}.${key} placeholders differ. ` +
            `Expected [${[...expectedPlaceholders].join(", ")}], got [${[...actualPlaceholders].join(", ")}].`
        );
      }
    }
  }
}

function checkLanguageMap(name, value, requiredLanguages, errors) {
  const reference = value.en;
  if (reference === undefined) {
    errors.push(`${name}.en is missing.`);
    return;
  }

  for (const language of requiredLanguages) {
    if (!(language in value)) {
      errors.push(`${name}.${language} is missing.`);
      continue;
    }
    checkShape(reference, value[language], [name, language], errors);
  }
}

function checkLocalizedExports(requiredLanguages, errors) {
  for (const spec of REQUIRED_TRANSLATION_EXPORTS) {
    for (const exportName of spec.names) {
      const value = readExportedConst(spec.file, exportName);
      checkLanguageMap(exportName, value, requiredLanguages, errors);
    }
  }

  const accentOptions = readExportedConst("src/constants/themeConfig.js", "PRO_THEME_ACCENT_OPTIONS");
  for (const option of accentOptions) {
    checkLanguageMap(`PRO_THEME_ACCENT_OPTIONS.${option.id}.label`, option.label || {}, requiredLanguages, errors);
  }
}

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

function collectChangedUiTextFiles() {
  const diff = [git(["diff", "--unified=0", "--", "App.js", "src"]), git(["diff", "--cached", "--unified=0", "--", "App.js", "src"])].join("\n");
  const files = new Set();
  let currentFile = null;
  const stringPattern = /["'`][^"'`]*[A-Za-zА-Яа-яЁё\u0600-\u06FF\u4E00-\u9FFF][^"'`]*["'`]/;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice("+++ b/".length);
      continue;
    }
    if (!currentFile || !line.startsWith("+") || line.startsWith("+++")) continue;
    if (!stringPattern.test(line)) continue;
    if (/^\+\s*(import|export)\s/.test(line)) continue;
    files.add(currentFile);
  }

  return [...files].sort();
}

function main() {
  const requiredLanguages = getRequiredLanguages();
  const errors = [];

  checkMainTranslations(requiredLanguages, errors);
  checkLocalizedExports(requiredLanguages, errors);

  const changedUiTextFiles = collectChangedUiTextFiles();
  if (changedUiTextFiles.length > 0) {
    console.log(`[INFO] UI text-like changes detected in: ${changedUiTextFiles.join(", ")}`);
    const localizationChanged = changedUiTextFiles.some((file) =>
      [
        "src/constants/translations.js",
        "src/constants/translations.generated.js",
        "src/constants/localizedUiCopy.js",
        "src/constants/themeConfig.js",
      ].includes(file)
    );
    if (!localizationChanged) {
      errors.push("UI text-like changes were detected, but no localization dictionary/config file changed.");
    }
  }

  if (errors.length > 0) {
    console.error("[FAIL] Localization check failed:");
    errors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
    if (errors.length > 80) {
      console.error(`  ... and ${errors.length - 80} more issue(s).`);
    }
    process.exit(1);
  }

  console.log(`[OK] Localization covers ${requiredLanguages.join(", ")}.`);
}

try {
  main();
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exit(1);
}
