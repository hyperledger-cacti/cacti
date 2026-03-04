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
  testMatch: ["**/src/test/typescript/unit/**/*.test.ts"],
  testPathIgnorePatterns: [],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "reports/junit",
        outputName: "satp-hermes-tests-unit.xml",
      },
    ],
  ],
};
