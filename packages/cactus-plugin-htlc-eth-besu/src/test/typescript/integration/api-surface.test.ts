import test, { Test } from "tape-promise/tape";
import * as publicApi from "../../../main/typescript/public-api";

test("Library can be loaded", (t: Test) => {
  t.ok(publicApi, "API surface loaded OK");
  t.end();
});
