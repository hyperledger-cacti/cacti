import test, { Test } from "tape";
import { FabricTestLedgerV1 } from "../../../../../main/typescript/public-api";

test("FabricTestLedgerV1#constructor()", (t: Test) => {
  t.ok(FabricTestLedgerV1, "Importing FabricTestLedgerV1 class OK");

  t.throws(
    () =>
      new FabricTestLedgerV1({
        imageVersion: "nope",
        publishAllPorts: false,
      }),
    /"imageVersion" length must be at least 5 characters long/,
    "throws if invalid imageVersion is provided OK",
  );

  t.throws(
    () =>
      new FabricTestLedgerV1({
        imageName: "----",
        publishAllPorts: false,
      }),
    /"imageName" with value (.*) fails to match the required pattern/,
    "throws if empty string imageName is provided OK",
  );

  t.doesNotThrow(
    () => new FabricTestLedgerV1({ publishAllPorts: false }),
    "does not throw if valid input is provided OK",
  );

  t.end();
});
