const packageDir = process.cwd();
const pkg = require(`${packageDir}/package.json`);
const TerserPlugin = require("terser-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;

const packageNameNoScope = pkg.name.substring(pkg.name.lastIndexOf("/") + 1);
const libraryName = `${packageNameNoScope}`;

module.exports = {
  entry: {
    [pkg.browserMinified]: `${packageDir}/src/main/typescript/index.web.ts`,
  },
  mode: "production",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          "cache-loader",
          {
            loader: "ts-loader",
            options: {
              transpileOnly: false,
              configFile: "tsconfig.json",
            },
          },
        ],
      },
      {
        test: /\.(js|ts)$/,
        enforce: "pre",
        use: [
          "cache-loader",
          {
            loader: "source-map-loader",
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  optimization: {
    minimizer: [new TerserPlugin()],
  },
  plugins: [
    // new BundleAnalyzerPlugin({
    //   analyzerMode: "static",
    //   openAnalyzer: false,
    //   reportFilename: `${pkg.browserMinified}.html`,
    // }),
  ],
  output: {
    filename: "[name]",
    path: packageDir,
    libraryTarget: "umd",
    library: libraryName,
    umdNamedDefine: true,
    globalObject: "this",
  },
  externals: {
    express: "express",
  },
};
