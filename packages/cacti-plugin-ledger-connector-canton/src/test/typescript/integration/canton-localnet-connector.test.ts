import { randomUUID } from "crypto";
import http from "http";
import { AddressInfo } from "net";

import { Servers } from "@hyperledger-cacti/cactus-common";
import {
  installOpenapiValidationMiddleware,
  PluginRegistry,
} from "@hyperledger-cacti/cactus-core";
import {
  CantonTestLedger,
  Containers,
  ICantonTestLedgerConnectionInfo,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";
import axios from "axios";
import express from "express";

import OAS from "../../../main/json/openapi.json";
import {
  CantonApiClient,
  CantonApiClientOptions,
  CantonLedgerError,
  PluginLedgerConnectorCanton,
} from "../../../main/typescript/public-api";

const TEST_TIMEOUT = 20 * 60 * 1000;
const PING_TEMPLATE_ID =
  "#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping";
const RESOLVED_PING_TEMPLATE_ID = /^[0-9a-f]{64}:Canton\.Internal\.Ping:Ping$/;

interface IUserRightsResponse {
  readonly rights?: Array<{
    readonly kind?: {
      readonly CanActAs?: {
        readonly value?: { readonly party?: string };
      };
    };
  }>;
}

/** Returns the Ledger API user ID carried in the token's `sub` claim. */
function ledgerApiUserOf(token: string): string {
  const [, payload] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new Error("The LocalNet token has no sub claim");
  }
  return claims.sub;
}

function createPingCommand(pingId: string, partyId: string) {
  return {
    CreateCommand: {
      templateId: PING_TEMPLATE_ID,
      createArguments: {
        id: pingId,
        initiator: partyId,
        responder: partyId,
      },
    },
  };
}

jest.setTimeout(TEST_TIMEOUT);

describe("Canton connector with LocalNet", () => {
  const ledger = new CantonTestLedger({ logLevel: "INFO" });
  const app = express();
  const server = http.createServer(app);
  let connectionInfo: ICantonTestLedgerConnectionInfo;
  let connector: PluginLedgerConnectorCanton;
  let apiClient: CantonApiClient;
  let partyId: string;

  beforeAll(async () => {
    try {
      await ledger.start();
      connectionInfo = await ledger.getConnectionInfo();

      const userId = ledgerApiUserOf(connectionInfo.ledgerApiAuthToken);
      const rightsResponse = await axios.get<IUserRightsResponse>(
        `${connectionInfo.jsonLedgerApiHost}/v2/users/${encodeURIComponent(userId)}/rights`,
        {
          headers: {
            Authorization: `Bearer ${connectionInfo.ledgerApiAuthToken}`,
          },
        },
      );
      const actAsParty = rightsResponse.data.rights
        ?.map((right) => right.kind?.CanActAs?.value?.party)
        .find((party): party is string => typeof party === "string");
      if (!actAsParty) {
        throw new Error("The LocalNet user has no CanActAs party");
      }
      partyId = actAsParty;

      connector = new PluginLedgerConnectorCanton({
        instanceId: randomUUID(),
        ledgerClientUrl: connectionInfo.jsonLedgerApiHost,
        // LocalNet publishes its JSON Ledger API on plain HTTP at 127.0.0.1.
        allowInsecureLoopbackHttp: true,
        auth: {
          method: "static",
          token: connectionInfo.ledgerApiAuthToken,
        },
        pluginRegistry: new PluginRegistry({ plugins: [] }),
        logLevel: "INFO",
        allowedPartyIds: [partyId],
      });

      // Stand-in for the API server's JWT verification: it grants every
      // connector scope to any request.
      app.use(express.json({ limit: "1mb" }));
      app.use((req, _res, next) => {
        (req as typeof req & { auth: { scope: string[] } }).auth = {
          scope: [
            "write:canton-transactions",
            "read:canton-contracts",
            "read:canton-parties",
          ],
        };
        next();
      });
      await installOpenapiValidationMiddleware({
        app,
        apiSpec: OAS,
        logLevel: "INFO",
      });
      await connector.registerWebServices(app);
      const address = (await Servers.listen({
        hostname: "127.0.0.1",
        port: 0,
        server,
      })) as AddressInfo;
      apiClient = new CantonApiClient(
        new CantonApiClientOptions({
          basePath: `http://${address.address}:${address.port}`,
          accessToken: "test-only-token",
        }),
      );
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
      () => (server.listening ? Servers.shutdown(server) : undefined),
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

  test("submits a Ping over REST and reads it back from the ACS", async () => {
    const { data: listed } = await apiClient.listPartiesV1();
    expect(listed.parties).toEqual([partyId]);

    const pingId = `cacti-${randomUUID()}`;
    const { data: transaction } = await apiClient.runTransactionV1({
      partyId,
      commandId: `create-ping-${randomUUID()}`,
      commands: [createPingCommand(pingId, partyId)],
    });
    expect(transaction.updateId).not.toHaveLength(0);
    expect(transaction.completionOffset).toBeGreaterThan(0);

    const { data: byTemplate } = await apiClient.getActiveContractsV1({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
    });
    expect(byTemplate.activeAtOffset).toBeGreaterThanOrEqual(
      transaction.completionOffset,
    );
    const ping = byTemplate.contracts.find(
      (contract) => contract.createArgument.id === pingId,
    );
    // The ledger reports the resolved package ID, not the package-name
    // reference used to submit the command.
    expect(ping).toMatchObject({
      templateId: expect.stringMatching(RESOLVED_PING_TEMPLATE_ID),
      signatories: expect.arrayContaining([partyId]),
      createArgument: { id: pingId, initiator: partyId, responder: partyId },
    });

    // A parties-only query uses a party-wide filter.
    const partyWide = await connector.getActiveContracts({
      parties: [partyId],
    });
    expect(
      partyWide.contracts.some(
        (contract) => contract.contractId === ping?.contractId,
      ) || partyWide.limitReached,
    ).toBe(true);

    // Each request's limit is honoured independently.
    const limited = await connector.getActiveContracts({
      parties: [partyId],
      limit: 1,
    });
    expect(limited.contracts).toHaveLength(1);
    expect(limited.limitReached).toBe(true);
  });

  test("deduplicates a retried command ID and exercises a choice", async () => {
    const pingId = `cacti-${randomUUID()}`;
    const create = {
      partyId,
      commandId: `create-ping-${randomUUID()}`,
      commands: [createPingCommand(pingId, partyId)],
    };
    await connector.transact(create);

    // Retrying the same create with the same commandId, as the API asks after
    // a timeout, is rejected by Canton's command deduplication instead of
    // creating a second contract.
    const retry = await connector.transact(create).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(retry).toBeInstanceOf(CantonLedgerError);
    expect(retry).toMatchObject({ statusCode: 409 });

    const { contracts } = await connector.getActiveContracts({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
    });
    const pings = contracts.filter(
      (contract) => contract.createArgument.id === pingId,
    );
    expect(pings).toHaveLength(1);
    const [ping] = pings;
    if (!ping) {
      throw new Error("The created Ping is not in the active contract set");
    }

    const archive = {
      partyId,
      commandId: `archive-ping-${randomUUID()}`,
      commands: [
        {
          ExerciseCommand: {
            templateId: PING_TEMPLATE_ID,
            contractId: ping.contractId,
            choice: "Archive",
            choiceArgument: {},
          },
        },
      ],
    };
    await connector.transact(archive);

    const afterArchive = await connector.getActiveContracts({
      parties: [partyId],
      templateIds: [PING_TEMPLATE_ID],
    });
    expect(
      afterArchive.contracts.map((contract) => contract.contractId),
    ).not.toContain(ping.contractId);
  });
});
