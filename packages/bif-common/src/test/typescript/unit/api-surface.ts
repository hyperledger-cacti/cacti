// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { Logger, LoggerProvider } from "../../../main/typescript/public-api";

tap.pass("Test file can be executed");

tap.test("Library can be loaded", (assert: any) => {
  assert.plan(2);
  assert.ok(Logger);
  assert.ok(LoggerProvider);
});
