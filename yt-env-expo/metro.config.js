const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing sibling workspace code (the YT ENV RN app lives in ../rn-app).
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '..', 'rn-app')];

module.exports = config;
