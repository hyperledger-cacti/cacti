import test, { Test } from "tape-promise/tape";

import { PluginFactoryLedgerConnector } from "../../../main/typescript/public-api";

test("Library can be loaded", (t: Test) => {
  t.ok(PluginFactoryLedgerConnector, "PluginFactoryLedgerConnector truthy OK");
  t.end();
});
