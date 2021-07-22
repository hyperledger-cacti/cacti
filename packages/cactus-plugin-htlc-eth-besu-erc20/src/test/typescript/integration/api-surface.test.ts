import test, { Test } from "tape";
import { PluginHtlcEthBesuErc20 } from "../../../main/typescript/public-api";

test("Library can be loaded", (t: Test) => {
  t.plan(2);
  t.ok(PluginHtlcEthBesuErc20);
  t.pass("Test file can be executed");
});
