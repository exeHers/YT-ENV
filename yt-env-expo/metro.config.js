const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing sibling workspace code (the YT ENV RN app lives in ../rn-app).
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '..', 'rn-app')];

// Ensure Metro can resolve React/React-Native from this Expo project’s node_modules,
// even when files are imported from ../rn-app.
config.resolver = {
  ...(config.resolver ?? {}),
  nodeModulesPaths: [
    ...(config.resolver?.nodeModulesPaths ?? []),
    path.resolve(__dirname, 'node_modules'),
  ],
  extraNodeModulesPaths: [
    ...(config.resolver?.extraNodeModulesPaths ?? []),
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '..', 'rn-app', 'node_modules'),
  ],
};

module.exports = config;
