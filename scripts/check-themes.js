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
const PRO_THEME_PALETTE_TOKENS = [
  "background",
  "card",
  "text",
  "muted",
  "border",
  "surface",
  "surfaceMuted",
  "surfaceElevated",
  "separator",
  "disabled",
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

function blendParsedColors(left, right, ratio) {
  const mix = Math.max(0, Math.min(1, Number(ratio) || 0));
  return {
    r: left.r * (1 - mix) + right.r * mix,
    g: left.g * (1 - mix) + right.g * mix,
    b: left.b * (1 - mix) + right.b * mix,
  };
}

function colorChannelSpread(color) {
  return Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b);
}

function colorDistance(left, right) {
  return Math.sqrt(
    (left.r - right.r) ** 2 +
      (left.g - right.g) ** 2 +
      (left.b - right.b) ** 2
  );
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
  const moodGradients = readExportedConst("MOOD_GRADIENTS");
  const moodGradientOverlayOpacity = readExportedConst("MOOD_GRADIENT_OVERLAY_OPACITY");
  const moodGradientThemeMix = readExportedConst("MOOD_GRADIENT_THEME_MIX");
  const darkMoodMix = moodGradientThemeMix?.dark || {};
  const proMoodMix = moodGradientThemeMix?.pro || {};
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
  const accentColors = new Set();
  const paletteSignatures = new Set();
  const proTheme = themes[proThemeId];
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
    } else {
      const normalizedAccent = option.accent.toUpperCase();
      if (accentColors.has(normalizedAccent)) {
        errors.push(`Duplicate PRO theme accent color: ${option.accent}.`);
      }
      accentColors.add(normalizedAccent);
    }
    if (!onAccentColor) {
      errors.push(`PRO_THEME_ACCENT_OPTIONS.${option.id}.onAccent must be a #RGB or #RRGGBB color.`);
    }
    if (!option.palette || typeof option.palette !== "object" || Array.isArray(option.palette)) {
      errors.push(`PRO_THEME_ACCENT_OPTIONS.${option.id}.palette must define a complete PRO palette.`);
      continue;
    }

    for (const token of PRO_THEME_PALETTE_TOKENS) {
      if (!parseHexColor(option.palette[token])) {
        errors.push(
          `PRO_THEME_ACCENT_OPTIONS.${option.id}.palette.${token} must be a #RGB or #RRGGBB color.`
        );
      }
    }

    const paletteSignature = PRO_THEME_PALETTE_TOKENS.map(
      (token) => String(option.palette[token] || "").toUpperCase()
    ).join("|");
    if (paletteSignatures.has(paletteSignature)) {
      errors.push(`PRO theme ${option.id} duplicates another complete palette.`);
    }
    paletteSignatures.add(paletteSignature);

    if (accentColor && onAccentColor) {
      const resolvedTheme = {
        ...proTheme,
        ...option.palette,
        primary: option.accent,
        onPrimary: option.onAccent,
      };
      const resolvedColors = {};
      for (const token of REQUIRED_THEME_TOKENS) {
        const parsed = parseHexColor(resolvedTheme[token]);
        if (!parsed) {
          errors.push(`Resolved PRO ${option.id}.${token} must be a #RGB or #RRGGBB color.`);
          continue;
        }
        resolvedColors[token] = parsed;
      }

      requireContrast(
        errors,
        `PRO_THEME_ACCENT_OPTIONS.${option.id} onAccent on accent`,
        onAccentColor,
        accentColor,
        MIN_TEXT_CONTRAST
      );
      if (Object.keys(resolvedColors).length !== REQUIRED_THEME_TOKENS.length) continue;

      ["background", "card", "surface", "surfaceMuted", "surfaceElevated"].forEach(
        (surfaceToken) => {
          requireContrast(
            errors,
            `PRO ${option.id} text on ${surfaceToken}`,
            resolvedColors.text,
            resolvedColors[surfaceToken],
            MIN_TEXT_CONTRAST
          );
          requireContrast(
            errors,
            `PRO ${option.id} muted on ${surfaceToken}`,
            resolvedColors.muted,
            resolvedColors[surfaceToken],
            MIN_TEXT_CONTRAST
          );
        }
      );
      ["background", "card", "primarySurface"].forEach((surfaceToken) => {
        requireContrast(
          errors,
          `PRO ${option.id} primary on ${surfaceToken}`,
          resolvedColors.primary,
          resolvedColors[surfaceToken],
          MIN_UI_CONTRAST
        );
      });
      ["success", "warning", "error", "info"].forEach((token) => {
        requireContrast(
          errors,
          `PRO ${option.id} ${token} on background`,
          resolvedColors[token],
          resolvedColors.background,
          MIN_UI_CONTRAST
        );
      });
    }
  }

  const requiredMoodIds = ["neutral", "focused", "impulsive", "doubter", "tired", "dreamer"];
  const mixValuePaths = [
    ["dark", "startAccentMix"],
    ["dark", "endAccentMix"],
    ["dark", "accentTextMix"],
    ["pro", "startMoodMix"],
    ["pro", "endMoodMix"],
    ["pro", "accentPrimaryMix"],
  ];
  if (
    typeof moodGradientOverlayOpacity !== "number" ||
    moodGradientOverlayOpacity <= 0 ||
    moodGradientOverlayOpacity >= 1
  ) {
    errors.push("MOOD_GRADIENT_OVERLAY_OPACITY must be between 0 and 1.");
  }
  for (const [themeId, token] of mixValuePaths) {
    const value = moodGradientThemeMix?.[themeId]?.[token];
    if (typeof value !== "number" || value <= 0 || value >= 1) {
      errors.push(`MOOD_GRADIENT_THEME_MIX.${themeId}.${token} must be between 0 and 1.`);
    }
  }

  const darkThemeColors = {
    background: parseHexColor(themes.dark?.background),
    surface: parseHexColor(themes.dark?.surface),
    text: parseHexColor(themes.dark?.text),
  };
  for (const moodId of requiredMoodIds) {
    const mood = moodGradients?.[moodId];
    if (!mood) {
      errors.push(`MOOD_GRADIENTS.${moodId} is missing.`);
      continue;
    }
    const start = parseHexColor(mood.start);
    const end = parseHexColor(mood.end);
    const accent = parseHexColor(mood.accent);
    if (!start || !end || !accent) {
      errors.push(`MOOD_GRADIENTS.${moodId} must define start, end, and accent hex colors.`);
      continue;
    }

    const lightComposite = blendParsedColors(start, end, moodGradientOverlayOpacity);
    requireContrast(
      errors,
      `Light ${moodId} mood header text`,
      parseHexColor(themes.light.text),
      lightComposite,
      MIN_TEXT_CONTRAST
    );

    if (darkThemeColors.background && darkThemeColors.surface && darkThemeColors.text) {
      const darkStart = blendParsedColors(
        darkThemeColors.surface,
        accent,
        darkMoodMix.startAccentMix
      );
      const darkEnd = blendParsedColors(
        darkThemeColors.background,
        accent,
        darkMoodMix.endAccentMix
      );
      const darkComposite = blendParsedColors(
        darkStart,
        darkEnd,
        moodGradientOverlayOpacity
      );
      requireContrast(
        errors,
        `Dark ${moodId} mood header text`,
        darkThemeColors.text,
        darkComposite,
        MIN_TEXT_CONTRAST
      );
      if (colorChannelSpread(darkComposite) < 0.08) {
        errors.push(`Dark ${moodId} mood header is too close to grayscale.`);
      }
      if (colorDistance(darkComposite, darkThemeColors.background) < 0.22) {
        errors.push(`Dark ${moodId} mood header loses its contextual color against the canvas.`);
      }
    }

    for (const option of accentOptions) {
      const resolvedProTheme = {
        ...themes[proThemeId],
        ...(option.palette || {}),
        primary: option.accent,
        onPrimary: option.onAccent,
      };
      const proBackground = parseHexColor(resolvedProTheme.background);
      const proSurfaceMuted = parseHexColor(resolvedProTheme.surfaceMuted);
      const proText = parseHexColor(resolvedProTheme.text);
      if (!proBackground || !proSurfaceMuted || !proText) continue;
      const proStart = blendParsedColors(
        proBackground,
        start,
        proMoodMix.startMoodMix
      );
      const proEnd = blendParsedColors(
        proSurfaceMuted,
        end,
        proMoodMix.endMoodMix
      );
      const proComposite = blendParsedColors(proStart, proEnd, moodGradientOverlayOpacity);
      requireContrast(
        errors,
        `PRO ${option.id} ${moodId} mood header text`,
        proText,
        proComposite,
        MIN_TEXT_CONTRAST
      );
    }
  }

  requireSourceFragments(errors, "App.js", "Goal jar", [
    "const glassPalette = isDarkTheme",
    "isDarkTheme={isDarkMode}",
  ]);
  requireSourceFragments(errors, "src/components/LiquidGlassTabBar.js", "Liquid tab bar", [
    "isDarkTheme={isDarkTheme}",
    "activeColorHex={isProTheme ? proThemeAccentColor : \"\"}",
    "surfaceColorHex={isProTheme ? proThemeSurfaceColor : \"\"}",
  ]);
  requireSourceFragments(errors, "ios/Almost/NativeLiquidTabBarManager.swift", "Native liquid tab bar", [
    "@objc var isDarkTheme: Bool",
    "@objc var activeColorHex: NSString",
    "@objc var surfaceColorHex: NSString",
    "@objc var badgeTextColorHex: NSString",
    ".systemChromeMaterialDark",
  ]);
  requireSourceFragments(errors, "ios/Almost/NativeLiquidTabBarBridge.m", "Native liquid tab bar bridge", [
    "RCT_EXPORT_VIEW_PROPERTY(activeColorHex, NSString)",
    "RCT_EXPORT_VIEW_PROPERTY(surfaceColorHex, NSString)",
    "RCT_EXPORT_VIEW_PROPERTY(badgeTextColorHex, NSString)",
  ]);
  requireSourceFragments(errors, "App.js", "Contextual mood header", [
    "start: blendColors(resolvedThemeColors.surface, palette.accent, mix.startAccentMix)",
    "end: blendColors(resolvedThemeColors.background, palette.accent, mix.endAccentMix)",
    "() => applyThemeToMoodGradient(getMoodGradient(moodPreset?.id), theme, colors)",
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
