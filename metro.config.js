const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  crypto: require.resolve('crypto-browserify'),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  events: require.resolve('events'),
  constants: require.resolve('constants-browserify'),
  vm: require.resolve('vm-browserify'),
  process: require.resolve('process/browser'),
};

module.exports = config;
