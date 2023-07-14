/** @type {import("webpack").Configuration} */
module.exports = {
  externals: {
    express: "express",
    "prom-client": "prom-client",
  },
  resolve: {
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      buffer: require.resolve("buffer/"),
      fs: require.resolve("browserify-fs"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      net: require.resolve("net-browserify"),
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      tls: require.resolve("tls-browserify"),
      zlib: require.resolve("browserify-zlib"),
    },
  },
};
