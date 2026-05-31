/** @type {import('ts-jest/dist/types').JestConfigWithTsJest} */
const path = require("path");
module.exports = {
  preset: "ts-jest",
  logHeapUsage: true,
  testEnvironment: "node",
  maxWorkers: 1,
  maxConcurrency: 3,
  testTimeout: 60 * 60 * 1000,
  setupFilesAfterEnv: [
    "jest-extended/all",
    path.resolve(__dirname, "../../jest.setup.console.logs.js"),
  ],
  moduleNameMapper: {
    "^(\\.\\.?\\/.+)\\.jsx?$": "$1",
    "^(.+)/(.+)_pb\\.js$": "$1/$2_pb",
  },
  testMatch: ["**/src/test/typescript/integration/gateway/*.test.ts"],
  testPathIgnorePatterns: [
    // TODO(#flake): 3-chain (Fabric+Besu+Ethereum) e2e exceeds the 15 minute
    // hook timeout in CI; Fabric AIO `mychannel` setup repeatedly races on
    // `ledger already exists with state [ACTIVE]`. Skip until the Fabric
    // ledger startup is hardened (see fabric-test-environment.ts changes
    // in 0c01010e5).
    "/satp-e2e-transfer-2-gateway-with-api-server\\.test\\.ts$",
  ],
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "reports/junit",
        outputName: "satp-hermes-tests-integration-gateway.xml",
      },
    ],
  ],
};
