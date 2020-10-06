const path = require("path");
const packageDir = process.cwd();
const pkg = require(`${packageDir}/package.json`);
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;

const packageNameNoScope = pkg.name.substring(pkg.name.lastIndexOf("/") + 1);
const libraryName = `${packageNameNoScope}`;

module.exports = {
  entry: {
    [pkg.main]: `${packageDir}/src/main/typescript/index.ts`,
  },
  target: "node",
  mode: "development",
  devtool: "inline-source-map",
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
  plugins: [
    // new BundleAnalyzerPlugin({
    //   analyzerMode: "static",
    //   openAnalyzer: false,
    //   reportFilename: `${pkg.main}.html`,
    // }),
  ],
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "[name]",
    path: packageDir,
    libraryTarget: "umd",
    library: libraryName,
    umdNamedDefine: true,
    globalObject: "this",
  },
  externals: {
    "swarm-js": "swarm-js",
    "node-ssh": "node-ssh",
    "fabric-client": "fabric-client",
  },
};
