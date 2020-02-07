const process = require('process');

const publicPath = process.env.PUBLIC_PATH || '/';

module.exports = {
  transpileDependencies: [
    "vuetify"
  ],
  publicPath: process.env.NODE_ENV === 'production' ? publicPath : '/',
  devServer: {
    compress: true,
    disableHostCheck: true,   // That solved it
  },
};
