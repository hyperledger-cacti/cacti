import { randomUUID } from "crypto";
import http from "http";
import { AddressInfo } from "net";

import { IListenOptions, Servers } from "@hyperledger-cacti/cactus-common";
import {
  installOpenapiValidationMiddleware,
  PluginRegistry,
} from "@hyperledger-cacti/cactus-core";
import express from "express";

import OAS from "../../../main/json/openapi.json";
import type { CantonCommand } from "../../../main/typescript/public-api";
import {
  CantonApiClient,
  CantonApiClientOptions,
  ICantonWalletSdk,
  PluginLedgerConnectorCanton,
} from "../../../main/typescript/public-api";

describe("Canton connector HTTP API", () => {
  const allScopes = [
    "write:canton-transactions",
    "read:canton-contracts",
    "read:canton-parties",
    "read:canton-spec",
  ];
  const sdk: ICantonWalletSdk = {
    ledger: {
      internal: {
        submit: jest.fn().mockResolvedValue({
          updateId: "update-1",
          completionOffset: 42,
        }),
      },
      acsReader: {
        raw: {
          readJsContracts: jest.fn().mockResolvedValue([
            {
              contractId: "contract-1",
              templateId: "package:Module:Asset",
              createArgument: { owner: "Alice::1220" },
              witnessParties: ["Alice::1220"],
              signatories: ["Alice::1220"],
              createdAt: "2026-10-02T00:00:00Z",
              synchronizerId: "synchronizer-1",
            },
          ]),
        },
      },
    },
    party: {
      list: jest.fn().mockResolvedValue(["Alice::1220"]),
    },
  };
  const createWalletSdk = jest.fn().mockResolvedValue(sdk);
  const connector = new PluginLedgerConnectorCanton({
    instanceId: randomUUID(),
    ledgerClientUrl: "http://127.0.0.1:7575",
    allowInsecureLoopbackHttp: true,
    auth: { method: "static", token: "test-only-token" },
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    logLevel: "SILENT",
    walletSdkFactory: { create: createWalletSdk },
  });
  const app = express();
  const server = http.createServer(app);
  let apiClient: CantonApiClient;

  beforeAll(async () => {
    app.use(express.json({ limit: "1mb" }));
    app.use((req, _res, next) => {
      const scopes = req.header("x-test-scopes")?.split(",") ?? [];
      (req as typeof req & { auth: { scope: string[] } }).auth = {
        scope: scopes,
      };
      next();
    });
    await installOpenapiValidationMiddleware({
      app,
      apiSpec: OAS,
      logLevel: "SILENT",
    });
    await connector.registerWebServices(app);

    const listenOptions: IListenOptions = {
      hostname: "127.0.0.1",
      port: 0,
      server,
    };
    const address = (await Servers.listen(listenOptions)) as AddressInfo;
    apiClient = new CantonApiClient(
      new CantonApiClientOptions({
        basePath: `http://${address.address}:${address.port}`,
        // The OpenAPI validator requires a bearer header; the test middleware
        // above stands in for token verification and supplies the scopes.
        accessToken: "test-only-token",
        baseOptions: {
          headers: { "x-test-scopes": allScopes.join(",") },
        },
      }),
    );
  });

  afterAll(async () => {
    await connector.shutdown();
    await Servers.shutdown(server);
  });

  test("creates and caches the four REST endpoints", async () => {
    const first = await connector.getOrCreateWebServices();
    const second = await connector.getOrCreateWebServices();

    expect(first).toHaveLength(4);
    expect(second).toBe(first);
    expect(first.map((endpoint) => endpoint.getPath()).sort()).toEqual(
      Object.keys(OAS.paths).sort(),
    );
  });

  test("serves transaction, contract, party, and OpenAPI operations", async () => {
    const command = {
      CreateCommand: {
        templateId: "package:Module:Asset",
        createArguments: { owner: "Alice::1220" },
      },
    };

    const transaction = await apiClient.runTransactionV1({
      partyId: "Alice::1220",
      commandId: "command-1",
      commands: [command],
    });
    const contracts = await apiClient.getActiveContractsV1({
      parties: ["Alice::1220"],
    });
    const parties = await apiClient.listPartiesV1();
    const openApi = await apiClient.getOpenApiSpecV1();

    expect(transaction.data).toEqual({
      updateId: "update-1",
      completionOffset: 42,
    });
    expect(contracts.data.contracts).toHaveLength(1);
    expect(parties.data).toEqual({ parties: ["Alice::1220"] });
    expect(openApi.data).toMatchObject({
      info: { title: "Hyperledger Cacti Plugin - Connector Canton" },
    });
    expect(createWalletSdk).toHaveBeenCalledTimes(1);
  });

  test.each<{ name: string; command: CantonCommand }>([
    {
      name: "exercise",
      command: {
        ExerciseCommand: {
          templateId: "package:Module:Asset",
          contractId: "contract-1",
          choice: "Transfer",
          choiceArgument: { newOwner: "Bob::1220" },
        },
      },
    },
    {
      name: "create-and-exercise",
      command: {
        CreateAndExerciseCommand: {
          templateId: "package:Module:Asset",
          createArguments: { owner: "Alice::1220" },
          choice: "Transfer",
          choiceArgument: { newOwner: "Bob::1220" },
        },
      },
    },
  ])("accepts a $name command over HTTP", async ({ command }) => {
    await apiClient.runTransactionV1({
      partyId: "Alice::1220",
      commandId: "command-1",
      commands: [command],
    });

    expect(sdk.ledger.internal.submit).toHaveBeenLastCalledWith(
      expect.objectContaining({ commands: [command] }),
    );
  });

  test("rejects an empty transaction at the OpenAPI boundary", async () => {
    await expect(
      apiClient.runTransactionV1({
        partyId: "Alice::1220",
        commandId: "command-1",
        commands: [],
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  test("accepts null Daml values at the OpenAPI boundary", async () => {
    const command: CantonCommand = {
      CreateCommand: {
        templateId: "package:Module:Asset",
        createArguments: {
          owner: "Alice::1220",
          note: null,
          history: [null, { previousOwner: null }],
        },
      },
    };

    await apiClient.runTransactionV1({
      partyId: "Alice::1220",
      commandId: "command-with-nulls",
      commands: [command],
    });

    expect(sdk.ledger.internal.submit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        commandId: "command-with-nulls",
        commands: [command],
      }),
    );
  });

  test("rejects a transaction without a command ID at the OpenAPI boundary", async () => {
    const callsBefore = jest.mocked(sdk.ledger.internal.submit).mock.calls
      .length;

    await expect(
      apiClient.runTransactionV1({
        partyId: "Alice::1220",
        commands: [
          {
            CreateCommand: {
              templateId: "package:Module:Asset",
              createArguments: {},
            },
          },
        ],
      } as never),
    ).rejects.toMatchObject({ response: { status: 400 } });
    expect(sdk.ledger.internal.submit).toHaveBeenCalledTimes(callsBefore);
  });

  test("rejects a command that matches no command variant at the OpenAPI boundary", async () => {
    const callsBefore = jest.mocked(sdk.ledger.internal.submit).mock.calls
      .length;

    await expect(
      apiClient.runTransactionV1({
        partyId: "Alice::1220",
        commandId: "command-1",
        commands: [{}] as CantonCommand[],
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
    expect(sdk.ledger.internal.submit).toHaveBeenCalledTimes(callsBefore);
  });

  test("rejects a request without a bearer token at the OpenAPI boundary", async () => {
    await expect(
      apiClient.listPartiesV1({ headers: { Authorization: "" } }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  test("rejects combined template and interface filters", async () => {
    const callsBefore = jest.mocked(sdk.ledger.acsReader.raw.readJsContracts)
      .mock.calls.length;

    await expect(
      apiClient.getActiveContractsV1({
        parties: ["Alice::1220"],
        templateIds: ["package:Module:Asset"],
        interfaceIds: ["package:Module:AssetInterface"],
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
    expect(sdk.ledger.acsReader.raw.readJsContracts).toHaveBeenCalledTimes(
      callsBefore,
    );
  });

  test.each([
    {
      name: "transaction",
      call: () =>
        apiClient.runTransactionV1(
          {
            partyId: "Alice::1220",
            commandId: "command-1",
            commands: [
              {
                CreateCommand: {
                  templateId: "package:Module:Asset",
                  createArguments: {},
                },
              },
            ],
          },
          { headers: { "x-test-scopes": "read:canton-contracts" } },
        ),
    },
    {
      name: "active-contract query",
      call: () =>
        apiClient.getActiveContractsV1(
          { parties: ["Alice::1220"] },
          { headers: { "x-test-scopes": "read:canton-parties" } },
        ),
    },
    {
      name: "party query",
      call: () =>
        apiClient.listPartiesV1({
          headers: { "x-test-scopes": "read:canton-contracts" },
        }),
    },
    {
      name: "OpenAPI query",
      call: () =>
        apiClient.getOpenApiSpecV1({
          headers: { "x-test-scopes": "read:canton-parties" },
        }),
    },
  ])("rejects an insufficient scope for the $name", async ({ call }) => {
    await expect(call()).rejects.toMatchObject({ response: { status: 403 } });
  });

  test("rejects a protected operation when the caller has no scopes", async () => {
    await expect(
      apiClient.listPartiesV1({ headers: { "x-test-scopes": "" } }),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  test("does not expose a Wallet SDK exception in an HTTP response", async () => {
    const toJSON = jest.fn(() => ({
      headers: { Authorization: "Bearer must-not-leak" },
      token: "must-not-leak",
      clientSecret: "must-not-leak",
    }));
    jest
      .mocked(sdk.ledger.internal.submit)
      .mockRejectedValueOnce(
        Object.assign(new Error("must-not-leak"), { toJSON }),
      );

    await expect(
      apiClient.runTransactionV1({
        partyId: "Alice::1220",
        commandId: "command-1",
        commands: [
          {
            CreateCommand: {
              templateId: "package:Module:Asset",
              createArguments: {},
            },
          },
        ],
      }),
    ).rejects.toMatchObject({
      response: {
        status: 502,
        data: { message: "Canton ledger operation failed." },
      },
    });
    expect(toJSON).not.toHaveBeenCalled();
  });
});
