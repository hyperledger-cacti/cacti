module.exports = (config) => {
  config.set({
    singleRun: true,
    logLevel: config.LOG_INFO,
    colors: true,

    frameworks: ["tap"],

    // Use "Chrome" if you need to debug tests with the actual browser window
    // being open and you want to use Chrome Dev Tools for it.
    browsers: [
      // 'Electron',
      // "ElectronWithGui",
      // 'Chrome',
      "ChromeHeadless",
      // "ChromeHeadlessDebug",
    ],

    files: [
      // FIXME: For whatever reason only the first test gets executed not all of them
      "./packages/cactus-common/src/test/typescript/unit/**/*",
    ],

    plugins: [
      "karma-chrome-launcher",
      "karma-electron",
      "karma-tap",
      "karma-webpack",
    ],

    preprocessors: {
      "**/*.ts": ["webpack"],
    },

    browserConsoleLogOptions: {
      level: "debug",
      format: "%b %T: %m",
      terminal: true,
    },

    reporters: ["dots"],

    webpack: {
      mode: "development",
      devtool: "inline-source-map",
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [
              {
                loader: "ts-loader",
              },
            ],
          },
        ],
      },
      resolve: {
        extensions: [".ts", ".js"],
      },
      node: {
        fs: "empty",
      },
    },

    webpackMiddleware: {
      // without this the webpack compilation log is shown as well
      stats: "errors-only",
    },

    customLaunchers: {
      ElectronWithGui: {
        base: "Electron",
        flags: [
          "--show",
          "--disable-translate",
          "--disable-extensions",
          "--no-first-run",
          "--disable-background-networking",
          "--remote-debugging-port=9222",
          "--remote-debugging-address=127.0.0.1",
        ],
      },

      ChromeHeadlessDebug: {
        base: "ChromeHeadless",
        flags: [
          "--disable-translate",
          "--disable-extensions",
          "--no-first-run",
          "--disable-background-networking",
          "--remote-debugging-port=9222",
          "--remote-debugging-address=127.0.0.1",
        ],
      },
    },
  });
};
