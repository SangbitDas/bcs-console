const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Exclude native build artifacts, Gradle caches, and release folders from Metro's file crawler
const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

config.resolver.blockList = [
  ...existingBlockList,
  /[/\\]apps[/\\]web[/\\]android[/\\]/,
  /[/\\]apps[/\\]web[/\\]ios[/\\]/,
  /[/\\]release[/\\]/,
  /\.apk$/,
];

module.exports = withNativeWind(config, { input: './src/global.css' });

