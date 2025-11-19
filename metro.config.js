const os = require("os");
const path = require("path");
const exclusionList = require("metro-config/private/defaults/exclusionList").default;
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname)];
const projectRoot = path.resolve(__dirname);
const escapeForRegex = (value) =>
  value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/[/\\]/g, "[/\\\\]");
const blockFolders = [
  ["android", "build"],
  ["android", "app", "build"],
  ["android", ".gradle"],
  ["android", "gradle"],
  ["ios", "build"],
  ["ios", "DerivedData"],
  ["dist"],
  ["build"],
  [".git"],
  [".expo"],
  [".idea"],
];
const extraBlockPatterns = blockFolders.map((segments) => {
  const fullPath = path.join(projectRoot, ...segments);
  return new RegExp(`${escapeForRegex(fullPath)}[/\\\\].*`);
});

config.resolver = {
  ...config.resolver,
  disableHierarchicalLookup: false,
  blockList: exclusionList([
    ...(Array.isArray(config.resolver?.blockList)
      ? config.resolver.blockList
      : config.resolver?.blockList
      ? [config.resolver.blockList]
      : []),
    ...extraBlockPatterns,
  ]),
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
