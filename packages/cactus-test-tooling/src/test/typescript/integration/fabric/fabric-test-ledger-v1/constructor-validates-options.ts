// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import isPortReachable from "is-port-reachable";
import { Container } from "dockerode";
import { FabricTestLedgerV1 } from "../../../../../main/typescript/public-api";

tap.test("constructor throws if invalid input is provided", (assert: any) => {
  assert.ok(FabricTestLedgerV1);
  assert.throws(() => new FabricTestLedgerV1({ imageVersion: "nope" }));
  assert.end();
});

tap.test(
  "constructor does not throw if valid input is provided",
  (assert: any) => {
    assert.ok(FabricTestLedgerV1);
    // const options = { sshConnectionOptions };
    assert.doesNotThrow(() => new FabricTestLedgerV1({}));
    assert.end();
  }
);

tap.test("starts/stops/destroys a docker container", async (assert: any) => {
  const fabricTestLedger = new FabricTestLedgerV1({});
  assert.tearDown(() => fabricTestLedger.stop());
  assert.tearDown(() => fabricTestLedger.destroy());

  const container: Container = await fabricTestLedger.start();
  assert.ok(container);
  const ipAddress: string = await fabricTestLedger.getContainerIpAddress();
  assert.ok(ipAddress);
  assert.ok(ipAddress.length);

  const hostPort: number = await fabricTestLedger.getOpsApiPublicPort();
  assert.ok(hostPort, "getOpsApiPublicPort() returns truthy OK");
  assert.ok(isFinite(hostPort), "getOpsApiPublicPort() returns finite OK");

  const isReachable = await isPortReachable(hostPort, { host: "localhost" });
  assert.ok(isReachable, `HostPort ${hostPort} is reachable via localhost`);

  assert.end();
});
