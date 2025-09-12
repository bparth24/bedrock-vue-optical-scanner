module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  extends: [
    'plugin:quasar/standard',
    'digitalbazaar',
    'digitalbazaar/module',
    'digitalbazaar/vue3'
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.cache/'
  ],
  rules: {
    'linebreak-style': [
      'error',
      (process.platform === 'win32' ? 'windows' : 'unix')
    ],
    'unicorn/prefer-node-protocol': 'error'
  }
};
