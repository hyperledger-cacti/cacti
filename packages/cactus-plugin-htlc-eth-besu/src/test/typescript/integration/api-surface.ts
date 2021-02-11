import test, { Test } from "tape";
import { PluginHtlcEthBesu } from "../../../main/typescript/public-api";

test("Library can be loaded", (t: Test) => {
  t.plan(2);
  t.ok(PluginHtlcEthBesu);
  t.pass("Test file can be executed");
});
