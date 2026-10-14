import { PluginLedgerConnectorCanton } from "../../../main/typescript/plugin-ledger-connector-canton";
import {
  auth,
  VALID_COMMAND,
  createSdkMock,
  createConnector,
} from "../canton-test-utilities";

jest.setTimeout(30_000);

describe("Canton connector: party-policy", () => {
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
        commands: [VALID_COMMAND],
      }),
    ).rejects.toThrow(/party is not allowed/i);
    await expect(
      connector.transact({
        commandId: "command-1",
        partyId: "Alice::1220",
        readAs: ["Mallory::1220"],
        commands: [VALID_COMMAND],
      }),
    ).rejects.toThrow(/party is not allowed/i);
    await expect(
      connector.getActiveContracts({ parties: ["Mallory::1220"] }),
    ).rejects.toThrow(/party is not allowed/i);
    expect(sdk.ledger.internal.submit).not.toHaveBeenCalled();
    expect(sdk.ledger.acsReader.raw.read).not.toHaveBeenCalled();
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

  test("lists parties returned by the Wallet SDK", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await expect(connector.listParties()).resolves.toEqual({
      parties: ["Alice::1220"],
    });
  });

  describe("party policy", () => {
    const baseOptions = {
      instanceId: "canton-connector-test",
      ledgerClientUrl: "https://ledger.example.com",
      auth,
      pluginRegistry: {} as never,
    };

    test("requires an explicit party policy", () => {
      expect(() => new PluginLedgerConnectorCanton(baseOptions)).toThrow(
        /set exactly one of options.allowedPartyIds and options.allowAllParties/,
      );
      expect(
        () =>
          new PluginLedgerConnectorCanton({
            ...baseOptions,
            allowAllParties: true,
            allowedPartyIds: ["Alice::1220"],
          }),
      ).toThrow(/set exactly one of/);
      expect(
        () =>
          new PluginLedgerConnectorCanton({
            ...baseOptions,
            allowedPartyIds: [" "],
          }),
      ).toThrow(/allowedPartyIds must be an array of non-blank party IDs/);
    });

    test("an empty allowlist denies every party", async () => {
      const sdk = createSdkMock();
      const connector = createConnector(
        { create: jest.fn().mockResolvedValue(sdk) },
        { allowedPartyIds: [] },
      );

      await expect(
        connector.getActiveContracts({ parties: ["Alice::1220"] }),
      ).rejects.toMatchObject({ statusCode: 403 });
      await expect(connector.listParties()).resolves.toEqual({ parties: [] });
    });

    test("reports configuration mistakes as plain errors, not HTTP 400", () => {
      let thrown: unknown;
      try {
        createConnector({ create: jest.fn() }, { operationTimeoutMs: 0 });
      } catch (error: unknown) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).not.toHaveProperty("statusCode");
    });
  });
});
