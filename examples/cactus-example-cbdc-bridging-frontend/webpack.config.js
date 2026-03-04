// webpack.config.js
module.exports = {
  // ... other configurations
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: require.resolve("ts-loader"),
        exclude: /node_modules/,
      },
      // ... other rules
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
