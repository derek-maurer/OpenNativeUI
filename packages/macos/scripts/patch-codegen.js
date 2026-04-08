#!/usr/bin/env node
/**
 * Patches react-native-macos codegen to use a nil-safe NSMutableDictionary
 * instead of an NSDictionary literal in RCTThirdPartyComponentsProvider.
 *
 * NSDictionary literals (@{...}) crash at runtime if any value is nil
 * (NSClassFromString returns nil for unregistered classes). This patch
 * switches to NSMutableDictionary with per-entry nil guards.
 *
 * Replaces the broken patch-package approach which requires yarn.lock
 * and doesn't work with npm workspaces.
 */

const fs = require("fs");
const path = require("path");

const rnmRoot = path.resolve(__dirname, "../node_modules/react-native-macos");

// ── Patch 1: .template file ──────────────────────────────────────────────────
const templatePath = path.join(
  rnmRoot,
  "scripts/codegen/templates/RCTThirdPartyComponentsProviderMM.template",
);

const originalTemplate = `  dispatch_once(&nativeComponentsToken, ^{
    thirdPartyComponents = @{
{thirdPartyComponentsMapping}
    };
  });`;

const patchedTemplate = `  dispatch_once(&nativeComponentsToken, ^{
    NSMutableDictionary<NSString *, Class<RCTComponentViewProtocol>> *components = [NSMutableDictionary new];
{thirdPartyComponentsMapping}
    thirdPartyComponents = [components copy];
  });`;

// ── Patch 2: generator JS file ───────────────────────────────────────────────
const generatorPath = path.join(
  rnmRoot,
  "scripts/codegen/generate-artifacts-executor/generateRCTThirdPartyComponents.js",
);

const originalGenerator = `        return \`\\t\\t@"\${componentName}": NSClassFromString(@"\${className}"), // \${library}\`;`;
const patchedGenerator = `        return \`\\t\\t{ Class _cls = NSClassFromString(@"\${className}"); if (_cls) { components[@"\${componentName}"] = _cls; } } // \${library}\`;`;

function applyPatch(filePath, original, patched, label) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[patch-codegen] SKIP ${label} — file not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes(patched)) {
    console.log(`[patch-codegen] OK   ${label} — already patched`);
    return;
  }
  if (!content.includes(original)) {
    console.warn(`[patch-codegen] WARN ${label} — original text not found, skipping`);
    return;
  }
  fs.writeFileSync(filePath, content.replace(original, patched), "utf8");
  console.log(`[patch-codegen] DONE ${label}`);
}

applyPatch(templatePath, originalTemplate, patchedTemplate, "RCTThirdPartyComponentsProviderMM.template");
applyPatch(generatorPath, originalGenerator, patchedGenerator, "generateRCTThirdPartyComponents.js");
