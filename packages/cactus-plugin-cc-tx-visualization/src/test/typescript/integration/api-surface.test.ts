import test, { Test } from "tape-promise/tape";

import * as apiSurface from "../../../main/typescript/public-api";

test("Library can be loaded", (t: Test) => {
  t.ok(apiSurface, "apiSurface truthy OK");
  t.end();
});
