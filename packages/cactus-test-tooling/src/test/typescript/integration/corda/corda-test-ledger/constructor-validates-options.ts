// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import {
  CordaTestLedger,
  IKeyPair,
  isIKeyPair,
} from "../../../../../main/typescript/public-api";
import { Container } from "dockerode";

tap.test("constructor throws if invalid input is provided", (assert: any) => {
  assert.ok(CordaTestLedger);
  assert.throws(() => new CordaTestLedger({ containerImageVersion: "nope" }));
  assert.end();
});

tap.test(
  "constructor does not throw if valid input is provided",
  (assert: any) => {
    assert.ok(CordaTestLedger);
    assert.doesNotThrow(() => new CordaTestLedger());
    assert.end();
  }
);

tap.test("starts/stops/destroys a docker container", async (assert: any) => {
  const cordaTestLedger = new CordaTestLedger();
  const container: Container = await cordaTestLedger.start();
  assert.ok(container);
  const ipAddress: string = await cordaTestLedger.getContainerIpAddress();
  assert.ok(ipAddress);
  assert.ok(ipAddress.length);

  await besuTestLedger.stop();
  await besuTestLedger.destroy();
  assert.end();
});
