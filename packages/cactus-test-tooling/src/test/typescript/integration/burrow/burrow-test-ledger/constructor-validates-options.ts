const tap = require("tap");
import isPortReachable from "is-port-reachable";
import { Container } from "dockerode";
import { BurrowTestLedger } from "../../../../../main/typescript/public-api";

tap.test("constructor throws if invalid input is provided", (assert: any) => {
  assert.ok(BurrowTestLedger);
  assert.throws(() => new BurrowTestLedger({ containerImageVersion: "nope" }));
  assert.end();
});

tap.test(
  "constructor does not throw if valid input is provided",
  (assert: any) => {
    assert.ok(BurrowTestLedger);
    assert.doesNotThrow(() => new BurrowTestLedger());
    assert.end();
  },
);

tap.test("starts/stops/destroys a docker container", async (assert: any) => {
  const burrowTestLedger = new BurrowTestLedger();
  assert.tearDown(() => burrowTestLedger.stop());
  //assert.tearDown(() => burrowTestLedger.destroy());

  const container: Container = await burrowTestLedger.start();
  assert.ok(container);
  const ipAddress: string = await burrowTestLedger.getContainerIpAddress();
  assert.ok(ipAddress);
  assert.ok(ipAddress.length);

  const hostPort: number = await burrowTestLedger.getGrpcPublicPort();
  assert.ok(hostPort, "getGrpcPublicPort() returns truthy OK");
  assert.ok(isFinite(hostPort), "getGrpcPublicPort() returns finite OK");

  const isReachable = await isPortReachable(hostPort, { host: "localhost" });
  assert.ok(isReachable, `HostPort ${hostPort} is reachable via localhost`);

  assert.end();
});
