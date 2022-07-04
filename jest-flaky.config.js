const mainConfig = require('./jest.config.js');
module.exports = {
  ...mainConfig,
  testMatch: [
    `**/cactus-*/src/test/typescript/{unit,integration,benchmark}/**/*.flaky.test.ts`,
  ],
}
