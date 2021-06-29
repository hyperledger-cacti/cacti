module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["jest-extended"],
  testTimeout: 60 * 60 * 1000,
  // testMatch: [
  //   `**/cactus-*/src/test/typescript/unit,integration,benchmark}/**/*.{test,spec}.ts`,
  // ],
};
