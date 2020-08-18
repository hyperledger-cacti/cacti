import test, { Test } from "tape";

import { Logger, LoggerProvider } from "../../../main/typescript/public-api";

test("Library can be loaded", (assert: Test) => {
  assert.ok(Logger);
  assert.ok(LoggerProvider);
  assert.end();
});
