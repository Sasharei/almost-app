const os = require("os");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname)];
config.resolver = {
  ...config.resolver,
  disableHierarchicalLookup: false,
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
