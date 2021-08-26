import test, { Test } from "tape-promise/tape";
import isPortReachable from "is-port-reachable";
import { Container } from "dockerode";
import { PostgresTestContainer } from "../../../../../main/typescript/public-api";
import { LogLevelDesc } from "@hyperledger/cactus-common";

const logLevel: LogLevelDesc = "TRACE";

test("constructor throws if invalid input is provided", (assert: Test) => {
  assert.ok(PostgresTestContainer);
  assert.throws(() => new PostgresTestContainer({ imageVersion: "nope" }));
  assert.end();
});

test("constructor does not throw if valid input is provided", (assert: Test) => {
  assert.ok(PostgresTestContainer);
  assert.doesNotThrow(() => new PostgresTestContainer());
  assert.end();
});

test("starts/stops/destroys a docker container", async (assert: Test) => {
  const postgresTestContainer = new PostgresTestContainer({ logLevel });

  const postgresContainer: Container = await postgresTestContainer.start();
  test.onFinish(async () => {
    await postgresTestContainer.stop();
  });

  assert.ok(postgresContainer);
  const ipAddress: string = await postgresTestContainer.getContainerIpAddress();
  assert.ok(ipAddress);
  assert.ok(ipAddress.length);

  const hostPort: number = await postgresTestContainer.getPostgresPort();
  assert.ok(hostPort, "getRpcApiPublicPort() returns truthy OK");
  assert.ok(isFinite(hostPort), "getRpcApiPublicPort() returns finite OK");

  const isReachable = await isPortReachable(hostPort, { host: "localhost" });
  assert.ok(isReachable, `HostPort ${hostPort} is reachable via localhost`);

  assert.end();
});
