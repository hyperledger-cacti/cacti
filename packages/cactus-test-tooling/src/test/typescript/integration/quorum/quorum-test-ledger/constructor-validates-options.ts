const tap = require("tap");
import isPortReachable from "is-port-reachable";
import { Container } from "dockerode";
import {
  QuorumTestLedger,
  IKeyPair,
  isIKeyPair,
} from "../../../../../main/typescript/public-api";

tap.test("constructor throws if invalid input is provided", (assert: any) => {
  assert.ok(QuorumTestLedger);
  assert.throws(() => new QuorumTestLedger({ containerImageVersion: "nope" }));
  assert.end();
});

tap.test(
  "constructor does not throw if valid input is provided",
  (assert: any) => {
    assert.ok(QuorumTestLedger);
    assert.doesNotThrow(() => new QuorumTestLedger());
    assert.end();
  },
);

tap.test("starts/stops/destroys a docker container", async (assert: any) => {
  const ledger = new QuorumTestLedger();
  assert.tearDown(async () => {
    await ledger.stop();
    await ledger.destroy();
  });

  const container: Container = await ledger.start();
  assert.ok(container);
  const ipAddress: string = await ledger.getContainerIpAddress();
  assert.ok(ipAddress);
  assert.ok(ipAddress.length);

  const hostPort: number = await ledger.getRpcApiPublicPort();
  assert.ok(hostPort, "getRpcApiPublicPort() returns truthy OK");
  assert.ok(isFinite(hostPort), "getRpcApiPublicPort() returns finite OK");

  const isReachable = await isPortReachable(hostPort, { host: "localhost" });
  assert.ok(isReachable, `HostPort ${hostPort} is reachable via localhost`);

  const quorumKeyPair: IKeyPair = await ledger.getQuorumKeyPair();
  assert.ok(quorumKeyPair);
  assert.ok(isIKeyPair(quorumKeyPair));

  const tesseraKeyPair: IKeyPair = await ledger.getTesseraKeyPair();
  assert.ok(tesseraKeyPair);
  assert.ok(isIKeyPair(tesseraKeyPair));

  assert.end();
});
