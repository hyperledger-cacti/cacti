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

test.skip("constructor throws if invalid input is provided", (t: Test) => {
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

test.skip("constructor does not throw if valid input is provided", (t: Test) => {
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

/**
 * Flaky test - we are skipping it for now
 *
 * ```sh
 * Executing task: docker logs --tail 1000 -f e57575c9ba1522c10ecd6675234d1c80caf72b2138d8cef58e3c73749e587e62 <
 * key=node0
 * /opt/iroha_data
 * NOTE: IROHA_POSTGRES_HOST should match 'host' option in config file
 * wait-for-it.sh: waiting 30 seconds for 192.168.66.229:49153
 * wait-for-it.sh: timeout occurred after waiting 30 seconds for 192.168.66.229:49153
 * [2021-09-15 04:32:27.632218734][I][Init]: Irohad version: 1.2.0
 * [2021-09-15 04:32:27.632242961][I][Init]: config initialized
 * [2021-09-15 04:32:27.632519876][W][Init]: Using deprecated database connection string!
 * [2021-09-15 04:32:27.633029755][I][Irohad]: created
 * [2021-09-15 04:32:27.633071877][I][Irohad]: [Init] => pending transactions storage
 * [2021-09-15 04:34:38.353932099][E][Irohad]: Storage initialization failed: Could not connect to maintenance database: Cannot establish connection to the database.
 * could not connect to server: Connection timed out
 *         Is the server running on host "192.168.66.229" and accepting
 *         TCP/IP connections on port 49153?
 *
 * [2021-09-15 04:34:38.353979081][E][Init]: Failed to initialize storage
 *
 * ```
 */

test.skip("starts/stops/destroys a docker container", async (t: Test) => {
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
    emitContainerLogs: true,
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
