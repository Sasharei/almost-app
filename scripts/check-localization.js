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
const DIRECT_FALLBACK_TRANSLATION_LANGUAGES = new Set(["en", "es", "fr", "ru"]);
const FALLBACK_TRANSLATION_EXPORT = {
  file: "src/constants/languageMapFallback.generated.js",
  name: "LANGUAGE_MAP_FALLBACK_TRANSLATIONS",
};

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

function checkLanguageMapFallbackTranslations(requiredLanguages, errors) {
  const fallbackTranslations = readExportedConst(
    FALLBACK_TRANSLATION_EXPORT.file,
    FALLBACK_TRANSLATION_EXPORT.name
  );
  if (!fallbackTranslations || typeof fallbackTranslations !== "object") {
    errors.push(`${FALLBACK_TRANSLATION_EXPORT.name} is missing or invalid.`);
    return;
  }

  const requiredFallbackLanguages = [
    ...new Set([
      ...Object.keys(fallbackTranslations),
      ...requiredLanguages.filter((language) => !DIRECT_FALLBACK_TRANSLATION_LANGUAGES.has(language)),
    ]),
  ].sort();
  const referenceLanguage = fallbackTranslations.de
    ? "de"
    : requiredFallbackLanguages.find((language) => fallbackTranslations[language]);
  const referenceDictionary = referenceLanguage ? fallbackTranslations[referenceLanguage] : null;
  const referenceKeys =
    referenceDictionary && typeof referenceDictionary === "object" && !Array.isArray(referenceDictionary)
      ? Object.keys(referenceDictionary)
      : [];
  if (referenceKeys.length === 0) {
    errors.push(`${FALLBACK_TRANSLATION_EXPORT.name} has no reference fallback keys.`);
    return;
  }

  for (const language of requiredFallbackLanguages) {
    const dictionary = fallbackTranslations[language];
    if (!dictionary || typeof dictionary !== "object" || Array.isArray(dictionary)) {
      errors.push(`${FALLBACK_TRANSLATION_EXPORT.name}.${language} is missing.`);
      continue;
    }
  }

  for (const language of requiredFallbackLanguages) {
    const dictionary = fallbackTranslations[language];
    if (!dictionary || typeof dictionary !== "object" || Array.isArray(dictionary)) continue;

    for (const key of referenceKeys) {
      if (!(key in dictionary)) {
        errors.push(`${FALLBACK_TRANSLATION_EXPORT.name}.${language}["${key}"] is missing.`);
        continue;
      }
    }

    for (const key of Object.keys(dictionary)) {
      if (typeof dictionary[key] !== "string") {
        errors.push(`${FALLBACK_TRANSLATION_EXPORT.name}.${language}["${key}"] must be a string.`);
        continue;
      }

      const expectedPlaceholders = collectPlaceholders(key);
      const actualPlaceholders = collectPlaceholders(dictionary[key]);
      if (!sameSet(expectedPlaceholders, actualPlaceholders)) {
        errors.push(
          `${FALLBACK_TRANSLATION_EXPORT.name}.${language}["${key}"] placeholders differ. ` +
            `Expected [${[...expectedPlaceholders].join(", ")}], got [${[...actualPlaceholders].join(", ")}].`
        );
      }
    }
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

const UI_TEXT_PATTERN = /[A-Za-zА-Яа-яЁё\u0600-\u06FF\u4E00-\u9FFF]/;
const UI_PROP_NAMES = new Set([
  "accessibilityHint",
  "accessibilityLabel",
  "actionLabel",
  "body",
  "buttonLabel",
  "caption",
  "description",
  "emptyLabel",
  "emptyMessage",
  "error",
  "helperText",
  "hint",
  "label",
  "message",
  "placeholder",
  "subtitle",
  "text",
  "title",
]);
const UI_FUNCTION_NAMES = new Set(["alert", "prompt"]);
const UI_OBJECT_KEYS = new Set([
  "accessibilityHint",
  "accessibilityLabel",
  "body",
  "buttonLabel",
  "description",
  "emptyLabel",
  "emptyMessage",
  "error",
  "helperText",
  "hint",
  "label",
  "message",
  "placeholder",
  "subtitle",
  "text",
  "title",
]);
const UI_COMPONENT_NAMES = new Set(["Text", "AppText", "AnimatedText"]);

function collectAddedLines(diff) {
  const files = new Map();
  let currentFile = null;
  let nextNewLine = null;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice("+++ b/".length);
      if (!files.has(currentFile)) {
        files.set(currentFile, new Set());
      }
      continue;
    }
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      nextNewLine = Number(hunkMatch[1]);
      continue;
    }
    if (!currentFile || nextNewLine == null) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) {
      files.get(currentFile).add(nextNewLine);
      nextNewLine += 1;
      continue;
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    }
    if (!line.startsWith("\\")) {
      nextNewLine += 1;
    }
  }

  return files;
}

function isNodeOnAddedLine(node, addedLines) {
  if (!node?.loc) return false;
  for (let line = node.loc.start.line; line <= node.loc.end.line; line += 1) {
    if (addedLines.has(line)) return true;
  }
  return false;
}

function getTextLiteralValue(node) {
  if (!node) return "";
  if (node.type === "StringLiteral") return node.value || "";
  if (node.type === "TemplateLiteral") {
    return node.quasis.map((quasi) => quasi.value?.cooked || quasi.value?.raw || "").join("");
  }
  if (node.type === "JSXText") return node.value || "";
  return "";
}

function hasTextContent(node) {
  return UI_TEXT_PATTERN.test(getTextLiteralValue(node));
}

function jsxName(node) {
  if (!node) return "";
  if (node.type === "JSXIdentifier") return node.name || "";
  if (node.type === "JSXMemberExpression") return jsxName(node.property);
  return "";
}

function isInsideUiTextComponent(ancestors) {
  return ancestors.some((ancestor) => {
    if (ancestor?.type !== "JSXElement") return false;
    return UI_COMPONENT_NAMES.has(jsxName(ancestor.openingElement?.name));
  });
}

function isUiPropValue(node, parent) {
  if (!parent || parent.type !== "JSXAttribute") return false;
  const propName = jsxName(parent.name);
  if (!UI_PROP_NAMES.has(propName)) return false;
  return parent.value === node || parent.value?.expression === node;
}

function isUiObjectValue(parent) {
  if (!parent || parent.type !== "ObjectProperty") return false;
  return UI_OBJECT_KEYS.has(propertyKeyName(parent.key));
}

function isUiFunctionArgument(ancestors) {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index];
    if (ancestor?.type !== "CallExpression") continue;
    const callee = ancestor.callee;
    const calleeName =
      callee?.type === "Identifier"
        ? callee.name
        : callee?.type === "MemberExpression"
        ? callee.property?.name
        : "";
    if (UI_FUNCTION_NAMES.has(calleeName)) return true;
  }
  return false;
}

function isUiTextNode(node, parent, ancestors) {
  if (!hasTextContent(node)) return false;
  if (node.type === "JSXText") return true;
  if (isUiPropValue(node, parent)) return true;
  if (isInsideUiTextComponent(ancestors)) return true;
  if (isUiFunctionArgument(ancestors)) return true;
  if (isUiObjectValue(parent) && isUiFunctionArgument(ancestors)) return true;
  return false;
}

function collectChangedUiTextFiles() {
  const diff = [
    git(["diff", "--unified=0", "--", "App.js", "src"]),
    git(["diff", "--cached", "--unified=0", "--", "App.js", "src"]),
  ].join("\n");
  const addedLinesByFile = collectAddedLines(diff);
  const files = new Set();

  for (const [file, addedLines] of addedLinesByFile.entries()) {
    if (!addedLines.size || !fs.existsSync(path.join(ROOT_DIR, file))) continue;
    const ast = parseFile(file);
    let hasUiText = false;
    const visit = (node, parent = null, ancestors = []) => {
      if (!node || hasUiText) return;
      if (
        ["StringLiteral", "TemplateLiteral", "JSXText"].includes(node.type) &&
        isNodeOnAddedLine(node, addedLines) &&
        isUiTextNode(node, parent, ancestors)
      ) {
        hasUiText = true;
        return;
      }
      const nextAncestors = [...ancestors, node];
      for (const value of Object.values(node)) {
        if (!value || hasUiText) continue;
        if (Array.isArray(value)) {
          value.forEach((child) => {
            if (child && typeof child.type === "string") {
              visit(child, node, nextAncestors);
            }
          });
        } else if (value && typeof value.type === "string") {
          visit(value, node, nextAncestors);
        }
      }
    };
    visit(ast);
    if (hasUiText) {
      files.add(file);
    }
  }

  return [...files].sort();
}

function main() {
  const requiredLanguages = getRequiredLanguages();
  const errors = [];

  checkMainTranslations(requiredLanguages, errors);
  checkLocalizedExports(requiredLanguages, errors);
  checkLanguageMapFallbackTranslations(requiredLanguages, errors);

  const changedUiTextFiles = collectChangedUiTextFiles();
  if (changedUiTextFiles.length > 0) {
    console.log(`[INFO] UI text-like changes detected in: ${changedUiTextFiles.join(", ")}`);
    const localizationChanged = changedUiTextFiles.some((file) =>
      [
        "src/constants/translations.js",
        "src/constants/translations.generated.js",
        "src/constants/languageMapFallback.generated.js",
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
