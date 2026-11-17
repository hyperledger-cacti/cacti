import http from "http";

import express from "express";
import {
  BadRequestError,
  ForbiddenError,
  ServiceUnavailableError,
} from "http-errors-enhanced-cjs";
import { firstValueFrom, Observable } from "rxjs";
import { Server as SocketIoServer } from "socket.io";
import { Servers } from "@hyperledger-cacti/cactus-common";

import { readCantonUpdates } from "../../../main/typescript/canton-wallet-sdk/update-reader";
import type {
  ICantonUpdateEntry,
  ICantonWalletSdk,
} from "../../../main/typescript/canton-wallet-sdk";
import {
  CantonApiClient,
  WatchBlocksV1Endpoint,
  WatchBlocksV1Error,
  WatchBlocksV1Progress,
} from "../../../main/typescript/public-api";
import type { PluginLedgerConnectorCanton } from "../../../main/typescript/plugin-ledger-connector-canton";
import {
  CONNECTOR_SCOPES,
  createConnector,
  createSdkMock,
  startConnectorApi,
} from "../canton-test-utilities";

const PARTY = "Alice::1220";

function transactionEntry(offset: number): ICantonUpdateEntry {
  return {
    update: {
      Transaction: {
        value: {
          offset,
          updateId: `update-${offset}`,
          commandId: `command-${offset}`,
          effectiveAt: "2026-11-18T00:00:00Z",
          synchronizerId: "synchronizer-1",
          events: [
            {
              CreatedEvent: {
                contractId: `contract-${offset}`,
                templateId: "package:Asset:Asset",
                createArgument: { owner: PARTY },
                witnessParties: [PARTY],
                signatories: [PARTY],
                createdAt: "2026-11-18T00:00:00Z",
              },
            },
            {
              ArchivedEvent: {
                contractId: "contract-0",
                templateId: "package:Asset:Asset",
                witnessParties: [PARTY],
              },
            },
          ],
        },
      },
    },
  };
}

function checkpointEntry(offset: number): ICantonUpdateEntry {
  return { update: { OffsetCheckpoint: { value: { offset } } } };
}

function setUp(
  options: {
    readonly allowedPartyIds?: readonly string[];
    readonly maxActiveContractLimit?: number;
  } = {},
): { sdk: ICantonWalletSdk; connector: PluginLedgerConnectorCanton } {
  const sdk = createSdkMock();
  const connector = createConnector(
    { create: jest.fn().mockResolvedValue(sdk) },
    options,
  );
  return { sdk, connector };
}

describe("Canton connector: readUpdates", () => {
  test("starts at the ledger end when no offset is given", async () => {
    const { sdk, connector } = setUp();

    await expect(connector.readUpdates({ parties: [PARTY] })).resolves.toEqual({
      transactions: [],
      nextOffset: 10,
      limitReached: false,
    });
    expect(sdk.updates.read).not.toHaveBeenCalled();
  });

  test("returns the transactions up to the ledger end and continues from it", async () => {
    const { sdk, connector } = setUp();
    jest
      .mocked(sdk.updates.read)
      .mockResolvedValue([transactionEntry(4), checkpointEntry(6)]);

    const page = await connector.readUpdates({
      parties: [PARTY],
      templateIds: ["#asset:Asset:Asset"],
      beginExclusive: 3,
    });

    expect(sdk.updates.read).toHaveBeenCalledWith({
      parties: [PARTY],
      templateIds: ["#asset:Asset:Asset"],
      interfaceIds: undefined,
      beginExclusive: 3,
      endInclusive: 10,
      limit: 200,
    });
    expect(page).toEqual({
      transactions: [
        {
          offset: 4,
          updateId: "update-4",
          commandId: "command-4",
          workflowId: undefined,
          effectiveAt: "2026-11-18T00:00:00Z",
          synchronizerId: "synchronizer-1",
          events: [
            {
              created: expect.objectContaining({
                contractId: "contract-4",
                synchronizerId: "synchronizer-1",
              }),
            },
            {
              archived: {
                contractId: "contract-0",
                templateId: "package:Asset:Asset",
                witnessParties: [PARTY],
              },
            },
          ],
        },
      ],
      nextOffset: 10,
      limitReached: false,
    });
  });

  test("continues after the last update of a full page", async () => {
    const { sdk, connector } = setUp({ maxActiveContractLimit: 2 });
    jest
      .mocked(sdk.updates.read)
      .mockResolvedValue([transactionEntry(4), checkpointEntry(5)]);

    const page = await connector.readUpdates({
      parties: [PARTY],
      beginExclusive: 3,
    });

    expect(page.nextOffset).toBe(5);
    expect(page.limitReached).toBe(true);
  });

  test("fails instead of repeating a full page that does not advance", async () => {
    const { sdk, connector } = setUp({ maxActiveContractLimit: 1 });
    jest.mocked(sdk.updates.read).mockResolvedValue([{ update: {} }]);

    await expect(
      connector.readUpdates({ parties: [PARTY], beginExclusive: 3 }),
    ).rejects.toThrow();
  });

  test("rejects a party the connector does not allow without contacting the ledger", async () => {
    const { sdk, connector } = setUp({ allowedPartyIds: [PARTY] });

    await expect(
      connector.readUpdates({ parties: ["Mallory::1220"], beginExclusive: 3 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(sdk.ledger.ledgerEnd).not.toHaveBeenCalled();
  });

  test.each([
    ["a negative offset", { parties: [PARTY], beginExclusive: -1 }],
    ["no parties", { parties: [] }],
    [
      "both template and interface filters",
      { parties: [PARTY], templateIds: ["t"], interfaceIds: ["i"] },
    ],
  ])("rejects %s", async (_, request) => {
    const { connector } = setUp();

    await expect(connector.readUpdates(request)).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });
});

describe("readCantonUpdates", () => {
  test.each([
    [
      "a template filter",
      { templateIds: ["#asset:Asset:Asset"] },
      [
        {
          identifierFilter: {
            TemplateFilter: {
              value: {
                templateId: "#asset:Asset:Asset",
                includeCreatedEventBlob: false,
              },
            },
          },
        },
      ],
    ],
    ["a party-wide filter", {}, []],
  ])(
    "requests a bounded ACS-delta section with %s",
    async (_, filter, cumulative) => {
      const ledgerProvider = { request: jest.fn().mockResolvedValue([]) };

      await readCantonUpdates(ledgerProvider, {
        parties: [PARTY],
        beginExclusive: 3,
        endInclusive: 10,
        limit: 50,
        ...filter,
      });

      expect(ledgerProvider.request).toHaveBeenCalledWith({
        method: "ledgerApi",
        params: {
          requestMethod: "post",
          resource: "/v2/updates",
          query: { limit: 50 },
          body: {
            beginExclusive: 3,
            endInclusive: 10,
            updateFormat: {
              includeTransactions: {
                eventFormat: {
                  filtersByParty: { [PARTY]: { cumulative } },
                  verbose: false,
                },
                transactionShape: "TRANSACTION_SHAPE_ACS_DELTA",
              },
            },
          },
        },
      });
    },
  );
});

describe("Canton connector: WatchBlocksV1", () => {
  const servers: http.Server[] = [];
  const socketServers: SocketIoServer[] = [];

  afterEach(async () => {
    jest.restoreAllMocks();
    for (const wsApi of socketServers.splice(0)) {
      wsApi.close();
    }
    for (const server of servers.splice(0)) {
      if (server.listening) {
        await Servers.shutdown(server);
      }
    }
  });

  async function startApi(
    connector: PluginLedgerConnectorCanton,
    scopes: readonly string[] = CONNECTOR_SCOPES,
  ): Promise<CantonApiClient> {
    const server = http.createServer();
    const app = express();
    server.on("request", app);
    const wsApi = new SocketIoServer();
    servers.push(server);
    socketServers.push(wsApi);
    return startConnectorApi(app, server, connector, { scopes, wsApi });
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

  test("streams the transactions after lastSeenOffset", async () => {
    const { sdk, connector } = setUp();
    jest.mocked(sdk.updates.read).mockResolvedValue([transactionEntry(4)]);
    const apiClient = await startApi(connector);

    const progress = await firstValueFrom(
      apiClient.watchBlocksV1({ parties: [PARTY], lastSeenOffset: 3 }),
    );

    expect(progress).toMatchObject({ offset: 4, updateId: "update-4" });
    expect(sdk.updates.read).toHaveBeenCalledWith(
      expect.objectContaining({ beginExclusive: 3, endInclusive: 10 }),
    );
    await connector.shutdown();
  });

  test.each([
    [
      "a caller without the contract-read scope",
      CONNECTOR_SCOPES.filter((scope) => scope !== "read:canton-contracts"),
      { parties: [PARTY] },
      403,
    ],
    [
      "options with an unknown key",
      CONNECTOR_SCOPES,
      { parties: [PARTY], fromOffset: 3 },
      400,
    ],
    [
      "a party the connector does not allow",
      CONNECTOR_SCOPES,
      { parties: ["Mallory::1220"] },
      403,
    ],
  ])(
    "ends the stream with an error for %s",
    async (_, scopes, options, statusCode) => {
      const { sdk, connector } = setUp({ allowedPartyIds: [PARTY] });
      const apiClient = await startApi(connector, scopes);

      const error = await firstError(apiClient.watchBlocksV1(options as never));

      expect(error.statusCode).toBe(statusCode);
      expect(sdk.updates.read).not.toHaveBeenCalled();
      await connector.shutdown();
    },
  );

  test("ends active streams with HTTP 503 when the connector shuts down", async () => {
    const { connector } = setUp();
    const apiClient = await startApi(connector);
    const started = new Promise<void>((resolve) => {
      jest.spyOn(connector, "readUpdates").mockImplementationOnce(async () => {
        resolve();
        return { transactions: [], nextOffset: 10, limitReached: false };
      });
    });
    const error = firstError(apiClient.watchBlocksV1({ parties: [PARTY] }));
    await started;

    await connector.shutdown();

    await expect(error).resolves.toEqual(
      expect.objectContaining({
        statusCode: new ServiceUnavailableError().statusCode,
      }),
    );
  });

  test("stops polling when the client unsubscribes", async () => {
    const { connector } = setUp();
    const apiClient = await startApi(connector);
    const stopped = new Promise<void>((resolve) => {
      const stop = WatchBlocksV1Endpoint.prototype.stop;
      jest
        .spyOn(WatchBlocksV1Endpoint.prototype, "stop")
        .mockImplementation(function (this: WatchBlocksV1Endpoint, error) {
          stop.call(this, error);
          resolve();
        });
    });
    const started = new Promise<void>((resolve) => {
      jest.spyOn(connector, "readUpdates").mockImplementation(async () => {
        resolve();
        return { transactions: [], nextOffset: 10, limitReached: false };
      });
    });

    const subscription = apiClient
      .watchBlocksV1({ parties: [PARTY] })
      .subscribe();
    await started;
    subscription.unsubscribe();

    await expect(stopped).resolves.toBeUndefined();
    await connector.shutdown();
  });
});
