// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { BesuTestLedger } from "../../../main/typescript/public-api";

tap.pass("Test file can be executed");

tap.test("Library can be loaded", (assert: any) => {
  assert.ok(BesuTestLedger);
  assert.end();
});
