// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web implementation bundles a wa-sqlite.wasm file; Metro doesn't
// treat .wasm as an asset by default, so web builds fail to resolve it. Native
// bundles never hit this import path, so this is a web-only addition.
config.resolver.assetExts.push('wasm');

module.exports = config;
