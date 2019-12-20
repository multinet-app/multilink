module.exports = {
    transformIgnorePatterns: ['/node_modules/(?!vuetify)'],
    moduleFileExtensions: ['js', 'jsx', 'json', 'vue'],

    transform: {
    '^.+\\.vue$': 'vue-jest',
    '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$':
        'jest-transform-stub',
    '^.+\\.(js|jsx)?$': 'babel-jest'
    },

    preset: '@vue/cli-plugin-unit-jest'
}
