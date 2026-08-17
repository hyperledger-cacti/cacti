import { describe, expect, it } from "@jest/globals";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { SATPBridgeExecutionLayerImpl } from "../../../main/typescript/cross-chain-mechanisms/bridge/satp-bridge-execution-layer-implementation";
import { OracleExecutionLayer } from "../../../main/typescript/cross-chain-mechanisms/oracle/oracle-execution-layer";
import { ClaimFormatError } from "../../../main/typescript/cross-chain-mechanisms/common/errors";
import { BridgeLeaf } from "../../../main/typescript/cross-chain-mechanisms/bridge/bridge-leaf";
import { OracleAbstract } from "../../../main/typescript/cross-chain-mechanisms/oracle/oracle-abstract";
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});

function makeLeaf(supportedFormats: ClaimFormat[]): BridgeLeaf {
  return {
    getSupportedClaimFormats: () => supportedFormats,
  } as unknown as BridgeLeaf;
}

function makeOracle(supportedFormats: ClaimFormat[]): OracleAbstract {
  return {
    getSupportedClaimFormats: () => supportedFormats,
  } as unknown as OracleAbstract;
}

describe("SATPBridgeExecutionLayerImpl claim format validation", () => {
  it("constructs successfully when claim format is in supported list", () => {
    const leaf = makeLeaf([ClaimFormat.DEFAULT]);
    expect(
      () =>
        new SATPBridgeExecutionLayerImpl({
          leafBridge: leaf,
          claimType: ClaimFormat.DEFAULT,
          monitorService,
        }),
    ).not.toThrow();
  });

  it("defaults to ClaimFormat.DEFAULT and constructs when DEFAULT is supported", () => {
    const leaf = makeLeaf([ClaimFormat.DEFAULT]);
    expect(
      () =>
        new SATPBridgeExecutionLayerImpl({
          leafBridge: leaf,
          monitorService,
        }),
    ).not.toThrow();
  });

  it("throws ClaimFormatError when claim format is not in supported list", () => {
    const leaf = makeLeaf([ClaimFormat.DEFAULT]);
    expect(
      () =>
        new SATPBridgeExecutionLayerImpl({
          leafBridge: leaf,
          claimType: ClaimFormat.BUNGEE,
          monitorService,
        }),
    ).toThrow(ClaimFormatError);
  });

  it("throws ClaimFormatError when supported list is empty", () => {
    const leaf = makeLeaf([]);
    expect(
      () =>
        new SATPBridgeExecutionLayerImpl({
          leafBridge: leaf,
          claimType: ClaimFormat.DEFAULT,
          monitorService,
        }),
    ).toThrow(ClaimFormatError);
  });
});

describe("OracleExecutionLayer claim format validation", () => {
  it("constructs successfully when claim format is in supported list", () => {
    const oracle = makeOracle([ClaimFormat.DEFAULT]);
    expect(
      () =>
        new OracleExecutionLayer({
          oracleImpl: oracle,
          claimType: ClaimFormat.DEFAULT,
          monitorService,
        }),
    ).not.toThrow();
  });

  it("defaults to ClaimFormat.DEFAULT and constructs when DEFAULT is supported", () => {
    const oracle = makeOracle([ClaimFormat.DEFAULT]);
    expect(
      () =>
        new OracleExecutionLayer({
          oracleImpl: oracle,
          monitorService,
        }),
    ).not.toThrow();
  });

  it("throws ClaimFormatError when claim format is not in supported list", () => {
    const oracle = makeOracle([ClaimFormat.DEFAULT]);
    expect(
      () =>
        new OracleExecutionLayer({
          oracleImpl: oracle,
          claimType: ClaimFormat.BUNGEE,
          monitorService,
        }),
    ).toThrow(ClaimFormatError);
  });

  it("throws ClaimFormatError when supported list is empty", () => {
    const oracle = makeOracle([]);
    expect(
      () =>
        new OracleExecutionLayer({
          oracleImpl: oracle,
          claimType: ClaimFormat.DEFAULT,
          monitorService,
        }),
    ).toThrow(ClaimFormatError);
  });
});
