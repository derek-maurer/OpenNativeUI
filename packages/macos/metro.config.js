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
    resolveRequest: (context, moduleName, platform) => {
      // Resolve @/ path alias → src/
      if (moduleName.startsWith("@/")) {
        return context.resolveRequest(
          context,
          path.resolve(projectRoot, "src", moduleName.slice(2)),
          platform,
        );
      }
      // Redirect react-native → react-native-macos.
      // extraNodeModules won't work here because react-native exists at the
      // workspace root and takes priority. resolveRequest intercepts first.
      const rnMacosRoot = path.resolve(projectRoot, "node_modules/react-native-macos");
      if (moduleName === "react-native") {
        return context.resolveRequest(context, rnMacosRoot, platform);
      }
      if (moduleName.startsWith("react-native/")) {
        return context.resolveRequest(
          context,
          path.join(rnMacosRoot, moduleName.slice("react-native/".length)),
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

const merged = mergeConfig(getDefaultConfig(projectRoot), config);

module.exports = withNativeWind(merged, {
  input: "./global.css",
});
