import "jest-extended";
import { validateSatpCounterPartyGateways } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-counter-party-gateways";
import type {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { LoggerProvider } from "@hyperledger/cactus-common";

describe("validateSatpCounterPartyGateways", () => {
  const logger = LoggerProvider.getOrCreate({
    level: "DEBUG",
    label: "SATP-Gateway",
  });
  it("should pass with valid gateways", () => {
    const validGatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway1",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: "EthereumLedgerTestNetwork",
          ledgerType: "ETHEREUM",
        },
      ],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
    } as GatewayIdentity;
    const result = validateSatpCounterPartyGateways(
      {
        configValue: [validGatewayIdentity],
      },
      logger,
    );
    expect(result).toEqual([validGatewayIdentity]);
  });

  it("should throw if input is not an array", () => {
    const validGatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway1",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: "EthereumLedgerTestNetwork",
          ledgerType: "ETHEREUM",
        },
      ],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
    } as GatewayIdentity;
    expect(() =>
      validateSatpCounterPartyGateways(
        {
          configValue: validGatewayIdentity,
        },
        logger,
      ),
    ).toThrowError(
      `Invalid config.counterPartyGateways: ${JSON.stringify(validGatewayIdentity)}`,
    );
  });

  it("should throw if input is not a valid GatewayIdentity", () => {
    const validGatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway1",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: "EthereumLedgerTestNetwork",
          ledgerType: "ETHEREUM",
        },
      ],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: "3010",
      gatewayClientPort: 3011,
    };
    expect(() =>
      validateSatpCounterPartyGateways(
        {
          configValue: [validGatewayIdentity],
        },
        logger,
      ),
    ).toThrowError(
      `Invalid config.counterPartyGateways: ${JSON.stringify([validGatewayIdentity])}`,
    );
  });
});
