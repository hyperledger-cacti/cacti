import "jest-extended";
import { validateSatpGatewayIdentity } from "../../../../main/typescript/services/validation/config-validating-functions/validate-satp-gateway-identity";
import {
  type Address,
  type GatewayIdentity,
  GatewayCredential,
  SupportedSigningAlgorithms,
} from "../../../../main/typescript/core/types";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { LoggerProvider } from "@hyperledger-cacti/cactus-common";

describe("validateSatpGatewayIdentity", () => {
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
      credentials: {
        [GatewayCredential.CLAIM_SIGNATURE]: {
          purpose: GatewayCredential.CLAIM_SIGNATURE,
          algorithm: SupportedSigningAlgorithms.SECP256K1,
          publicKey: "0xdef456",
        },
      },
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
      gatewayUIPort: 3012,
    } as GatewayIdentity;
    const result = validateSatpGatewayIdentity(
      {
        configValue: validGatewayIdentity,
      },
      logger,
    );
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
      validateSatpGatewayIdentity(
        {
          configValue: invalidGatewayIdentity,
        },
        logger,
      ),
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
      validateSatpGatewayIdentity(
        {
          configValue: invalidGatewayIdentity,
        },
        logger,
      ),
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
      validateSatpGatewayIdentity(
        {
          configValue: invalidGatewayIdentity,
        },
        logger,
      ),
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
      validateSatpGatewayIdentity(
        {
          configValue: invalidGatewayIdentity,
        },
        logger,
      ),
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
      validateSatpGatewayIdentity(
        {
          configValue: invalidGatewayIdentity,
        },
        logger,
      ),
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
      validateSatpGatewayIdentity(
        {
          configValue: invalidGatewayIdentity,
        },
        logger,
      ),
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
      validateSatpGatewayIdentity(
        {
          configValue: invalidGatewayIdentity,
        },
        logger,
      ),
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
      validateSatpGatewayIdentity(
        {
          configValue: invalidGatewayIdentity,
        },
        logger,
      ),
    ).toThrowError(
      `Invalid config.gid: ${JSON.stringify(invalidGatewayIdentity)}`,
    );
  });

  describe("purpose-aware key material validation", () => {
    function makeIdentity(keys: unknown): Record<string, unknown> {
      return {
        id: "mockID",
        name: "CustomGateway",
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        keys,
        address: "http://localhost" as Address,
      };
    }

    it("accepts a hex CLAIM_SIGNATURE key and a JWK ENVELOPE_SIGNATURE key", () => {
      const identity = makeIdentity({
        [GatewayCredential.CLAIM_SIGNATURE]: {
          purpose: GatewayCredential.CLAIM_SIGNATURE,
          algorithm: SupportedSigningAlgorithms.SECP256K1,
          publicKey: "0xdef456",
        },
        [GatewayCredential.ENVELOPE_SIGNATURE]: {
          purpose: GatewayCredential.ENVELOPE_SIGNATURE,
          algorithm: SupportedSigningAlgorithms.ES256,
          publicKey: { kty: "EC", crv: "P-256", x: "abc", y: "def" },
        },
      });
      expect(() =>
        validateSatpGatewayIdentity({ configValue: identity }, logger),
      ).not.toThrow();
    });

    it("rejects a string ENVELOPE_SIGNATURE key (must be a JWK object)", () => {
      const identity = makeIdentity({
        [GatewayCredential.ENVELOPE_SIGNATURE]: {
          purpose: GatewayCredential.ENVELOPE_SIGNATURE,
          algorithm: SupportedSigningAlgorithms.ES256,
          publicKey: "pem-or-hex-that-would-fail-importKey",
        },
      });
      expect(() =>
        validateSatpGatewayIdentity({ configValue: identity }, logger),
      ).toThrow();
    });

    it("rejects an empty CLAIM_SIGNATURE key material", () => {
      const identity = makeIdentity({
        [GatewayCredential.CLAIM_SIGNATURE]: {
          purpose: GatewayCredential.CLAIM_SIGNATURE,
          algorithm: SupportedSigningAlgorithms.SECP256K1,
          publicKey: "",
        },
      });
      expect(() =>
        validateSatpGatewayIdentity({ configValue: identity }, logger),
      ).toThrow();
    });

    it("rejects an object CLAIM_SIGNATURE key material (must be a hex string)", () => {
      const identity = makeIdentity({
        [GatewayCredential.CLAIM_SIGNATURE]: {
          purpose: GatewayCredential.CLAIM_SIGNATURE,
          algorithm: SupportedSigningAlgorithms.SECP256K1,
          publicKey: { notHex: true },
        },
      });
      expect(() =>
        validateSatpGatewayIdentity({ configValue: identity }, logger),
      ).toThrow();
    });
  });
});
