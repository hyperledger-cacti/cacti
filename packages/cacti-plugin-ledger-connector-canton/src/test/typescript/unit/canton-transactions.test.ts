import {
  MAX_COMMANDS_PER_TRANSACTION,
  MAX_FILTER_VALUES,
  MAX_IDENTIFIER_LENGTH,
  MAX_TRANSACTION_PAYLOAD_BYTES,
} from "../../../main/typescript/plugin-ledger-connector-canton";
import type { ICantonWalletSdk } from "../../../main/typescript/canton-wallet-sdk";
import type { CantonCommand } from "../../../main/typescript/generated/openapi/typescript-axios";
import {
  VALID_COMMAND,
  createSdkMock,
  createConnector,
  createCommandWithSerializedSize,
  createCommandWithPayloadNesting,
} from "../canton-test-utilities";

jest.setTimeout(30_000);

describe("Canton connector: transactions", () => {
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

  test("submits an immutable snapshot when the caller mutates a validated transaction", async () => {
    const sdk = createSdkMock();
    let resolveSdk: ((sdk: ICantonWalletSdk) => void) | undefined;
    const create = jest.fn(
      () =>
        new Promise<ICantonWalletSdk>((resolve) => {
          resolveSdk = resolve;
        }),
    );
    const connector = createConnector(
      { create },
      { allowedPartyIds: ["Alice::1220", "Observer::1220"] },
    );
    const command = {
      CreateCommand: {
        templateId: "package:Module:Asset",
        createArguments: { owner: "Alice::1220" },
      },
    };
    const request = {
      partyId: "Alice::1220",
      commands: [command],
      readAs: ["Observer::1220"],
      commandId: "command-1",
      synchronizerId: "synchronizer-1",
    };

    const result = connector.transact(request);
    request.partyId = "Mallory::1220";
    request.readAs[0] = "Mallory::1220";
    request.commandId = "mutated-command";
    request.synchronizerId = "mutated-synchronizer";
    command.CreateCommand.createArguments.owner = "Mallory::1220";
    await new Promise((resolve) => setImmediate(resolve));
    resolveSdk?.(sdk);
    await result;

    expect(sdk.ledger.internal.submit).toHaveBeenCalledWith({
      actAs: ["Alice::1220"],
      commands: [
        {
          CreateCommand: {
            templateId: "package:Module:Asset",
            createArguments: { owner: "Alice::1220" },
          },
        },
      ],
      readAs: ["Observer::1220"],
      commandId: "command-1",
      synchronizerId: "synchronizer-1",
    });
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

  test("reports DAR deployment as explicitly unsupported", async () => {
    const connector = createConnector({ create: jest.fn() });

    await expect(connector.deployContract()).rejects.toThrow(
      "Canton DAR deployment is not supported by this connector version.",
    );
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

  describe("transaction request hardening", () => {
    test("checks the party allowlist before inspecting the command payload", async () => {
      const sdk = createSdkMock();
      const connector = createConnector(
        { create: jest.fn().mockResolvedValue(sdk) },
        { allowedPartyIds: ["Alice::1220"] },
      );
      const inspectPayload = jest.fn(() => {
        throw new Error("Unauthorized payload must not be inspected");
      });
      const createArguments = Object.defineProperty({}, "payload", {
        enumerable: true,
        get: inspectPayload,
      });

      await expect(
        connector.transact({
          partyId: "Mallory::1220",
          commandId: "command-1",
          commands: [
            {
              CreateCommand: {
                templateId: "package:Module:Asset",
                createArguments,
              },
            },
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(inspectPayload).not.toHaveBeenCalled();
      expect(sdk.ledger.internal.submit).not.toHaveBeenCalled();
    });

    test("rejects an oversized payload without walking all of it", async () => {
      const sdk = createSdkMock();
      const connector = createConnector({
        create: jest.fn().mockResolvedValue(sdk),
      });
      const hugePayload = new Array(MAX_TRANSACTION_PAYLOAD_BYTES + 1);
      const inspectElement = jest.fn(() => {
        throw new Error("An oversized array must not be traversed");
      });
      Object.defineProperty(hugePayload, hugePayload.length - 1, {
        get: inspectElement,
      });

      await expect(
        connector.transact({
          partyId: "Alice::1220",
          commandId: "command-1",
          commands: [
            {
              CreateCommand: {
                templateId: "package:Module:Asset",
                createArguments: { hugePayload },
              },
            },
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 413 });
      expect(inspectElement).not.toHaveBeenCalled();
      expect(sdk.ledger.internal.submit).not.toHaveBeenCalled();
    });

    test.each([null, "", false, 0, "Alice::1220"])(
      "rejects readAs=%p with a 400",
      async (readAs) => {
        const create = jest.fn();
        const connector = createConnector({ create });

        await expect(
          connector.transact({
            partyId: "Alice::1220",
            commandId: "command-1",
            readAs,
            commands: [VALID_COMMAND],
          } as never),
        ).rejects.toMatchObject({ statusCode: 400 });
        expect(create).not.toHaveBeenCalled();
      },
    );

    test.each([
      { name: "an array command", command: [1], error: /must be an object/ },
      { name: "an empty command", command: {}, error: /exactly one of/ },
      {
        name: "two command variants",
        command: {
          CreateCommand: (VALID_COMMAND as { CreateCommand: unknown })
            .CreateCommand,
          ExerciseCommand: {},
        },
        error: /exactly one of/,
      },
      {
        name: "an unknown command variant",
        command: { ArchiveCommand: {} },
        error: /exactly one of/,
      },
      {
        name: "an exercise without a contract ID",
        command: {
          ExerciseCommand: {
            templateId: "package:Module:Asset",
            choice: "Archive",
            choiceArgument: {},
          },
        },
        error: /ExerciseCommand.contractId must not be blank/,
      },
      {
        name: "an exercise without a choice argument",
        command: {
          ExerciseCommand: {
            templateId: "package:Module:Asset",
            contractId: "contract-1",
            choice: "Archive",
          },
        },
        error: /choiceArgument is required/,
      },
      {
        name: "a create without create arguments",
        command: { CreateCommand: { templateId: "package:Module:Asset" } },
        error: /createArguments must be an object/,
      },
    ])(
      "rejects $name before calling the ledger",
      async ({ command, error }) => {
        const create = jest.fn();
        const connector = createConnector({ create });

        await expect(
          connector.transact({
            partyId: "Alice::1220",
            commandId: "command-1",
            commands: [command],
          } as never),
        ).rejects.toThrow(error);
        expect(create).not.toHaveBeenCalled();
      },
    );

    test("accepts null Daml values such as an empty Optional", async () => {
      const sdk = createSdkMock();
      const connector = createConnector({
        create: jest.fn().mockResolvedValue(sdk),
      });

      await connector.transact({
        partyId: "Alice::1220",
        commandId: "command-1",
        commands: [
          {
            ExerciseCommand: {
              templateId: "package:Module:Asset",
              contractId: "contract-1",
              choice: "Update",
              choiceArgument: { note: null, tags: [null] },
            },
          },
        ],
      });

      expect(sdk.ledger.internal.submit).toHaveBeenCalledTimes(1);
    });
  });
});
