import test, { Test } from "tape-promise/tape";
import isPortReachable from "is-port-reachable";
import { v4 as internalIpV4 } from "internal-ip";
import { Container } from "dockerode";
import {
  IrohaTestLedger,
  PostgresTestContainer,
  IKeyPair,
  isIKeyPair,
} from "../../../../../main/typescript/public-api";
import { LogLevelDesc } from "@hyperledger/cactus-common";

const logLevel: LogLevelDesc = "TRACE";

test("constructor throws if invalid input is provided", (t: Test) => {
  t.ok(IrohaTestLedger);
  t.throws(
    () =>
      new IrohaTestLedger({
        imageVersion: "nope",
        postgresHost: "localhost",
        postgresPort: 5432,
      }),
  );
  t.end();
});

test("constructor does not throw if valid input is provided", (t: Test) => {
  t.ok(IrohaTestLedger);
  t.doesNotThrow(
    () =>
      new IrohaTestLedger({
        postgresHost: "localhost",
        postgresPort: 5432,
      }),
  );
  t.end();
});

test("starts/stops/destroys a docker container", async (t: Test) => {
  const postgresTestContainer = new PostgresTestContainer({ logLevel });

  test.onFinish(async () => {
    await postgresTestContainer.stop();
  });

  const postgresContainer: Container = await postgresTestContainer.start();
  const postgresPort = await postgresTestContainer.getPostgresPort();
  const postgresHost = await internalIpV4();
  if (!postgresHost) {
    throw new Error("Could not determine the internal IPV4 address.");
  }
  const irohaTestLedger = new IrohaTestLedger({
    postgresHost,
    postgresPort,
    logLevel,
  });

  test.onFinish(async () => {
    await irohaTestLedger.stop();
  });
  const irohaContainer = await irohaTestLedger.start();

  t.ok(irohaContainer, "irohaContainer truthy OK");
  t.ok(postgresContainer, "postgresContainer truthy OK");
  const irohaIpAddress = await irohaTestLedger.getContainerIpAddress();
  t.ok(irohaIpAddress, "irohaIpAddress truthy OK");
  t.equal(typeof irohaIpAddress, "string", "typeof irohaIpAddress string OK");

  const hostPort: number = await irohaTestLedger.getRpcToriiPort();
  t.ok(hostPort, "getRpcApiPublicPort() returns truthy OK");
  t.ok(isFinite(hostPort), "getRpcApiPublicPort() returns finite OK");

  const isReachable = await isPortReachable(hostPort, { host: "localhost" });
  t.ok(isReachable, `HostPort ${hostPort} is reachable via localhost`);

  const irohaKeyPair: IKeyPair = await irohaTestLedger.getNodeKeyPair();
  t.ok(irohaKeyPair, "getIrohaKeyPair() returns truthy OK");
  t.ok(isIKeyPair(irohaKeyPair));

  t.end();
});
