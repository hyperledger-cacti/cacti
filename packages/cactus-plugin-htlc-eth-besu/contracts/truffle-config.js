module.exports = {
  compilers: {
    solc: {
      version: "0.5.16",
      docker: true,
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "istanbul"
      }
    }
  }
};
