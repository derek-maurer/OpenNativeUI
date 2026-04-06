const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Workspace monorepo support: tell Metro to watch the workspace root so
// it picks up changes in @opennative/shared, and to resolve modules from
// both the mobile package and the hoisted workspace root. We leave
// hierarchical lookup enabled so nested node_modules (e.g. the
// @react-native/virtualized-lists that npm keeps nested under
// react-native/node_modules/) still resolve correctly.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = withNativeWind(config, {
  input: "./global.css",
});
