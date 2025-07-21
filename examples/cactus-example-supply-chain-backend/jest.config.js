module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.ts"],
  setupFilesAfterEnv: ["jest-extended/all"],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/**/index.ts", "!src/**/*.d.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
