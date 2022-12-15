const a11yOff = Object
  .keys(require('eslint-plugin-vuejs-accessibility').rules)
  .reduce((acc, rule) => { acc[`vuejs-accessibility/${rule}`] = 'off'; return acc; }, {});

const path = require('path');

module.exports = {
  root: true,

  env: {
    es2021: true,
  },

  extends: [
    'plugin:vue/recommended',
    '@vue/airbnb',
    '@vue/typescript',
    'plugin:vue/recommended',
    '@vue/typescript/recommended',
  ],

  plugins: [
    'vuetify',
  ],

  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'vue/max-len': ['off'],
    'import/prefer-default-export': ['off'],
    'no-underscore-dangle': ['error', { allow: ['_id', '_from', '_to', '_key'] }],
    ...a11yOff,
    'no-param-reassign': ['error', { props: false }],
    'import/extensions': [
      'error',
      {
        ts: 'never',
        vue: 'always',
      },
    ],
  },

  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts'],
      },
      alias: {
        map: [
          ['@', './src'],
        ],
        extensions: ['.ts', '.vue'],
      },
    },
  },

  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    ecmaFeatures: {
      modules: true,
    },
  },
};
