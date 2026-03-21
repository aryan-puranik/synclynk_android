const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for socket.io-client v4.8.x on React Native
// socket.io-client uses package.json "exports" field which Metro
// doesn't handle correctly — this disables that resolution
config.resolver.unstable_enablePackageExports = false;

// Allow .cjs files (socket.io-client ships some modules as CommonJS)
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'cjs',
];

module.exports = config;