module.exports = {
  compilers: {
    solc: {
      version: "0.7.3",
      //docker: true,
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "istanbul"
      }
    }
  },
  plugins: ["solidity-coverage"]
};
