import { randomUUID } from "crypto";

import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import {
  CantonTestLedger,
  Containers,
  ICantonTestLedgerConnectionInfo,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";
import axios from "axios";

import { PluginLedgerConnectorCanton } from "../../../main/typescript/public-api";

const TEST_TIMEOUT = 20 * 60 * 1000;
const PING_TEMPLATE_ID =
  "#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping";
const LOCALNET_LEDGER_API_USER = "ledger-api-user";

interface IUserRightsResponse {
  readonly rights?: Array<{
    readonly kind?: {
      readonly CanActAs?: {
        readonly value?: { readonly party?: string };
      };
    };
  }>;
}

jest.setTimeout(TEST_TIMEOUT);

describe("Canton connector with LocalNet", () => {
  const ledger = new CantonTestLedger({ logLevel: "INFO" });
  let connectionInfo: ICantonTestLedgerConnectionInfo;
  let connector: PluginLedgerConnectorCanton;

  beforeAll(async () => {
    try {
      await ledger.start();
      connectionInfo = await ledger.getConnectionInfo();
      connector = new PluginLedgerConnectorCanton({
        instanceId: randomUUID(),
        ledgerClientUrl: connectionInfo.jsonLedgerApiHost,
        auth: {
          method: "static",
          token: connectionInfo.ledgerApiAuthToken,
        },
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        logLevel: "INFO",
      });
    } catch (error) {
      await Containers.logDiagnostics({ logLevel: "INFO" }).catch(
        () => undefined,
      );
      throw error;
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    for (const cleanup of [
      () => connector?.shutdown(),
      () => ledger.stop(),
      () => ledger.destroy(),
      () => pruneDockerContainersIfGithubAction({ logLevel: "INFO" }),
    ]) {
      try {
        await cleanup();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    if (cleanupErrors.length > 0) {
      await Containers.logDiagnostics({ logLevel: "INFO" }).catch(
        () => undefined,
      );
      throw cleanupErrors[0];
    }
  }, TEST_TIMEOUT);

  test("lists a party, submits a Ping, and reads it from the ACS", async () => {
    const { parties } = await connector.listParties();
    expect(parties.length).toBeGreaterThan(0);
    const rightsResponse = await axios.get<IUserRightsResponse>(
      `${connectionInfo.jsonLedgerApiHost}/v2/users/${LOCALNET_LEDGER_API_USER}/rights`,
      {
        headers: {
          Authorization: `Bearer ${connectionInfo.ledgerApiAuthToken}`,
        },
      },
    );
    const partyId = rightsResponse.data.rights
      ?.map((right) => right.kind?.CanActAs?.value?.party)
      .find((party): party is string => typeof party === "string");
    expect(partyId).toBeDefined();
    if (!partyId) {
      throw new Error("LocalNet user has no CanActAs party");
    }
    expect(parties).toContain(partyId);
    const pingId = `cacti-pr2-${randomUUID()}`;

    const transaction = await connector.transact({
      partyId,
      commandId: `create-ping-${randomUUID()}`,
      commands: [
        {
          CreateCommand: {
            templateId: PING_TEMPLATE_ID,
            createArguments: {
              id: pingId,
              initiator: partyId,
              responder: partyId,
            },
          },
        },
      ],
    });

    expect(transaction.updateId).not.toHaveLength(0);
    expect(transaction.completionOffset).toBeGreaterThanOrEqual(0);

    const { contracts } = await connector.getActiveContracts({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
      limit: 100,
    });
    const ping = contracts.find(
      (contract) =>
        (contract.createArgument as { id?: string } | undefined)?.id === pingId,
    );

    expect(ping).toMatchObject({
      templateId: PING_TEMPLATE_ID,
      signatories: expect.arrayContaining([partyId]),
      createArgument: {
        id: pingId,
        initiator: partyId,
        responder: partyId,
      },
    });
  });
});
