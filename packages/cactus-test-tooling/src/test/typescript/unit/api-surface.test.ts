import tap = require("tap");
import { BesuTestLedger } from "../../../main/typescript/public-api";

tap.pass("Test file can be executed");

tap.test("Library can be loaded", (assert: unknown) => {
  assert.ok(BesuTestLedger);
  assert.end();
});
