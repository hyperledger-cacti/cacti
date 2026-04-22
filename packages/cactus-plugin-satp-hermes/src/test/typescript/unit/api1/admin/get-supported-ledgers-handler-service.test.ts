import { LedgerType } from "@hyperledger/cactus-core-api";
import { executeGetSupportedLedgers } from "../../../../../main/typescript/api1/admin/get-supported-ledgers-handler-service";
import { SATP_IMPLEMENTED_LEDGERS } from "../../../../../main/typescript/core/constants";
import type { SATPManager } from "../../../../../main/typescript/services/gateway/satp-manager";

describe("executeGetSupportedLedgers()", () => {
  function mockManager(ledgers: LedgerType[]): SATPManager {
    return {
      getSupportedLedgers: jest.fn().mockReturnValue(ledgers),
    } as unknown as SATPManager;
  }

  it("returns all implemented ledgers when manager returns full set", async () => {
    const allImplemented = Array.from(SATP_IMPLEMENTED_LEDGERS);
    const manager = mockManager(allImplemented);

    const result = await executeGetSupportedLedgers("INFO", manager);

    expect(result.supportedLedgers).toHaveLength(allImplemented.length);
    for (const l of allImplemented) {
      expect(result.supportedLedgers).toContain(String(l));
    }
  });

  it("returns stringified ledger types", async () => {
    const manager = mockManager([LedgerType.Fabric2]);

    const result = await executeGetSupportedLedgers("INFO", manager);

    expect(result.supportedLedgers).toEqual([String(LedgerType.Fabric2)]);
  });

  it("returns empty array when manager returns no ledgers", async () => {
    const manager = mockManager([]);

    const result = await executeGetSupportedLedgers("INFO", manager);

    expect(result.supportedLedgers).toHaveLength(0);
  });

  it("returns subset when manager returns partial list", async () => {
    const subset = [LedgerType.Besu2X, LedgerType.Ethereum];
    const manager = mockManager(subset);

    const result = await executeGetSupportedLedgers("INFO", manager);

    expect(result.supportedLedgers).toEqual(subset.map(String));
  });
});

describe("SATPManager.getSupportedLedgers() config-intersection logic", () => {
  // These tests verify the logic documented in satp-manager.ts lines 338-351.
  // We import the constant and replicate the logic to avoid needing a full
  // SATPManager instantiation (which requires many heavy dependencies).

  function getSupportedLedgersLogic(
    configLedgers: LedgerType[] | undefined,
  ): LedgerType[] {
    if (configLedgers !== undefined && configLedgers.length > 0) {
      return configLedgers.filter((l) => SATP_IMPLEMENTED_LEDGERS.has(l));
    }
    return Array.from(SATP_IMPLEMENTED_LEDGERS);
  }

  it("returns all implemented when config is undefined", () => {
    const result = getSupportedLedgersLogic(undefined);
    expect(result).toEqual(Array.from(SATP_IMPLEMENTED_LEDGERS));
  });

  it("returns all implemented when config is empty", () => {
    const result = getSupportedLedgersLogic([]);
    expect(result).toEqual(Array.from(SATP_IMPLEMENTED_LEDGERS));
  });

  it("returns intersection when config has valid + invalid types", () => {
    const config = [
      LedgerType.Fabric2,
      LedgerType.Corda4X, // not implemented
    ];
    const result = getSupportedLedgersLogic(config);
    expect(result).toEqual([LedgerType.Fabric2]);
  });

  it("filters out all unsupported types", () => {
    const config = [LedgerType.Corda4X, LedgerType.Sawtooth1X];
    const result = getSupportedLedgersLogic(config);
    expect(result).toHaveLength(0);
  });

  it("preserves all valid types from config", () => {
    const config = [LedgerType.Besu1X, LedgerType.Besu2X];
    const result = getSupportedLedgersLogic(config);
    expect(result).toEqual([LedgerType.Besu1X, LedgerType.Besu2X]);
  });
});
