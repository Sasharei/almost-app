const expoConfig = require("eslint-config-expo/flat");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    ignores: [
      "backend/node_modules/**",
      "ios/**",
      "android/**",
      "patches/**",
      "src/constants/languageMapFallback.generated.js",
      "src/constants/translations.generated.js",
    ],
  },
  ...expoConfig,
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
]);
