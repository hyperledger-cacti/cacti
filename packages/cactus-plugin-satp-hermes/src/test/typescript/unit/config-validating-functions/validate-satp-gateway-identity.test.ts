import "jest-extended";
import { validateSatpGatewayIdentity } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-gateway-identity";
import {
  type Address,
  type GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";

describe("validateSatpGatewayIdentity", () => {
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
      publicKey: "0xdef456",
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    } as GatewayIdentity;
    const result = validateSatpGatewayIdentity({
      configValue: validGatewayIdentity,
    });
    expect(result).toEqual(validGatewayIdentity);
  });

  it("should throw if the Gateway Id is not a string", () => {
    const invalidGatewayIdentity = {
      id: 123,
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
      publicKey: "0xdef456",
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    };
    expect(() =>
      validateSatpGatewayIdentity({
        configValue: invalidGatewayIdentity,
      }),
    ).toThrowError(
      `Invalid config.gid: ${JSON.stringify(invalidGatewayIdentity)}`,
    );
  });

  it("should throw if is missing the Gateway Id", () => {
    const invalidGatewayIdentity = {
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
      publicKey: "0xdef456",
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    };
    expect(() =>
      validateSatpGatewayIdentity({
        configValue: invalidGatewayIdentity,
      }),
    ).toThrowError(
      `Invalid config.gid: ${JSON.stringify(invalidGatewayIdentity)}`,
    );
  });

  it("should throw if is missing the Gateway version", () => {
    const invalidGatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway1",
      connectedDLTs: [
        {
          id: "EthereumLedgerTestNetwork",
          ledgerType: "ETHEREUM",
        },
      ],
      publicKey: "0xdef456",
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    };
    expect(() =>
      validateSatpGatewayIdentity({
        configValue: invalidGatewayIdentity,
      }),
    ).toThrowError(
      `Invalid config.gid: ${JSON.stringify(invalidGatewayIdentity)}`,
    );
  });

  it("should throw if the Gateway version is not a array", () => {
    const invalidGatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway1",
      version: {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
      connectedDLTs: [
        {
          id: "EthereumLedgerTestNetwork",
          ledgerType: "ETHEREUM",
        },
      ],
      publicKey: "0xdef456",
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    };
    expect(() =>
      validateSatpGatewayIdentity({
        configValue: invalidGatewayIdentity,
      }),
    ).toThrowError(
      `Invalid config.gid: ${JSON.stringify(invalidGatewayIdentity)}`,
    );
  });

  it("should throw if the Gateway DraftVersions is not a string", () => {
    const invalidGatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway1",
      version: [
        {
          Core: 123,
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
      publicKey: "0xdef456",
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    };
    expect(() =>
      validateSatpGatewayIdentity({
        configValue: invalidGatewayIdentity,
      }),
    ).toThrowError(
      `Invalid config.gid: ${JSON.stringify(invalidGatewayIdentity)}`,
    );
  });

  it("should throw if the Gateway connectedDLTs is not a array", () => {
    const invalidGatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway1",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: {
        id: "EthereumLedgerTestNetwork",
        ledgerType: "ETHEREUM",
      },
      publicKey: "0xdef456",
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    };
    expect(() =>
      validateSatpGatewayIdentity({
        configValue: invalidGatewayIdentity,
      }),
    ).toThrowError(
      `Invalid config.gid: ${JSON.stringify(invalidGatewayIdentity)}`,
    );
  });

  it("should throw if the Gateway connectedDLTs Id is not a string", () => {
    const invalidGatewayIdentity = {
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
          id: 123,
          ledgerType: "ETHEREUM",
        },
      ],
      publicKey: "0xdef456",
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    };
    expect(() =>
      validateSatpGatewayIdentity({
        configValue: invalidGatewayIdentity,
      }),
    ).toThrowError(
      `Invalid config.gid: ${JSON.stringify(invalidGatewayIdentity)}`,
    );
  });

  it("should throw if the Gateway connectedDLTs ledgerType is not a LedgerType", () => {
    const invalidGatewayIdentity = {
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
          id: 123,
          ledgerType: "TEST",
        },
      ],
      publicKey: "0xdef456",
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    };
    expect(() =>
      validateSatpGatewayIdentity({
        configValue: invalidGatewayIdentity,
      }),
    ).toThrowError(
      `Invalid config.gid: ${JSON.stringify(invalidGatewayIdentity)}`,
    );
  });
});
