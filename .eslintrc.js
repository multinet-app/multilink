const a11yOff = Object
  .keys(require('eslint-plugin-vuejs-accessibility').rules)
  .reduce((acc, rule) => { acc[`vuejs-accessibility/${rule}`] = 'off'; return acc; }, {});

module.exports = {
  root: true,

  env: {
    es2022: true,
  },

  extends: [
    'plugin:vue/base',
    'plugin:vue/recommended',
    'plugin:vuetify/base',
    'plugin:vuetify/recommended',
    'plugin:vue/recommended',
    '@vue/airbnb',
    '@vue/typescript',
    '@vue/typescript/recommended',
  ],

  plugins: [
    'vuetify',
  ],

  rules: {
    'no-console': ['error'],
    'no-debugger': ['error'],
    'vue/max-len': ['off'],
    'import/prefer-default-export': ['off'],
    'no-underscore-dangle': ['error', { allow: ['_id', '_from', '_to', '_key'] }],
    ...a11yOff,
    'no-param-reassign': ['error', { props: false }],
    'import/extensions': ['error', { ts: 'never', vue: 'always' }],
  },

  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts'],
      },
      alias: {
        map: [['@', './src']],
        extensions: ['.ts', '.vue'],
      },
    },
  },
};
