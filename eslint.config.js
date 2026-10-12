const expoConfig = require("eslint-config-expo/flat");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    ignores: [
      "backend/node_modules/**",
      "ios/**",
      "android/**",
      "**/*.xcarchive/**",
      "patches/**",
      "vendor/security/**",
      "src/constants/languageMapFallback.generated.js",
      "src/constants/translations.generated.js",
    ],
  },
  ...expoConfig,
  {
    // Maestro injects these globals into runScript files.
    files: ["qa/immunity-runtime-2026-10-10/seed.js"],
    languageOptions: {
      globals: {
        http: "readonly",
        LANG: "readonly",
        THEME: "readonly",
        ACCENT: "readonly",
        json: "readonly",
        output: "readonly",
      },
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    files: ["backend/**/*.js"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
      },
    },
  },
  {
    files: ["*.config.js", "scripts/**/*.js"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        console: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
      sourceType: "commonjs",
    },
  },
  {
    files: ["src/analytics/*Policy.js", "src/analytics/releaseScope.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
      },
      sourceType: "commonjs",
    },
  },
]);
