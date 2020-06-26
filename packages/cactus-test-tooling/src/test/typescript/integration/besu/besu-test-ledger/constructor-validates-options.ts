// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import isPortReachable from "is-port-reachable";
import { Container } from "dockerode";
import {
  BesuTestLedger,
  IKeyPair,
  isIKeyPair,
} from "../../../../../main/typescript/public-api";

tap.test("constructor throws if invalid input is provided", (assert: any) => {
  assert.ok(BesuTestLedger);
  assert.throws(() => new BesuTestLedger({ containerImageVersion: "nope" }));
  assert.end();
});

tap.test(
  "constructor does not throw if valid input is provided",
  (assert: any) => {
    assert.ok(BesuTestLedger);
    assert.doesNotThrow(() => new BesuTestLedger());
    assert.end();
  }
);

tap.test("starts/stops/destroys a docker container", async (assert: any) => {
  const besuTestLedger = new BesuTestLedger();
  assert.tearDown(() => besuTestLedger.stop());
  assert.tearDown(() => besuTestLedger.destroy());

  const container: Container = await besuTestLedger.start();
  assert.ok(container);
  const ipAddress: string = await besuTestLedger.getContainerIpAddress();
  assert.ok(ipAddress);
  assert.ok(ipAddress.length);

  const hostPort: number = await besuTestLedger.getRpcApiPublicPort();
  assert.ok(hostPort, "getRpcApiPublicPort() returns truthy OK");
  assert.ok(isFinite(hostPort), "getRpcApiPublicPort() returns finite OK");

  const isReachable = await isPortReachable(hostPort, { host: "localhost" });
  assert.ok(isReachable, `HostPort ${hostPort} is reachable via localhost`);

  const besuKeyPair: IKeyPair = await besuTestLedger.getBesuKeyPair();
  assert.ok(besuKeyPair, "getBesuKeyPair() returns truthy OK");
  assert.ok(isIKeyPair(besuKeyPair));

  const orionKeyPair: IKeyPair = await besuTestLedger.getOrionKeyPair();
  assert.ok(orionKeyPair, "getOrionKeyPair() returns truthy OK");
  assert.ok(isIKeyPair(orionKeyPair));

  assert.end();
});
