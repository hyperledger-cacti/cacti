import "jest-extended";
import { Container } from "dockerode";
import { StellarTestLedger } from "../../../../../main/typescript/public-api";
import axios from "axios";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { SupportedImageVersions } from "../../../../../main/typescript/stellar/supported-image-versions";

describe("StellarTestLEdger", () => {
  const logLevel: LogLevelDesc = "TRACE";
  const stellarTestLedger = new StellarTestLedger({ logLevel });

  afterAll(async () => {
    await stellarTestLedger.stop();
    await stellarTestLedger.destroy();
  });

  test("constructor throws if invalid input is provided", () => {
    expect(StellarTestLedger).toBeDefined();

    expect(() => {
      new StellarTestLedger({
        containerImageVersion: "nope" as unknown as SupportedImageVersions,
      });
    }).toThrow();
  });

  test("constructor does not throw if valid input is provided", async () => {
    expect(StellarTestLedger).toBeDefined();
    expect(() => {
      new StellarTestLedger();
    }).not.toThrow();
  });

  test("starts/stops/destroys a valid docker container", async () => {
    const container: Container = await stellarTestLedger.start();
    expect(container).toBeDefined();

    const networkConfig = await stellarTestLedger.getNetworkConfiguration();
    expect(networkConfig).toBeDefined();
    expect(networkConfig.horizonUrl).toBeDefined();
    expect(networkConfig.networkPassphrase).toBeDefined();
    expect(networkConfig.rpcUrl).toBeDefined();
    expect(networkConfig.friendbotUrl).toBeDefined();

    const horizonResponse = await axios.get(networkConfig.horizonUrl as string);
    expect(horizonResponse.status).toBe(200);
  });
});
