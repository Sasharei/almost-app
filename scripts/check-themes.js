#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const ROOT_DIR = path.resolve(__dirname, "..");
const REQUIRED_THEME_TOKENS = ["background", "card", "text", "muted", "border", "primary"];
const MIN_TEXT_CONTRAST = 4.5;
const MIN_MUTED_CONTRAST = 3;

function parseFile(relativePath) {
  const source = fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
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

function evaluateNode(node, scope = {}) {
  if (!node) return undefined;
  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
      return node.value;
    case "Identifier":
      if (Object.prototype.hasOwnProperty.call(scope, node.name)) {
        return scope[node.name];
      }
      throw new Error(`Unknown identifier in theme config: ${node.name}`);
    case "NullLiteral":
      return null;
    case "ArrayExpression":
      return node.elements.map((element) => evaluateNode(element, scope));
    case "ObjectExpression": {
      const value = {};
      for (const property of node.properties) {
        if (property.type === "SpreadElement") {
          throw new Error("Spread syntax is not supported in theme config.");
        }
        if (property.type !== "ObjectProperty") continue;
        const key = propertyKeyName(property.key);
        if (!key) throw new Error("Computed keys are not supported in theme config.");
        value[key] = evaluateNode(property.value, scope);
      }
      return value;
    }
    default:
      throw new Error(`Unsupported syntax in theme config: ${node.type}`);
  }
}

function readExportedConsts() {
  const ast = parseFile("src/constants/themeConfig.js");
  const scope = {};
  for (const statement of ast.program.body) {
    const declaration =
      statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (!declaration || declaration.type !== "VariableDeclaration") continue;
    for (const declarator of declaration.declarations) {
      if (declarator.id?.type === "Identifier") {
        scope[declarator.id.name] = evaluateNode(declarator.init, scope);
      }
    }
  }
  return scope;
}

function readExportedConst(exportName) {
  const exports = readExportedConsts();
  if (Object.prototype.hasOwnProperty.call(exports, exportName)) {
    return exports[exportName];
  }
  throw new Error(`Unable to find export ${exportName} in src/constants/themeConfig.js`);
}

function parseHexColor(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  const rawHex = match[1];
  const hex =
    rawHex.length === 3
      ? rawHex
          .split("")
          .map((digit) => `${digit}${digit}`)
          .join("")
      : rawHex;
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

function linearize(channel) {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

function contrast(left, right) {
  const leftLum = luminance(left);
  const rightLum = luminance(right);
  const lighter = Math.max(leftLum, rightLum);
  const darker = Math.min(leftLum, rightLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function requireContrast(errors, label, foreground, background, minimum) {
  const ratio = contrast(foreground, background);
  if (ratio < minimum) {
    errors.push(`${label} contrast is ${ratio.toFixed(2)}, expected at least ${minimum}.`);
  }
}

function main() {
  const themes = readExportedConst("THEMES");
  const themeIds = readExportedConst("THEME_IDS");
  const proThemeId = readExportedConst("PRO_THEME_ID");
  const accentOptions = readExportedConst("PRO_THEME_ACCENT_OPTIONS");
  const errors = [];

  for (const themeId of themeIds) {
    const theme = themes[themeId];
    if (!theme) {
      errors.push(`THEMES.${themeId} is missing.`);
      continue;
    }

    const colors = {};
    for (const token of REQUIRED_THEME_TOKENS) {
      const parsed = parseHexColor(theme[token]);
      if (!parsed) {
        errors.push(`THEMES.${themeId}.${token} must be a #RGB or #RRGGBB color.`);
        continue;
      }
      colors[token] = parsed;
    }

    if (Object.keys(colors).length !== REQUIRED_THEME_TOKENS.length) continue;
    requireContrast(errors, `${themeId} text on background`, colors.text, colors.background, MIN_TEXT_CONTRAST);
    requireContrast(errors, `${themeId} text on card`, colors.text, colors.card, MIN_TEXT_CONTRAST);
    requireContrast(errors, `${themeId} muted on background`, colors.muted, colors.background, MIN_MUTED_CONTRAST);
    requireContrast(errors, `${themeId} muted on card`, colors.muted, colors.card, MIN_MUTED_CONTRAST);
    requireContrast(errors, `${themeId} primary on background`, colors.primary, colors.background, MIN_MUTED_CONTRAST);
  }

  if (!themeIds.includes(proThemeId)) {
    errors.push(`THEME_IDS must include PRO_THEME_ID (${proThemeId}).`);
  }

  const accentIds = new Set();
  for (const option of accentOptions) {
    if (!option.id) {
      errors.push("A PRO theme accent option is missing id.");
      continue;
    }
    if (accentIds.has(option.id)) {
      errors.push(`Duplicate PRO theme accent id: ${option.id}.`);
    }
    accentIds.add(option.id);
    if (!parseHexColor(option.accent)) {
      errors.push(`PRO_THEME_ACCENT_OPTIONS.${option.id}.accent must be a #RGB or #RRGGBB color.`);
    }
  }

  if (errors.length > 0) {
    console.error("[FAIL] Theme check failed:");
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log(`[OK] Theme config covers ${themeIds.join(", ")} with ${accentOptions.length} PRO accent option(s).`);
}

try {
  main();
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exit(1);
}
