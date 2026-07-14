#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const ROOT_DIR = path.resolve(__dirname, "..");
const REQUIRED_THEME_TOKENS = [
  "background",
  "card",
  "text",
  "muted",
  "border",
  "primary",
  "onPrimary",
  "surface",
  "surfaceMuted",
  "surfaceElevated",
  "separator",
  "disabled",
  "success",
  "warning",
  "error",
  "info",
  "primarySurface",
  "primarySurfaceStrong",
  "primaryBorder",
  "overlay",
  "shadow",
];
const MIN_TEXT_CONTRAST = 4.5;
const MIN_UI_CONTRAST = 3;

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

function requireSourceFragments(errors, relativePath, label, fragments) {
  const source = fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      errors.push(`${label} is missing theme-aware source fragment: ${fragment}`);
    }
  }
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

function mixColors(left, right, ratio) {
  const amount = Math.max(0, Math.min(1, Number(ratio) || 0));
  return {
    r: left.r * (1 - amount) + right.r * amount,
    g: left.g * (1 - amount) + right.g * amount,
    b: left.b * (1 - amount) + right.b * amount,
  };
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
    if (theme.appearance !== "light" && theme.appearance !== "dark") {
      errors.push(`THEMES.${themeId}.appearance must be light or dark.`);
    }
    requireContrast(errors, `${themeId} text on background`, colors.text, colors.background, MIN_TEXT_CONTRAST);
    requireContrast(errors, `${themeId} text on card`, colors.text, colors.card, MIN_TEXT_CONTRAST);
    requireContrast(errors, `${themeId} muted on background`, colors.muted, colors.background, MIN_TEXT_CONTRAST);
    requireContrast(errors, `${themeId} muted on card`, colors.muted, colors.card, MIN_TEXT_CONTRAST);
    requireContrast(errors, `${themeId} primary on background`, colors.primary, colors.background, MIN_UI_CONTRAST);
    requireContrast(errors, `${themeId} onPrimary on primary`, colors.onPrimary, colors.primary, MIN_TEXT_CONTRAST);
    ["success", "warning", "error", "info"].forEach((token) => {
      requireContrast(
        errors,
        `${themeId} ${token} on background`,
        colors[token],
        colors.background,
        MIN_UI_CONTRAST
      );
    });
  }

  if (!themeIds.includes(proThemeId)) {
    errors.push(`THEME_IDS must include PRO_THEME_ID (${proThemeId}).`);
  }

  const accentIds = new Set();
  const proTheme = themes[proThemeId];
  const proBackground = parseHexColor(proTheme?.background);
  const proCard = parseHexColor(proTheme?.card);
  const proText = parseHexColor(proTheme?.text);
  const proMuted = parseHexColor(proTheme?.muted);
  for (const option of accentOptions) {
    if (!option.id) {
      errors.push("A PRO theme accent option is missing id.");
      continue;
    }
    if (accentIds.has(option.id)) {
      errors.push(`Duplicate PRO theme accent id: ${option.id}.`);
    }
    accentIds.add(option.id);
    const accentColor = parseHexColor(option.accent);
    const onAccentColor = parseHexColor(option.onAccent);
    if (!accentColor) {
      errors.push(`PRO_THEME_ACCENT_OPTIONS.${option.id}.accent must be a #RGB or #RRGGBB color.`);
    }
    if (!onAccentColor) {
      errors.push(`PRO_THEME_ACCENT_OPTIONS.${option.id}.onAccent must be a #RGB or #RRGGBB color.`);
    }
    if (accentColor && onAccentColor) {
      requireContrast(
        errors,
        `PRO_THEME_ACCENT_OPTIONS.${option.id} onAccent on accent`,
        onAccentColor,
        accentColor,
        MIN_TEXT_CONTRAST
      );
      if (proBackground && proCard && proText && proMuted) {
        const resolvedBackground = mixColors(proBackground, accentColor, 0.04);
        const resolvedText = mixColors(proText, accentColor, 0.025);
        const resolvedMuted = mixColors(proMuted, accentColor, 0.06);
        requireContrast(
          errors,
          `PRO ${option.id} text on background`,
          resolvedText,
          resolvedBackground,
          MIN_TEXT_CONTRAST
        );
        requireContrast(
          errors,
          `PRO ${option.id} text on card`,
          resolvedText,
          proCard,
          MIN_TEXT_CONTRAST
        );
        requireContrast(
          errors,
          `PRO ${option.id} muted on background`,
          resolvedMuted,
          resolvedBackground,
          MIN_TEXT_CONTRAST
        );
        requireContrast(
          errors,
          `PRO ${option.id} accent on background`,
          accentColor,
          resolvedBackground,
          MIN_UI_CONTRAST
        );
      }
    }
  }

  requireSourceFragments(errors, "App.js", "Goal jar", [
    "const glassPalette = isDarkTheme",
    "isDarkTheme={isDarkMode}",
  ]);
  requireSourceFragments(errors, "src/components/LiquidGlassTabBar.js", "Liquid tab bar", [
    "isDarkTheme={isDarkTheme}",
  ]);
  requireSourceFragments(errors, "ios/Almost/NativeLiquidTabBarManager.swift", "Native liquid tab bar", [
    "@objc var isDarkTheme: Bool",
    ".systemChromeMaterialDark",
  ]);

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
