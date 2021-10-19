import test, { Test } from "tape-promise/tape";

import { PluginFactoryHTLCCoordinatorBesu } from "../../../main/typescript/public-api";

test("Library can be loaded", (t: Test) => {
  t.ok(
    PluginFactoryHTLCCoordinatorBesu,
    "PluginFactoryHTLCCoordinatorBesu truthy OK",
  );
  t.end();
});
