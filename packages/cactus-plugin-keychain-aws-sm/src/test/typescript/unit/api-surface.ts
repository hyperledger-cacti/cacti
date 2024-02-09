import test, { Test } from "tape";
import * as publicApi from "../../../main/typescript/public-api.js";

test("Library can be loaded", (assert: Test) => {
  assert.ok(publicApi);
  assert.end();
});
