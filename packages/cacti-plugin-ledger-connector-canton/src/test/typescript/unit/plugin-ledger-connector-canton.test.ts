import {
  MAX_COMMANDS_PER_TRANSACTION,
  MAX_IN_FLIGHT_OPERATIONS,
  MAX_FILTER_VALUES,
  MAX_IDENTIFIER_LENGTH,
  MAX_OPERATION_TIMEOUT_MS,
  MAX_TRANSACTION_PAYLOAD_BYTES,
  PluginLedgerConnectorCanton,
} from "../../../main/typescript/plugin-ledger-connector-canton";
import type {
  ICantonWalletSdk,
  ICantonWalletSdkFactory,
} from "../../../main/typescript/canton-wallet-sdk";
import { CantonWalletSdkFactory } from "../../../main/typescript/canton-wallet-sdk";
import { ConsensusAlgorithmFamily } from "@hyperledger-cacti/cactus-core-api";
import type { CantonCommand } from "../../../main/typescript/generated/openapi/typescript-axios";

const auth = {
  method: "self_signed" as const,
  issuer: "unsafe-auth",
  credentials: {
    clientId: "ledger-api-user",
    clientSecret: "test-only-secret",
    audience: "https://canton.network.global",
    scope: "",
  },
};

function createSdkMock(): ICantonWalletSdk {
  return {
    ledger: {
      internal: {
        submit: jest.fn().mockResolvedValue({
          updateId: "update-1",
          completionOffset: 42,
        }),
      },
      acsReader: {
        raw: {
          readJsContracts: jest.fn().mockResolvedValue([]),
        },
      },
    },
    party: {
      list: jest.fn().mockResolvedValue(["Alice::1220"]),
    },
  };
}

function createConnector(
  walletSdkFactory: ICantonWalletSdkFactory,
  options: {
    readonly allowedPartyIds?: readonly string[];
    readonly operationTimeoutMs?: number;
    readonly maxInFlightOperations?: number;
  } = {},
): PluginLedgerConnectorCanton {
  return new PluginLedgerConnectorCanton({
    instanceId: "canton-connector-test",
    ledgerClientUrl: "http://127.0.0.1:7575",
    allowInsecureLoopbackHttp: true,
    auth,
    pluginRegistry: {} as never,
    walletSdkFactory,
    ...options,
  });
}

function createCommandWithSerializedSize(size: number): CantonCommand[] {
  const command = {
    CreateCommand: {
      templateId: "package:Module:Asset",
      createArguments: { payload: "" },
    },
  };
  const commands: CantonCommand[] = [command];
  const baseSize = Buffer.byteLength(JSON.stringify(commands), "utf8");
  command.CreateCommand.createArguments.payload = "x".repeat(size - baseSize);
  return commands;
}

function createCommandWithPayloadNesting(levels: number): CantonCommand {
  let payload: unknown = "leaf";
  for (let index = 0; index < levels; index++) {
    payload = { value: payload };
  }
  return {
    CreateCommand: {
      templateId: "package:Module:Asset",
      createArguments: { payload },
    },
  } as CantonCommand;
}

describe("PluginLedgerConnectorCanton", () => {
  test("initializes lazily and does not create the Wallet SDK on plugin init", async () => {
    const create = jest.fn();
    const connector = createConnector({ create });

    await expect(connector.onPluginInit()).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  test("creates one Wallet SDK instance for concurrent first operations", async () => {
    const sdk = createSdkMock();
    const create = jest.fn().mockResolvedValue(sdk);
    const connector = createConnector({ create });

    await Promise.all([
      connector.listParties(),
      connector.getActiveContracts({ parties: ["Alice::1220"] }),
    ]);

    expect(create).toHaveBeenCalledTimes(1);
  });

  test("rejects new ledger work after shutdown", async () => {
    const sdk = createSdkMock();
    const create = jest.fn().mockResolvedValue(sdk);
    const connector = createConnector({ create });
    await connector.listParties();

    await connector.shutdown();

    await expect(connector.listParties()).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringMatching(/has been shut down/i),
    });
    await expect(
      connector.getActiveContracts({ parties: ["Alice::1220"] }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(create).toHaveBeenCalledTimes(1);
    expect(sdk.party.list).toHaveBeenCalledTimes(1);
  });

  test("shutdown waits for pending upstream operations to settle", async () => {
    const sdk = createSdkMock();
    let resolveList: ((parties: string[]) => void) | undefined;
    jest.mocked(sdk.party.list).mockImplementationOnce(
      () =>
        new Promise<string[]>((resolve) => {
          resolveList = resolve;
        }),
    );
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });
    const operation = connector.listParties();
    await new Promise((resolve) => setImmediate(resolve));
    expect(resolveList).toBeDefined();

    let shutdownFinished = false;
    const shutdown = connector.shutdown().then(() => {
      shutdownFinished = true;
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(shutdownFinished).toBe(false);

    resolveList?.(["Alice::1220"]);
    await shutdown;
    await expect(operation).resolves.toEqual({ parties: ["Alice::1220"] });
  });

  test("shutdown stops waiting for an upstream operation after the operation timeout", async () => {
    jest.useFakeTimers();
    try {
      const sdk = createSdkMock();
      jest
        .mocked(sdk.party.list)
        .mockImplementation(() => new Promise(() => undefined));
      const connector = createConnector(
        { create: jest.fn().mockResolvedValue(sdk) },
        { operationTimeoutMs: 25 },
      );
      const operation = connector.listParties();
      const rejection = expect(operation).rejects.toMatchObject({
        statusCode: 504,
      });
      await jest.advanceTimersByTimeAsync(25);
      await rejection;

      const shutdown = connector.shutdown();
      await jest.advanceTimersByTimeAsync(25);
      await expect(shutdown).resolves.toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  test("an SDK initialization still pending at shutdown cannot revive the connector", async () => {
    const sdk = createSdkMock();
    let resolveFirst: ((value: ICantonWalletSdk) => void) | undefined;
    const create = jest.fn().mockImplementationOnce(
      () =>
        new Promise<ICantonWalletSdk>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const connector = createConnector({ create });
    const firstOperation = connector.listParties();
    await new Promise((resolve) => setImmediate(resolve));

    const shutdown = connector.shutdown();
    resolveFirst?.(sdk);
    await shutdown;

    // The operation that was already waiting for the SDK may complete, but
    // nothing new is accepted afterwards.
    await firstOperation.catch(() => undefined);
    await expect(connector.listParties()).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  test("forwards a transaction to the Wallet SDK submit operation", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });
    const command = {
      CreateCommand: {
        templateId: "package:Module:Asset",
        createArguments: { owner: "Alice::1220" },
      },
    };

    const response = await connector.transact({
      partyId: "Alice::1220",
      commands: [command],
      readAs: ["Observer::1220"],
      commandId: "command-1",
      synchronizerId: "synchronizer-1",
    });

    expect(sdk.ledger.internal.submit).toHaveBeenCalledWith({
      actAs: ["Alice::1220"],
      commands: [command],
      readAs: ["Observer::1220"],
      commandId: "command-1",
      synchronizerId: "synchronizer-1",
    });
    expect(response).toEqual({ updateId: "update-1", completionOffset: 42 });
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
  ])("forwards a $name command unchanged", async ({ command }) => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await connector.transact({
      commandId: "command-1",
      partyId: "Alice::1220",
      commands: [command],
    });

    expect(sdk.ledger.internal.submit).toHaveBeenCalledWith(
      expect.objectContaining({ commands: [command] }),
    );
  });

  test("rejects an empty transaction without creating the Wallet SDK", async () => {
    const create = jest.fn();
    const connector = createConnector({ create });

    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: [],
      }),
    ).rejects.toThrow(/commands must not be empty/i);

    expect(create).not.toHaveBeenCalled();
  });

  test("rejects missing commands with a stable validation error", async () => {
    const create = jest.fn();
    const connector = createConnector({ create });

    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
      } as never),
    ).rejects.toThrow(/commands must not be empty/i);

    expect(create).not.toHaveBeenCalled();
  });

  test("accepts the command-count boundary and rejects one command above it", async () => {
    const sdk = createSdkMock();
    const create = jest.fn().mockResolvedValue(sdk);
    const connector = createConnector({ create });
    const command: CantonCommand = {
      CreateCommand: {
        templateId: "package:Module:Asset",
        createArguments: {},
      },
    };

    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: Array(MAX_COMMANDS_PER_TRANSACTION).fill(command),
      }),
    ).resolves.toEqual({ updateId: "update-1", completionOffset: 42 });
    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: Array(MAX_COMMANDS_PER_TRANSACTION + 1).fill(command),
      }),
    ).rejects.toThrow(/must not contain more than 100 items/i);
    expect(sdk.ledger.internal.submit).toHaveBeenCalledTimes(1);
  });

  test("accepts the readAs-count boundary and rejects one party above it", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });
    const command: CantonCommand = {
      CreateCommand: {
        templateId: "package:Module:Asset",
        createArguments: {},
      },
    };

    await connector.transact({
      commandId: "command-1",
      partyId: "Alice::1220",
      commands: [command],
      readAs: Array.from(
        { length: MAX_FILTER_VALUES },
        (_value, index) => `Reader-${index}::1220`,
      ),
    });
    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: [command],
        readAs: Array(MAX_FILTER_VALUES + 1).fill("Reader::1220"),
      }),
    ).rejects.toThrow(/readAs must not contain more than 100 items/i);
    expect(sdk.ledger.internal.submit).toHaveBeenCalledTimes(1);
  });

  test("accepts the identifier-length boundary and rejects one character above it", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });
    const command: CantonCommand = {
      CreateCommand: {
        templateId: "package:Module:Asset",
        createArguments: {},
      },
    };

    await connector.transact({
      commandId: "command-1",
      partyId: "p".repeat(MAX_IDENTIFIER_LENGTH),
      commands: [command],
    });
    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "p".repeat(MAX_IDENTIFIER_LENGTH + 1),
        commands: [command],
      }),
    ).rejects.toThrow(/partyId must not exceed 1024 characters/i);
    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: [
          {
            CreateCommand: {
              templateId: "t".repeat(MAX_IDENTIFIER_LENGTH + 1),
              createArguments: {},
            },
          },
        ],
      }),
    ).rejects.toThrow(/templateId must not exceed 1024 characters/i);
    expect(sdk.ledger.internal.submit).toHaveBeenCalledTimes(1);
  });

  test("accepts the transaction-payload byte boundary and rejects one byte above it", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await connector.transact({
      commandId: "command-1",
      partyId: "Alice::1220",
      commands: createCommandWithSerializedSize(MAX_TRANSACTION_PAYLOAD_BYTES),
    });
    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: createCommandWithSerializedSize(
          MAX_TRANSACTION_PAYLOAD_BYTES + 1,
        ),
      }),
    ).rejects.toThrow(/must not exceed 1048576 bytes/i);
    expect(sdk.ledger.internal.submit).toHaveBeenCalledTimes(1);
  });

  test("accepts the payload-depth boundary and rejects one level above it", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await connector.transact({
      commandId: "command-1",
      partyId: "Alice::1220",
      commands: [createCommandWithPayloadNesting(60)],
    });
    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: [createCommandWithPayloadNesting(61)],
      }),
    ).rejects.toThrow(/must not exceed 64 nesting levels/i);
    expect(sdk.ledger.internal.submit).toHaveBeenCalledTimes(1);
  });

  test("rejects non-JSON command values without forwarding them", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: [
          {
            CreateCommand: {
              templateId: "package:Module:Asset",
              createArguments: { invalid: Number.POSITIVE_INFINITY },
            },
          },
        ],
      }),
    ).rejects.toThrow(/finite, acyclic JSON data/i);
    expect(sdk.ledger.internal.submit).not.toHaveBeenCalled();
  });

  test("rejects cyclic command payloads without forwarding them", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });
    const cyclicPayload: { self?: unknown } = {};
    cyclicPayload.self = cyclicPayload;

    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: [
          {
            CreateCommand: {
              templateId: "package:Module:Asset",
              createArguments: { cyclicPayload: cyclicPayload as never },
            },
          },
        ],
      }),
    ).rejects.toThrow(/finite, acyclic JSON data/i);
    expect(sdk.ledger.internal.submit).not.toHaveBeenCalled();
  });

  test.each([
    {
      name: "a non-object command",
      request: {
        partyId: "Alice::1220",
        commandId: "command-1",
        commands: [null],
      },
      error: /commands\[\] must be an object/i,
    },
    {
      name: "a blank command ID",
      request: {
        partyId: "Alice::1220",
        commands: [{}],
        commandId: " ",
      },
      error: /commandId/i,
    },
    {
      name: "a blank read-as party",
      request: {
        partyId: "Alice::1220",
        commandId: "command-1",
        commands: [{}],
        readAs: [""],
      },
      error: /readAs/i,
    },
  ])(
    "rejects $name before creating the Wallet SDK",
    async ({ request, error }) => {
      const create = jest.fn();
      const connector = createConnector({ create });

      await expect(connector.transact(request as never)).rejects.toThrow(error);
      expect(create).not.toHaveBeenCalled();
    },
  );

  test("forces party filtering and applies the default ACS result limit", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await connector.getActiveContracts({
      parties: ["Alice::1220"],
      templateIds: ["package:Module:Asset"],
      offset: 7,
    });

    expect(sdk.ledger.acsReader.raw.readJsContracts).toHaveBeenCalledWith({
      parties: ["Alice::1220"],
      filterByParty: true,
      templateIds: ["package:Module:Asset"],
      interfaceIds: undefined,
      offset: 7,
      limit: 100,
    });
  });

  test("forwards an interface-only ACS filter", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await connector.getActiveContracts({
      parties: ["Alice::1220"],
      interfaceIds: ["package:Module:AssetInterface"],
    });

    expect(sdk.ledger.acsReader.raw.readJsContracts).toHaveBeenCalledWith(
      expect.objectContaining({
        templateIds: undefined,
        interfaceIds: ["package:Module:AssetInterface"],
      }),
    );
  });

  test("rejects ACS queries above the 1000-contract limit", async () => {
    const create = jest.fn();
    const connector = createConnector({ create });

    await expect(
      connector.getActiveContracts({
        parties: ["Alice::1220"],
        limit: 10_000,
      }),
    ).rejects.toThrow(/limit must not exceed 1000/i);
    expect(create).not.toHaveBeenCalled();
  });

  test("rejects an ACS query without parties before creating the SDK", async () => {
    const create = jest.fn();
    const connector = createConnector({ create });

    await expect(connector.getActiveContracts({ parties: [] })).rejects.toThrow(
      /parties must not be empty/i,
    );

    expect(create).not.toHaveBeenCalled();
  });

  test("accepts ACS filter-count boundaries and rejects one item above them", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });
    const parties = Array.from(
      { length: MAX_FILTER_VALUES },
      (_value, index) => `Party-${index}::1220`,
    );
    const templateIds = Array.from(
      { length: MAX_FILTER_VALUES },
      (_value, index) => `package:Module:Asset${index}`,
    );

    await connector.getActiveContracts({ parties, templateIds });
    await expect(
      connector.getActiveContracts({
        parties: [...parties, "Party-extra::1220"],
      }),
    ).rejects.toThrow(/parties must not contain more than 100 items/i);
    await expect(
      connector.getActiveContracts({
        parties: ["Alice::1220"],
        templateIds: [...templateIds, "package:Module:Extra"],
      }),
    ).rejects.toThrow(/templateIds must not contain more than 100 items/i);
    await expect(
      connector.getActiveContracts({
        parties: ["Alice::1220"],
        interfaceIds: Array(MAX_FILTER_VALUES + 1).fill(
          "package:Module:Interface",
        ),
      }),
    ).rejects.toThrow(/interfaceIds must not contain more than 100 items/i);
    expect(sdk.ledger.acsReader.raw.readJsContracts).toHaveBeenCalledTimes(1);
  });

  test.each([
    {
      name: "an empty template filter",
      request: { parties: ["Alice::1220"], templateIds: [] },
      error: /templateIds must not be empty/i,
    },
    {
      name: "a blank interface filter",
      request: { parties: ["Alice::1220"], interfaceIds: [" "] },
      error: /interfaceIds/i,
    },
    {
      name: "a negative offset",
      request: { parties: ["Alice::1220"], offset: -1 },
      error: /offset must be a non-negative safe integer/i,
    },
    {
      name: "a fractional limit above the cap",
      request: { parties: ["Alice::1220"], limit: 1000.5 },
      error: /limit must be a positive integer/i,
    },
    {
      name: "template and interface filters together",
      request: {
        parties: ["Alice::1220"],
        templateIds: ["package:Module:Asset"],
        interfaceIds: ["package:Module:AssetInterface"],
      },
      error: /cannot combine templateIds and interfaceIds/i,
    },
  ])("rejects an ACS query with $name", async ({ request, error }) => {
    const create = jest.fn();
    const connector = createConnector({ create });

    await expect(connector.getActiveContracts(request)).rejects.toThrow(error);
    expect(create).not.toHaveBeenCalled();
  });

  test("maps ACS results to connector-owned API objects", async () => {
    const sdk = createSdkMock();
    jest.mocked(sdk.ledger.acsReader.raw.readJsContracts).mockResolvedValue([
      {
        contractId: "contract-1",
        templateId: "package:Module:Asset",
        createArgument: { owner: "Alice::1220" },
        witnessParties: ["Alice::1220"],
        signatories: ["Alice::1220"],
        observers: ["Observer::1220"],
        createdAt: "2026-10-02T00:00:00Z",
        synchronizerId: "synchronizer-1",
        offset: 9,
        packageName: "must-not-leak",
      },
    ]);
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    const response = await connector.getActiveContracts({
      parties: ["Alice::1220"],
    });

    expect(response).toEqual({
      contracts: [
        {
          contractId: "contract-1",
          templateId: "package:Module:Asset",
          createArgument: { owner: "Alice::1220" },
          witnessParties: ["Alice::1220"],
          signatories: ["Alice::1220"],
          observers: ["Observer::1220"],
          createdAt: "2026-10-02T00:00:00Z",
          synchronizerId: "synchronizer-1",
        },
      ],
    });
  });

  test("enforces the optional party allowlist for writes and reads", async () => {
    const sdk = createSdkMock();
    const connector = createConnector(
      { create: jest.fn().mockResolvedValue(sdk) },
      { allowedPartyIds: ["Alice::1220"] },
    );

    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Mallory::1220",
        commands: [{}] as CantonCommand[],
      }),
    ).rejects.toThrow(/party is not allowed/i);
    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        readAs: ["Mallory::1220"],
        commands: [{}] as CantonCommand[],
      }),
    ).rejects.toThrow(/party is not allowed/i);
    await expect(
      connector.getActiveContracts({ parties: ["Mallory::1220"] }),
    ).rejects.toThrow(/party is not allowed/i);
    expect(sdk.ledger.internal.submit).not.toHaveBeenCalled();
    expect(sdk.ledger.acsReader.raw.readJsContracts).not.toHaveBeenCalled();
  });

  test("filters listed parties through the optional party allowlist", async () => {
    const sdk = createSdkMock();
    jest
      .mocked(sdk.party.list)
      .mockResolvedValue(["Alice::1220", "Mallory::1220"]);
    const connector = createConnector(
      { create: jest.fn().mockResolvedValue(sdk) },
      { allowedPartyIds: ["Alice::1220"] },
    );

    await expect(connector.listParties()).resolves.toEqual({
      parties: ["Alice::1220"],
    });
  });

  test("times out a Wallet SDK operation at the configured deadline", async () => {
    jest.useFakeTimers();
    try {
      const sdk = createSdkMock();
      jest
        .mocked(sdk.ledger.internal.submit)
        .mockImplementation(() => new Promise(() => undefined));
      const connector = createConnector(
        { create: jest.fn().mockResolvedValue(sdk) },
        { operationTimeoutMs: 25 },
      );
      const result = connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        commands: [{}] as CantonCommand[],
      });
      const rejection = expect(result).rejects.toThrow(
        /exceeded 25 ms; the final transaction outcome is unknown/i,
      );

      await jest.advanceTimersByTimeAsync(25);
      await rejection;
    } finally {
      jest.useRealTimers();
    }
  });

  test("rejects an operation timeout above the supported maximum", () => {
    expect(() =>
      createConnector(
        { create: jest.fn() },
        { operationTimeoutMs: MAX_OPERATION_TIMEOUT_MS + 1 },
      ),
    ).toThrow(/operationTimeoutMs must be an integer between/i);
  });

  test("lists parties returned by the Wallet SDK", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await expect(connector.listParties()).resolves.toEqual({
      parties: ["Alice::1220"],
    });
  });

  test("retries Wallet SDK creation after a failed initialization", async () => {
    const sdk = createSdkMock();
    const create = jest
      .fn()
      .mockRejectedValueOnce(new Error("ledger unavailable"))
      .mockResolvedValueOnce(sdk);
    const connector = createConnector({ create });

    await expect(connector.listParties()).rejects.toThrow("ledger unavailable");
    await expect(connector.listParties()).resolves.toEqual({
      parties: ["Alice::1220"],
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  test("retries Wallet SDK creation after an initialization timeout", async () => {
    jest.useFakeTimers();
    try {
      const sdk = createSdkMock();
      const create = jest
        .fn()
        .mockImplementationOnce(() => new Promise(() => undefined))
        .mockResolvedValueOnce(sdk);
      const connector = createConnector({ create }, { operationTimeoutMs: 25 });
      const firstOperation = connector.listParties();
      const firstRejection = expect(firstOperation).rejects.toThrow(
        /Wallet SDK initialization exceeded 25 ms/i,
      );

      await jest.advanceTimersByTimeAsync(25);
      await firstRejection;
      await expect(connector.listParties()).resolves.toEqual({
        parties: ["Alice::1220"],
      });

      expect(create).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  test("reports authority consensus with transaction finality", async () => {
    const connector = createConnector({ create: jest.fn() });

    await expect(connector.getConsensusAlgorithmFamily()).resolves.toBe(
      ConsensusAlgorithmFamily.Authority,
    );
    await expect(connector.hasTransactionFinality()).resolves.toBe(true);
  });

  test("reports DAR deployment as explicitly unsupported", async () => {
    const connector = createConnector({ create: jest.fn() });

    await expect(connector.deployContract()).rejects.toThrow(
      "Canton DAR deployment is not supported by this connector version.",
    );
  });

  function createFactoryFixture() {
    const sdk = createSdkMock();
    const cactiLog = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
      warn: jest.fn(),
    };
    const captured: {
      sdkLog?: (
        level: "info",
        context: Record<string, unknown>,
        message?: string,
      ) => void;
      clientOptions?: {
        baseUrl: URL;
        logger: Record<string, (...args: unknown[]) => unknown>;
        accessTokenProvider: unknown;
      };
      authLogger?: Record<string, (...args: unknown[]) => unknown>;
      ledgerClient?: Record<string, jest.Mock>;
      tokenProvider?: { getAuthContext: jest.Mock; getAccessToken: jest.Mock };
    } = {};
    const sdkCreate = jest.fn().mockResolvedValue(sdk);
    const moduleLoader = async () => ({
      SDK: { create: sdkCreate },
      CustomLogAdapter: class {
        public constructor(logFunction: typeof captured.sdkLog) {
          captured.sdkLog = logFunction;
        }
      },
      LedgerClient: class {
        public readonly getWithRetry = jest.fn();
        public readonly postWithRetry = jest.fn();
        public readonly patchWithRetry = jest.fn();
        public constructor(options: typeof captured.clientOptions) {
          captured.clientOptions = options;
          captured.ledgerClient = this as never;
        }
      },
      AuthTokenProvider: class {
        public readonly getAccessToken = jest.fn();
        public readonly getAuthContext = jest.fn();
        public constructor(
          _config: unknown,
          logger: typeof captured.authLogger,
        ) {
          captured.authLogger = logger;
          captured.tokenProvider = this as never;
        }
      },
    });
    const factory = new CantonWalletSdkFactory(
      cactiLog as never,
      moduleLoader as never,
    );
    return { cactiLog, captured, factory, sdkCreate };
  }

  test("does not forward Wallet SDK context or messages to Cacti logs", async () => {
    const { cactiLog, captured, factory } = createFactoryFixture();

    await factory.create({
      auth,
      ledgerClientUrl: "http://127.0.0.1:7575",
    });
    expect(captured.sdkLog).toBeDefined();
    captured.sdkLog?.(
      "info",
      { clientSecret: "must-not-be-logged", response: { token: "secret" } },
      "Bearer another-secret",
    );

    expect(cactiLog.info).toHaveBeenCalledWith(
      "Canton Wallet SDK emitted a log entry.",
    );
    expect(JSON.stringify(cactiLog.info.mock.calls)).not.toContain("secret");
  });

  test("gives the ledger client and token provider a severity-only logger", async () => {
    const { cactiLog, captured, factory, sdkCreate } = createFactoryFixture();

    await factory.create({
      auth,
      ledgerClientUrl: "http://127.0.0.1:7575",
    });

    expect(captured.clientOptions?.baseUrl.href).toBe("http://127.0.0.1:7575/");
    expect(sdkCreate).toHaveBeenCalledWith(
      expect.objectContaining({ ledgerProvider: expect.anything() }),
    );
    expect(sdkCreate.mock.calls[0][0]).not.toHaveProperty("auth");
    const clientLogger = captured.clientOptions?.logger.child({
      component: "LedgerClient",
    }) as Record<string, (...args: unknown[]) => unknown>;
    clientLogger.warn("Error in postWithRetry for path /v2/commands");
    clientLogger.debug(JSON.stringify({ token: "must-not-leak" }));
    captured.authLogger?.error({ clientSecret: "must-not-leak" });

    expect(cactiLog.warn).toHaveBeenCalledWith(
      "Canton Wallet SDK emitted a log entry.",
    );
    expect(cactiLog.debug).toHaveBeenCalledWith(
      "Canton Wallet SDK emitted a log entry.",
    );
    expect(cactiLog.error).toHaveBeenCalledWith(
      "Canton Wallet SDK emitted a log entry.",
    );
    const allCalls = JSON.stringify(
      Object.values(cactiLog).map((fn) => fn.mock.calls),
    );
    expect(allCalls).not.toContain("must-not-leak");
    expect(allCalls).not.toContain("/v2/commands");
  });

  test("routes ledger API requests through the injected ledger client", async () => {
    const { captured, factory, sdkCreate } = createFactoryFixture();
    await factory.create({ auth, ledgerClientUrl: "http://127.0.0.1:7575" });
    const provider = sdkCreate.mock.calls[0][0].ledgerProvider as {
      request(args: unknown): Promise<unknown>;
    };
    const client = captured.ledgerClient as Record<string, jest.Mock>;
    client.getWithRetry.mockResolvedValue({ offset: 1 });
    client.postWithRetry.mockResolvedValue({ updateId: "u" });

    await expect(
      provider.request({
        method: "ledgerApi",
        params: {
          requestMethod: "get",
          resource: "/v2/state/ledger-end",
          query: {},
        },
      }),
    ).resolves.toEqual({ offset: 1 });
    await provider.request({
      method: "ledgerApi",
      params: {
        requestMethod: "post",
        resource: "/v2/commands/submit-and-wait",
        body: { commandId: "c" },
      },
    });

    expect(client.getWithRetry).toHaveBeenCalledWith(
      "/v2/state/ledger-end",
      undefined,
      { query: {} },
    );
    expect(client.postWithRetry).toHaveBeenCalledWith(
      "/v2/commands/submit-and-wait",
      { commandId: "c" },
      undefined,
      {},
      { headers: { "Content-Type": "application/json" } },
    );
    await expect(provider.request({ method: "unknown" })).rejects.toThrow(
      /Unsupported method/,
    );
  });

  test("falls back to the token's user ID when the ledger cannot resolve the user", async () => {
    const { captured, factory, sdkCreate } = createFactoryFixture();
    await factory.create({ auth, ledgerClientUrl: "http://127.0.0.1:7575" });
    const provider = sdkCreate.mock.calls[0][0].ledgerProvider as {
      request(args: unknown): Promise<unknown>;
    };
    const client = captured.ledgerClient as Record<string, jest.Mock>;
    client.getWithRetry.mockRejectedValue(
      Object.assign(new Error("unauthenticated"), {
        cause: "The submitted request is missing a user-id",
      }),
    );
    captured.tokenProvider?.getAuthContext.mockResolvedValue({
      userId: "ledger-api-user",
    });
    const authenticatedUserRequest = {
      method: "ledgerApi",
      params: {
        requestMethod: "get",
        resource: "/v2/authenticated-user",
        query: {},
      },
    };

    await expect(provider.request(authenticatedUserRequest)).resolves.toEqual({
      user: { id: "ledger-api-user" },
    });
    await expect(
      provider.request({
        ...authenticatedUserRequest,
        params: { ...authenticatedUserRequest.params, resource: "/v2/parties" },
      }),
    ).rejects.toThrow("unauthenticated");
  });

  test.each([
    { name: "missing", commandId: undefined },
    { name: "blank", commandId: " " },
    { name: "non-string", commandId: 7 },
  ])(
    "rejects a $name command ID before creating the Wallet SDK",
    async ({ commandId }) => {
      const create = jest.fn();
      const connector = createConnector({ create });

      await expect(
        connector.transact({
          partyId: "Alice::1220",
          commandId,
          commands: [
            {
              CreateCommand: {
                templateId: "package:Module:Asset",
                createArguments: {},
              },
            },
          ],
        } as never),
      ).rejects.toThrow(/commandId must not be blank/i);
      expect(create).not.toHaveBeenCalled();
    },
  );

  test("forwards the caller command ID unchanged so retries are deduplicated", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });
    const request = {
      partyId: "Alice::1220",
      commandId: "order-42-create",
      commands: [
        {
          CreateCommand: {
            templateId: "package:Module:Asset",
            createArguments: {},
          },
        },
      ],
    };

    await connector.transact(request);
    await connector.transact(request);

    const submittedIds = jest
      .mocked(sdk.ledger.internal.submit)
      .mock.calls.map(([submitRequest]) => submitRequest.commandId);
    expect(submittedIds).toEqual(["order-42-create", "order-42-create"]);
  });

  test.each([
    "https://ledger.example.com:7575",
    new URL("https://ledger.example.com/json-api"),
  ])("accepts the HTTPS ledger URL %s", (ledgerClientUrl) => {
    expect(
      () =>
        new PluginLedgerConnectorCanton({
          instanceId: "canton-connector-test",
          ledgerClientUrl,
          auth,
          pluginRegistry: {} as never,
        }),
    ).not.toThrow();
  });

  test.each([
    "http://localhost:7575",
    "http://127.0.0.1:7575",
    "http://127.1:7575",
    "http://[::1]:7575",
  ])(
    "accepts loopback HTTP %s only with the explicit development exception",
    (ledgerClientUrl) => {
      const options = {
        instanceId: "canton-connector-test",
        ledgerClientUrl,
        auth,
        pluginRegistry: {} as never,
      };

      expect(() => new PluginLedgerConnectorCanton(options)).toThrow(
        /must use https:/i,
      );
      expect(
        () =>
          new PluginLedgerConnectorCanton({
            ...options,
            allowInsecureLoopbackHttp: true,
          }),
      ).not.toThrow();
    },
  );

  test.each([
    {
      name: "remote plaintext HTTP",
      url: "http://ledger.example.com:7575",
      error: /must use https:/i,
    },
    {
      name: "a loopback-looking remote host",
      url: "http://127.0.0.1.example.com:7575",
      error: /must use https:/i,
    },
    {
      name: "an unsupported protocol",
      url: "ftp://127.0.0.1:7575",
      error: /must use https:/i,
    },
    {
      name: "embedded credentials",
      url: "https://user:secret@ledger.example.com",
      error: /must not embed credentials/i,
    },
    {
      name: "a relative URL",
      url: "/json-api",
      error: /must be an absolute URL/i,
    },
  ])("rejects a ledger URL with $name", ({ url, error }) => {
    expect(
      () =>
        new PluginLedgerConnectorCanton({
          instanceId: "canton-connector-test",
          ledgerClientUrl: url,
          allowInsecureLoopbackHttp: true,
          auth,
          pluginRegistry: {} as never,
        }),
    ).toThrow(error);
  });

  test("does not echo URL credentials in the validation error", () => {
    let message = "";
    try {
      new PluginLedgerConnectorCanton({
        instanceId: "canton-connector-test",
        ledgerClientUrl: "https://user:must-not-leak@ledger.example.com",
        auth,
        pluginRegistry: {} as never,
      });
    } catch (error: unknown) {
      message = String((error as Error).message);
    }

    expect(message).toMatch(/must not embed credentials/i);
    expect(message).not.toContain("must-not-leak");
  });

  test("queries the ACS once for a parties-only request", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await connector.getActiveContracts({
      parties: ["Alice::1220", "Bob::1220"],
    });

    expect(sdk.ledger.acsReader.raw.readJsContracts).toHaveBeenCalledTimes(1);
    expect(sdk.ledger.acsReader.raw.readJsContracts).toHaveBeenCalledWith({
      parties: ["Alice::1220", "Bob::1220"],
      filterByParty: true,
      templateIds: undefined,
      interfaceIds: undefined,
      offset: undefined,
      limit: 100,
    });
  });

  test("forwards each request limit and never returns more contracts", async () => {
    const sdk = createSdkMock();
    const contract = {
      contractId: "contract-1",
      templateId: "package:Module:Asset",
      createArgument: {},
      witnessParties: ["Alice::1220"],
      signatories: ["Alice::1220"],
      createdAt: "2026-10-02T00:00:00Z",
      synchronizerId: "synchronizer-1",
    };
    jest.mocked(sdk.ledger.acsReader.raw.readJsContracts).mockResolvedValue(
      Array.from({ length: 5 }, (_value, index) => ({
        ...contract,
        contractId: `contract-${index}`,
      })),
    );
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    const first = await connector.getActiveContracts({
      parties: ["Alice::1220"],
      limit: 1,
    });
    const second = await connector.getActiveContracts({
      parties: ["Alice::1220"],
      limit: 3,
    });

    expect(first.contracts).toHaveLength(1);
    expect(second.contracts).toHaveLength(3);
    expect(
      jest
        .mocked(sdk.ledger.acsReader.raw.readJsContracts)
        .mock.calls.map(([request]) => request.limit),
    ).toEqual([1, 3]);
  });

  test("rejects work beyond the in-flight limit until abandoned operations settle", async () => {
    jest.useFakeTimers();
    try {
      const sdk = createSdkMock();
      const pending: Array<(parties: string[]) => void> = [];
      jest.mocked(sdk.party.list).mockImplementation(
        () =>
          new Promise<string[]>((resolve) => {
            pending.push(resolve);
          }),
      );
      const connector = createConnector(
        { create: jest.fn().mockResolvedValue(sdk) },
        { operationTimeoutMs: 25, maxInFlightOperations: 2 },
      );

      const timedOut = [connector.listParties(), connector.listParties()];
      const rejections = timedOut.map((operation) =>
        expect(operation).rejects.toMatchObject({ statusCode: 504 }),
      );
      await jest.advanceTimersByTimeAsync(25);
      await Promise.all(rejections);
      expect(pending).toHaveLength(2);

      // Both callers gave up, but the upstream calls are still running and
      // keep their slots.
      await expect(connector.listParties()).rejects.toMatchObject({
        statusCode: 503,
        message: expect.stringMatching(/too many pending ledger operations/i),
      });
      expect(sdk.party.list).toHaveBeenCalledTimes(2);

      pending[0](["Alice::1220"]);
      await jest.advanceTimersByTimeAsync(0);
      const next = connector.listParties();
      await jest.advanceTimersByTimeAsync(0);
      pending[2](["Alice::1220"]);
      await expect(next).resolves.toEqual({ parties: ["Alice::1220"] });
    } finally {
      jest.useRealTimers();
    }
  });

  test("counts a timed-out SDK initialization against the in-flight limit", async () => {
    jest.useFakeTimers();
    try {
      const create = jest.fn(
        () => new Promise<ICantonWalletSdk>(() => undefined),
      );
      const connector = createConnector(
        { create },
        { operationTimeoutMs: 25, maxInFlightOperations: 1 },
      );
      const first = connector.listParties();
      const firstRejection = expect(first).rejects.toMatchObject({
        statusCode: 504,
      });
      await jest.advanceTimersByTimeAsync(25);
      await firstRejection;

      await expect(connector.listParties()).rejects.toMatchObject({
        statusCode: 503,
      });
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test("rejects an in-flight operation limit outside the supported range", () => {
    for (const maxInFlightOperations of [
      0,
      MAX_IN_FLIGHT_OPERATIONS + 1,
      1.5,
    ]) {
      expect(() =>
        createConnector({ create: jest.fn() }, { maxInFlightOperations }),
      ).toThrow(/maxInFlightOperations must be an integer between/i);
    }
  });
});
