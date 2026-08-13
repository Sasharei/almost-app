const os = require("os");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  disableHierarchicalLookup: false,
  // Watchman repeatedly recrawls this native project while Gradle writes build
  // outputs, which can leave Metro with an incomplete dependency map. The
  // deterministic Node crawler is slower on a cold cache but reliable for CI
  // and release bundles.
  useWatchman: false,
};
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};
config.maxWorkers = Math.max(1, Math.floor(os.cpus().length / 2));

module.exports = config;
