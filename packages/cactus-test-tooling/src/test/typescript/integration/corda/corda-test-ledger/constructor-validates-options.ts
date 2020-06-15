// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { Container } from "dockerode";
import isPortReachable from "is-port-reachable";
import { CordaTestLedger } from "../../../../../main/typescript/public-api";

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

  const rpcPortA: number = await cordaTestLedger.getRpcAPublicPort();
  assert.ok(rpcPortA, "rpcPortA truthy");
  assert.ok(isFinite(rpcPortA), "rpcPortA is finite integer");

  const host = "localhost";
  const reachable = await isPortReachable(rpcPortA, { host });
  assert.ok(reachable, `Port RPC A ${rpcPortA} reachable via localhost`);

  await cordaTestLedger.stop();
  await cordaTestLedger.destroy();
  assert.end();
});
