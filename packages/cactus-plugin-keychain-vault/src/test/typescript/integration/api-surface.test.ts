import test, { Test } from "tape-promise/tape";
import { PluginKeychainVault } from "../../../main/typescript/public-api";

test("Library can be loaded", (t: Test) => {
  t.ok(PluginKeychainVault);
  t.end();
});
