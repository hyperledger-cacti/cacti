// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { CordaTestLedger } from "../../../../../main/typescript/public-api";

tap.test("constructor throws if invalid input is provided", (assert: any) => {
  assert.ok(CordaTestLedger);
  assert.throws(() => new CordaTestLedger({ containerImageVersion: "nope" }));
  assert.end();
});

tap.test(
  "constructor throws if invalid input is provided",
  async (assert: any) => {
    const ledger = new CordaTestLedger();
    await ledger.start();
    // assert.teardown(() => ledger.stop())
    // assert.teardown(() => ledger.destroy())
    const ipAddress = await ledger.getContainerIpAddress();
    assert.ok(ipAddress, "IP address truthy");
    assert.ok(typeof ipAddress === "string", "IP address string");
    assert.ok(ipAddress.length > 0, "IP address non-blank");
    assert.end();
  }
);
