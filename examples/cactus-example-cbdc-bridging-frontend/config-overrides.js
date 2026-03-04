const { override, addWebpackModuleRule } = require("customize-cra");

module.exports = override(
  addWebpackModuleRule({
    test: /\.tsx?$/,
    use: require.resolve("ts-loader"),
    exclude: /node_modules/,
  }),
);
