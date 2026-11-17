import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import http from "http";
import path from "path";

import { Servers } from "@hyperledger-cacti/cactus-common";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import {
  CantonTestLedger,
  Containers,
  ICantonTestLedgerConnectionInfo,
  pruneDockerContainersIfGithubAction,
} from "@hyperledger-cacti/cactus-test-tooling";
import express from "express";
import { firstValueFrom, Observable, take, toArray } from "rxjs";
import { Server as SocketIoServer } from "socket.io";

import {
  CantonApiClient,
  IPluginLedgerConnectorCantonOptions,
  PluginLedgerConnectorCanton,
  WatchBlocksV1Error,
  WatchBlocksV1Progress,
} from "../../../main/typescript/public-api";
import {
  CONNECTOR_SCOPES,
  getLocalNetActAsParty,
  invalidateJwt,
  startConnectorApi,
} from "../canton-test-utilities";

const TEST_TIMEOUT = 20 * 60 * 1000;
const ASSET_DAR = readFileSync(
  path.join(__dirname, "../../daml/asset/cacti-canton-test-asset.dar"),
);
const ASSET_TEMPLATE_NAME_ID = "#cacti-canton-test-asset:Asset:Asset";

jest.setTimeout(TEST_TIMEOUT);

describe("Canton connector WatchBlocksV1 with LocalNet", () => {
  const ledger = new CantonTestLedger({ logLevel: "INFO" });
  const servers: http.Server[] = [];
  const socketServers: SocketIoServer[] = [];
  const connectors: PluginLedgerConnectorCanton[] = [];
  let connectionInfo: ICantonTestLedgerConnectionInfo;
  let partyId: string;
  let connector: PluginLedgerConnectorCanton;
  let apiClient: CantonApiClient;
  let assetTemplateId: string;

  function createConnector(
    options: Partial<IPluginLedgerConnectorCantonOptions> = {},
  ): PluginLedgerConnectorCanton {
    const created = new PluginLedgerConnectorCanton({
      instanceId: randomUUID(),
      ledgerClientUrl: connectionInfo.jsonLedgerApiHost,
      // LocalNet publishes its JSON Ledger API on plain HTTP at 127.0.0.1.
      allowInsecureLoopbackHttp: true,
      auth: { method: "static", token: connectionInfo.ledgerApiAuthToken },
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      logLevel: "INFO",
      allowedPartyIds: [partyId],
      watchBlocksPollIntervalMs: 200,
      ...options,
    });
    connectors.push(created);
    return created;
  }

  async function startApi(
    apiConnector: PluginLedgerConnectorCanton,
    scopes: readonly string[] = CONNECTOR_SCOPES,
  ): Promise<CantonApiClient> {
    const app = express();
    const server = http.createServer(app);
    const wsApi = new SocketIoServer();
    servers.push(server);
    socketServers.push(wsApi);
    return startConnectorApi(app, server, apiConnector, { scopes, wsApi });
  }

  function firstError(
    stream: Observable<WatchBlocksV1Progress>,
  ): Promise<WatchBlocksV1Error> {
    return firstValueFrom(stream).then(
      () => {
        throw new Error("Expected the stream to fail.");
      },
      (error: WatchBlocksV1Error) => error,
    );
  }

  async function currentOffset(): Promise<number> {
    const { activeAtOffset } = await connector.getActiveContracts({
      parties: [partyId],
      templateIds: [ASSET_TEMPLATE_NAME_ID],
      limit: 1,
    });
    return activeAtOffset;
  }

  beforeAll(async () => {
    try {
      await ledger.start();
      connectionInfo = await ledger.getConnectionInfo();
      partyId = await getLocalNetActAsParty(
        connectionInfo.jsonLedgerApiHost,
        connectionInfo.ledgerApiAuthToken,
      );
      connector = createConnector();
      apiClient = await startApi(connector);
      const { packageId } = await connector.deployContract({
        darBase64: ASSET_DAR.toString("base64"),
      });
      assetTemplateId = `${packageId}:Asset:Asset`;
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
      ...connectors.map((created) => () => created.shutdown()),
      ...socketServers.map((wsApi) => () => {
        wsApi.close();
      }),
      ...servers.map(
        (server) => () =>
          server.listening ? Servers.shutdown(server) : undefined,
      ),
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

  test("streams an Asset's create and archive, and resumes after an offset", async () => {
    // Subscribing from a known offset makes the stream independent of when
    // the server processes the Subscribe message.
    const lastSeenOffset = await currentOffset();
    const received = firstValueFrom(
      apiClient
        .watchBlocksV1({
          parties: [partyId],
          templateIds: [ASSET_TEMPLATE_NAME_ID],
          lastSeenOffset,
        })
        .pipe(take(2), toArray()),
    );

    const symbol = `CACTI-${randomUUID()}`;
    await connector.transact({
      partyId,
      commandId: `create-asset-${randomUUID()}`,
      commands: [
        {
          CreateCommand: {
            templateId: assetTemplateId,
            createArguments: {
              issuer: partyId,
              owner: partyId,
              symbol,
              amount: "10.0",
              locked: false,
            },
          },
        },
      ],
    });
    const { contracts } = await connector.getActiveContracts({
      parties: [partyId],
      templateIds: [ASSET_TEMPLATE_NAME_ID],
    });
    const asset = contracts.find(
      (contract) => contract.createArgument?.symbol === symbol,
    );
    expect(asset).toBeDefined();
    await connector.transact({
      partyId,
      commandId: `burn-asset-${randomUUID()}`,
      commands: [
        {
          ExerciseCommand: {
            templateId: assetTemplateId,
            contractId: asset!.contractId,
            choice: "Burn",
            choiceArgument: {},
          },
        },
      ],
    });

    const [created, archived] = await received;
    expect(created.events).toContainEqual({
      created: expect.objectContaining({
        contractId: asset!.contractId,
        templateId: assetTemplateId,
        createArgument: expect.objectContaining({ symbol }),
      }),
    });
    expect(archived.events).toContainEqual({
      archived: expect.objectContaining({ contractId: asset!.contractId }),
    });
    expect(archived.offset).toBeGreaterThan(created.offset);

    const resumed = await firstValueFrom(
      apiClient.watchBlocksV1({
        parties: [partyId],
        templateIds: [ASSET_TEMPLATE_NAME_ID],
        lastSeenOffset: created.offset,
      }),
    );
    expect(resumed).toEqual(archived);
  });

  test("rejects a party the connector does not allow", async () => {
    const error = await firstError(
      apiClient.watchBlocksV1({ parties: [`${partyId}-other`] }),
    );
    expect(error.statusCode).toBe(403);
  });

  test("rejects a caller without the contract-read scope", async () => {
    const withoutReadScope = await startApi(
      createConnector(),
      CONNECTOR_SCOPES.filter((scope) => scope !== "read:canton-contracts"),
    );
    const error = await firstError(
      withoutReadScope.watchBlocksV1({ parties: [partyId] }),
    );
    expect(error.statusCode).toBe(403);
  });

  test("ends the stream when LocalNet cannot authenticate the connector", async () => {
    const unauthorized = await startApi(
      createConnector({
        auth: {
          method: "static",
          token: invalidateJwt(connectionInfo.ledgerApiAuthToken),
        },
      }),
    );
    const error = await firstError(
      unauthorized.watchBlocksV1({ parties: [partyId] }),
    );
    expect(error.statusCode).toBe(502);
  });
});
