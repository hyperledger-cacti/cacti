import "jest-extended";
import isPortReachable from "is-port-reachable";
import { Container } from "dockerode";
import { PostgresTestContainer } from "../../../../../main/typescript/public-api";
import { LogLevelDesc } from "@hyperledger/cactus-common";

const logLevel: LogLevelDesc = "INFO";

describe("PostgresTestContainer", () => {
  const postgresTestContainer = new PostgresTestContainer({ logLevel });
  let postgresContainer: Container;

  beforeAll(async () => {
    postgresContainer = await postgresTestContainer.start();
  });

  afterAll(async () => {
    await postgresTestContainer.stop();
  });

  it("constructor throws if invalid input is provided", () => {
    expect(PostgresTestContainer).toBeTruthy();
    expect(
      () => new PostgresTestContainer({ imageVersion: "nope" }),
    ).toThrowError();
  });

  it("constructor does not throw if valid input is provided", () => {
    expect(PostgresTestContainer).toBeTruthy();
    expect(() => new PostgresTestContainer()).not.toThrow();
  });

  it("starts/stops/destroys a docker container", async () => {
    expect(postgresContainer).toBeTruthy();
    const ip: string = await postgresTestContainer.getContainerIpAddress();
    expect(ip).toBeString();
    expect(ip).not.toBeEmpty();

    const hostPort: number = await postgresTestContainer.getPostgresPort();
    expect(hostPort).toBeTruthy();
    expect(hostPort).toBeFinite();

    const reachabilityCheck = isPortReachable(hostPort, { host: "127.0.0.1" });
    expect(reachabilityCheck).resolves.toBeTrue();
  });
});
