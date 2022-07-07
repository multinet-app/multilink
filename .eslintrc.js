const a11yOff = Object
  .keys(require('eslint-plugin-vuejs-accessibility').rules)
  .reduce((acc, rule) => { acc[`vuejs-accessibility/${rule}`] = 'off'; return acc; }, {});

module.exports = {
  root: true,

  env: {
    node: true,
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
    'max-len': ['off'],
    'import/prefer-default-export': ['off'],
    'no-underscore-dangle': ['error', { allow: ['_id', '_from', '_to', '_key'] }],
    ...a11yOff,
  },

  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    ecmaFeatures: {
      modules: true,
    },
  },
};
