import {
  DEFAULT_MAX_ACTIVE_CONTRACT_LIMIT,
  MAX_ACTIVE_CONTRACT_LIMIT,
  MAX_FILTER_VALUES,
} from "../../../main/typescript/plugin-ledger-connector-canton";
import type { ICantonWalletSdk } from "../../../main/typescript/canton-wallet-sdk";
import {
  toAcsEntry,
  createSdkMock,
  createConnector,
} from "../canton-test-utilities";

jest.setTimeout(30_000);

describe("Canton connector: active-contracts", () => {
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

    expect(sdk.ledger.acsReader.raw.read).toHaveBeenCalledWith({
      parties: ["Alice::1220"],
      filterByParty: true,
      templateIds: ["package:Module:Asset"],
      interfaceIds: undefined,
      offset: 7,
      limit: 100,
    });
    // An explicit offset is used as-is, without a ledger-end query.
    expect(sdk.ledger.ledgerEnd).not.toHaveBeenCalled();
  });

  test("reads an immutable snapshot when the caller mutates validated ACS filters", async () => {
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
      { allowedPartyIds: ["Alice::1220"] },
    );
    const request = {
      parties: ["Alice::1220"],
      templateIds: ["package:Module:Asset"],
      offset: 7,
      limit: 25,
    };

    const result = connector.getActiveContracts(request);
    request.parties[0] = "Mallory::1220";
    request.templateIds[0] = "package:Module:Secret";
    request.offset = 99;
    request.limit = 1;
    await new Promise((resolve) => setImmediate(resolve));
    resolveSdk?.(sdk);
    await result;

    expect(sdk.ledger.acsReader.raw.read).toHaveBeenCalledWith({
      parties: ["Alice::1220"],
      filterByParty: true,
      templateIds: ["package:Module:Asset"],
      interfaceIds: undefined,
      offset: 7,
      limit: 25,
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

    expect(sdk.ledger.acsReader.raw.read).toHaveBeenCalledWith(
      expect.objectContaining({
        templateIds: undefined,
        interfaceIds: ["package:Module:AssetInterface"],
      }),
    );
  });

  test("caps ACS limits at Canton's default list limit unless configured", async () => {
    const create = jest.fn();
    const connector = createConnector({ create });

    await expect(
      connector.getActiveContracts({
        parties: ["Alice::1220"],
        limit: DEFAULT_MAX_ACTIVE_CONTRACT_LIMIT + 1,
      }),
    ).rejects.toThrow(/limit must not exceed 200/i);
    expect(create).not.toHaveBeenCalled();

    const sdk = createSdkMock();
    const configured = createConnector(
      { create: jest.fn().mockResolvedValue(sdk) },
      { maxActiveContractLimit: 500 },
    );
    await configured.getActiveContracts({
      parties: ["Alice::1220"],
      limit: 500,
    });
    await expect(
      configured.getActiveContracts({ parties: ["Alice::1220"], limit: 501 }),
    ).rejects.toThrow(/limit must not exceed 500/i);
    expect(() =>
      createConnector(
        { create: jest.fn() },
        { maxActiveContractLimit: MAX_ACTIVE_CONTRACT_LIMIT + 1 },
      ),
    ).toThrow(/maxActiveContractLimit must be an integer between 1 and 1000/);
  });

  test("defaults an omitted ACS limit to a configured lower maximum", async () => {
    const sdk = createSdkMock();
    const connector = createConnector(
      { create: jest.fn().mockResolvedValue(sdk) },
      { maxActiveContractLimit: 50 },
    );

    await connector.getActiveContracts({ parties: ["Alice::1220"] });

    expect(sdk.ledger.acsReader.raw.read).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 }),
    );
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
    expect(sdk.ledger.acsReader.raw.read).toHaveBeenCalledTimes(1);
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
    ...([null, false, 0, ""] as const).flatMap((value) => [
      {
        name: `a non-array template filter (${JSON.stringify(value)})`,
        request: {
          parties: ["Alice::1220"],
          templateIds: value as never,
        },
        error: /templateIds must be an array/i,
      },
      {
        name: `a non-array interface filter (${JSON.stringify(value)})`,
        request: {
          parties: ["Alice::1220"],
          interfaceIds: value as never,
        },
        error: /interfaceIds must be an array/i,
      },
    ]),
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
    ...([null, false, "100"] as const).map((value) => ({
      name: `a non-integer limit (${JSON.stringify(value)})`,
      request: { parties: ["Alice::1220"], limit: value as never },
      error: /limit must be a positive integer/i,
    })),
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
    jest.mocked(sdk.ledger.acsReader.raw.read).mockResolvedValue([
      toAcsEntry({
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
        createdEventBlob: "must-not-leak",
      }),
      // Incomplete reassignments are not active contracts.
      { contractEntry: { JsIncompleteUnassigned: {} } } as never,
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
          interfaceViews: undefined,
        },
      ],
      activeAtOffset: 10,
      limitReached: false,
    });
  });

  test("queries the ACS once for a parties-only request", async () => {
    const sdk = createSdkMock();
    const connector = createConnector({
      create: jest.fn().mockResolvedValue(sdk),
    });

    await connector.getActiveContracts({
      parties: ["Alice::1220", "Bob::1220"],
    });

    expect(sdk.ledger.ledgerEnd).toHaveBeenCalledTimes(1);
    expect(sdk.ledger.acsReader.raw.read).toHaveBeenCalledTimes(1);
    expect(sdk.ledger.acsReader.raw.read).toHaveBeenCalledWith({
      parties: ["Alice::1220", "Bob::1220"],
      filterByParty: true,
      templateIds: undefined,
      interfaceIds: undefined,
      offset: 10,
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
    jest
      .mocked(sdk.ledger.acsReader.raw.read)
      .mockResolvedValue(
        Array.from({ length: 5 }, (_value, index) =>
          toAcsEntry({ ...contract, contractId: `contract-${index}` }),
        ),
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
    expect(first.limitReached).toBe(true);
    expect(second.contracts).toHaveLength(3);
    expect(second.limitReached).toBe(true);
    expect(
      jest
        .mocked(sdk.ledger.acsReader.raw.read)
        .mock.calls.map(([request]) => request.limit),
    ).toEqual([1, 3]);
  });

  describe("active-contract results", () => {
    test("returns interface views and drops the created-event blob", async () => {
      const sdk = createSdkMock();
      jest.mocked(sdk.ledger.acsReader.raw.read).mockResolvedValue([
        toAcsEntry({
          contractId: "contract-1",
          templateId: "package:Module:Asset",
          createArgument: { owner: "Alice::1220" },
          witnessParties: ["Alice::1220"],
          signatories: ["Alice::1220"],
          createdAt: "2026-10-02T00:00:00Z",
          synchronizerId: "synchronizer-1",
          createdEventBlob: "must-not-leak",
          interfaceViews: [
            {
              interfaceId: "package:Module:Holding",
              viewStatus: { code: 0, message: "", details: ["must-not-leak"] },
              viewValue: { amount: "10.0" },
              implementationPackageId: "must-not-leak",
            },
          ],
        }),
      ]);
      const connector = createConnector({
        create: jest.fn().mockResolvedValue(sdk),
      });

      const response = await connector.getActiveContracts({
        parties: ["Alice::1220"],
        interfaceIds: ["package:Module:Holding"],
      });

      expect(response.contracts[0].interfaceViews).toEqual([
        {
          interfaceId: "package:Module:Holding",
          viewStatus: { code: 0, message: "" },
          viewValue: { amount: "10.0" },
        },
      ]);
      expect(JSON.stringify(response)).not.toContain("must-not-leak");
    });

    test("reports a reached limit even when incomplete reassignments fill it", async () => {
      const sdk = createSdkMock();
      jest
        .mocked(sdk.ledger.acsReader.raw.read)
        .mockResolvedValue([
          { contractEntry: { JsIncompleteAssigned: {} } } as never,
          { contractEntry: { JsIncompleteUnassigned: {} } } as never,
        ]);
      const connector = createConnector({
        create: jest.fn().mockResolvedValue(sdk),
      });

      const response = await connector.getActiveContracts({
        parties: ["Alice::1220"],
        limit: 2,
      });

      expect(response).toEqual({
        contracts: [],
        activeAtOffset: 10,
        limitReached: true,
      });
    });
  });
});
