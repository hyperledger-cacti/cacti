// tslint:disable-next-line: no-var-requires
import test from "tape";

import { Logger, LoggerProvider } from "../../../main/typescript/public-api";

test("Library can be loaded", (assert: any) => {
  assert.plan(2);
  assert.ok(Logger);
  assert.ok(LoggerProvider);
  assert.end();
});
