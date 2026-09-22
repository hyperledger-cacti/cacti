import { LogLevelDesc } from "@hyperledger-cacti/cactus-common";
import axios from "axios";
import isPortReachable from "is-port-reachable";

import {
  CantonTestLedger,
  Containers,
  ICantonTestLedgerConnectionInfo,
  pruneDockerContainersIfGithubAction,
} from "../../../../main/typescript/public-api";

const CI_TEST_TIMEOUT = 20 * 60 * 1000;
const logLevel: LogLevelDesc = "INFO";

jest.setTimeout(CI_TEST_TIMEOUT);

describe("CantonTestLedger LocalNet", () => {
  const ledger = new CantonTestLedger({ logLevel });
  let connectionInfo: ICantonTestLedgerConnectionInfo;

  beforeAll(async () => {
    await ledger.start();
    connectionInfo = await ledger.getConnectionInfo();
  }, CI_TEST_TIMEOUT);

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    for (const cleanup of [
      () => ledger.stop(),
      () => ledger.destroy(),
      () => pruneDockerContainersIfGithubAction({ logLevel }),
    ]) {
      try {
        await cleanup();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0) {
      await Containers.logDiagnostics({ logLevel }).catch(() => undefined);
      throw cleanupErrors[0];
    }
  }, CI_TEST_TIMEOUT);

  it("publishes isolated ports and serves an authenticated ledger API", async () => {
    const addresses = [
      connectionInfo.adminApiAddress,
      new URL(connectionInfo.jsonLedgerApiHost).host,
      connectionInfo.ledgerApiAddress,
    ];
    expect(new Set(addresses).size).toBe(addresses.length);
    await expect(
      Promise.all(
        addresses.map((address) => {
          const separator = address.lastIndexOf(":");
          return isPortReachable(Number(address.slice(separator + 1)), {
            host: address.slice(0, separator),
          });
        }),
      ),
    ).resolves.toEqual(addresses.map(() => true));

    const response = await axios.get(
      `${connectionInfo.jsonLedgerApiHost}/v2/version`,
      {
        headers: {
          Authorization: `Bearer ${connectionInfo.ledgerApiAuthToken}`,
        },
      },
    );
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });
});
