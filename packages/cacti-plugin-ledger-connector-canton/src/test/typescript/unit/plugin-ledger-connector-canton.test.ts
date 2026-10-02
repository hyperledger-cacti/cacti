import {
  MAX_COMMANDS_PER_TRANSACTION,
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
        readJsContracts: jest.fn().mockResolvedValue([]),
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
  } = {},
): PluginLedgerConnectorCanton {
  return new PluginLedgerConnectorCanton({
    instanceId: "canton-connector-test",
    ledgerClientUrl: "http://127.0.0.1:7575",
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

  test("clears cached endpoints and Wallet SDK state on shutdown", async () => {
    const sdk = createSdkMock();
    const create = jest.fn().mockResolvedValue(sdk);
    const connector = createConnector({ create });
    const endpointsBefore = await connector.getOrCreateWebServices();
    await connector.listParties();

    await connector.shutdown();
    const endpointsAfter = await connector.getOrCreateWebServices();
    await connector.listParties();

    expect(endpointsAfter).not.toBe(endpointsBefore);
    expect(create).toHaveBeenCalledTimes(2);
  });

  test("a stale SDK initialization failure cannot clear newer SDK state", async () => {
    const sdk = createSdkMock();
    let rejectFirst: ((reason: Error) => void) | undefined;
    const create = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ICantonWalletSdk>((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValue(sdk);
    const connector = createConnector({ create });
    const firstOperation = connector.listParties();
    const firstRejection = expect(firstOperation).rejects.toThrow(
      "stale initialization",
    );

    await connector.shutdown();
    await expect(connector.listParties()).resolves.toEqual({
      parties: ["Alice::1220"],
    });
    rejectFirst?.(new Error("stale initialization"));
    await firstRejection;
    await expect(connector.listParties()).resolves.toEqual({
      parties: ["Alice::1220"],
    });

    expect(create).toHaveBeenCalledTimes(2);
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
      connector.transact({ partyId: "Alice::1220", commands: [] }),
    ).rejects.toThrow(/commands must not be empty/i);

    expect(create).not.toHaveBeenCalled();
  });

  test("rejects missing commands with a stable validation error", async () => {
    const create = jest.fn();
    const connector = createConnector({ create });

    await expect(
      connector.transact({ partyId: "Alice::1220" } as never),
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
        partyId: "Alice::1220",
        commands: Array(MAX_COMMANDS_PER_TRANSACTION).fill(command),
      }),
    ).resolves.toEqual({ updateId: "update-1", completionOffset: 42 });
    await expect(
      connector.transact({
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
      partyId: "Alice::1220",
      commands: [command],
      readAs: Array.from(
        { length: MAX_FILTER_VALUES },
        (_value, index) => `Reader-${index}::1220`,
      ),
    });
    await expect(
      connector.transact({
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
      partyId: "p".repeat(MAX_IDENTIFIER_LENGTH),
      commands: [command],
    });
    await expect(
      connector.transact({
        partyId: "p".repeat(MAX_IDENTIFIER_LENGTH + 1),
        commands: [command],
      }),
    ).rejects.toThrow(/partyId must not exceed 1024 characters/i);
    await expect(
      connector.transact({
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
      partyId: "Alice::1220",
      commands: createCommandWithSerializedSize(MAX_TRANSACTION_PAYLOAD_BYTES),
    });
    await expect(
      connector.transact({
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
      partyId: "Alice::1220",
      commands: [createCommandWithPayloadNesting(60)],
    });
    await expect(
      connector.transact({
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
      request: { partyId: "Alice::1220", commands: [null] },
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

    expect(sdk.ledger.acsReader.readJsContracts).toHaveBeenCalledWith({
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

    expect(sdk.ledger.acsReader.readJsContracts).toHaveBeenCalledWith(
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
    expect(sdk.ledger.acsReader.readJsContracts).toHaveBeenCalledTimes(1);
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
    jest.mocked(sdk.ledger.acsReader.readJsContracts).mockResolvedValue([
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
        partyId: "Mallory::1220",
        commands: [{}] as CantonCommand[],
      }),
    ).rejects.toThrow(/party is not allowed/i);
    await expect(
      connector.transact({
        partyId: "Alice::1220",
        readAs: ["Mallory::1220"],
        commands: [{}] as CantonCommand[],
      }),
    ).rejects.toThrow(/party is not allowed/i);
    await expect(
      connector.getActiveContracts({ parties: ["Mallory::1220"] }),
    ).rejects.toThrow(/party is not allowed/i);
    expect(sdk.ledger.internal.submit).not.toHaveBeenCalled();
    expect(sdk.ledger.acsReader.readJsContracts).not.toHaveBeenCalled();
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

  test("does not forward Wallet SDK context or messages to Cacti logs", async () => {
    const sdk = createSdkMock();
    const info = jest.fn();
    let sdkLog:
      | ((
          level: "info",
          context: Record<string, unknown>,
          message?: string,
        ) => void)
      | undefined;
    const moduleLoader = () => ({
      SDK: { create: jest.fn().mockResolvedValue(sdk) },
      CustomLogAdapter: class {
        public constructor(logFunction: typeof sdkLog) {
          sdkLog = logFunction;
        }
      },
    });
    const factory = new CantonWalletSdkFactory(
      {
        debug: jest.fn(),
        error: jest.fn(),
        info,
        trace: jest.fn(),
        warn: jest.fn(),
      } as never,
      moduleLoader,
    );

    await factory.create({
      auth,
      ledgerClientUrl: "http://127.0.0.1:7575",
    });
    expect(sdkLog).toBeDefined();
    sdkLog?.(
      "info",
      { clientSecret: "must-not-be-logged", response: { token: "secret" } },
      "Bearer another-secret",
    );

    expect(info).toHaveBeenCalledWith("Canton Wallet SDK emitted a log entry.");
    expect(JSON.stringify(info.mock.calls)).not.toContain("secret");
  });
});
