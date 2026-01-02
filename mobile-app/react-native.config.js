const path = require('path');

module.exports = {
  root: __dirname,
  reactNativePath: path.dirname(require.resolve('react-native/package.json')),
  project: {
    android: {
      sourceDir: './android',
    },
  },
};
