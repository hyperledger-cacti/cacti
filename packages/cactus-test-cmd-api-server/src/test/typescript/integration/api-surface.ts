import test, { Test } from "tape";
import * as publicApi from "../../../main/typescript/public-api";

test("Library can be loaded", (t: Test) => {
  t.plan(1);
  t.ok(publicApi);
});
