// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import {
  QuorumTestLedger,
  IKeyPair,
  isIKeyPair,
} from "../../../../../main/typescript/public-api";
import { Container } from "dockerode";

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
  }
);

tap.test("starts/stops/destroys a docker container", async (assert: any) => {
  const ledger = new QuorumTestLedger();
  const container: Container = await ledger.start();
  assert.ok(container);
  const ipAddress: string = await ledger.getContainerIpAddress();
  assert.ok(ipAddress);
  assert.ok(ipAddress.length);

  const quorumKeyPair: IKeyPair = await ledger.getQuorumKeyPair();
  assert.ok(quorumKeyPair);
  assert.ok(isIKeyPair(quorumKeyPair));

  const tesseraKeyPair: IKeyPair = await ledger.getTesseraKeyPair();
  assert.ok(tesseraKeyPair);
  assert.ok(isIKeyPair(tesseraKeyPair));

  await ledger.stop();
  await ledger.destroy();
  assert.end();
});
