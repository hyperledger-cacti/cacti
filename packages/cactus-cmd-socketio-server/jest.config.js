module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  maxWorkers: 1,
  maxConcurrency: 1,
  setupFilesAfterEnv: ["jest-extended"],
  testTimeout: 60 * 60 * 1000,
  testMatch: [`**/test/**/*.test.ts`],
};
