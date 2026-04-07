const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

// Workspace monorepo support: watch the workspace root so changes to
// @opennative/shared trigger rebundles, and resolve modules from both
// the macos package and the hoisted workspace root. Hierarchical lookup
// stays enabled so nested node_modules (e.g. virtualized-lists nested
// under react-native/node_modules/) still resolve.
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, "node_modules"),
      path.resolve(workspaceRoot, "node_modules"),
    ],
  },
};

const merged = mergeConfig(getDefaultConfig(projectRoot), config);

module.exports = withNativeWind(merged, {
  input: "./global.css",
});
