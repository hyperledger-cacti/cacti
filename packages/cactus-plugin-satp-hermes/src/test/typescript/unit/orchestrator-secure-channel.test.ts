/**
 * Unit tests for the gateway orchestrator's client-side secure-channel
 * enforcement.
 *
 * Verifies the SATP draft-16 Section 5.4.2 secure-channel requirement on the
 * *outbound* side: a gateway with TLS enabled must not open plain-HTTP
 * channels to counterparty gateways (the local gateway's loopback
 * self-channel is exempt). Complements `validate-tls-config.test.ts`, which
 * covers the inbound/server side.
 */
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";
import {
  GatewayOrchestrator,
  assertCounterpartyTransportSecurity,
  type IGatewayOrchestratorOptions,
} from "../../../main/typescript/services/gateway/gateway-orchestrator";
import { SecureChannelRequiredError } from "../../../main/typescript/core/errors/satp-errors";
import type { IGatewayTlsConfig } from "../../../main/typescript/services/validation/config-validating-functions/validate-tls-config";
import type {
  Address,
  GatewayIdentity,
  DraftVersions,
} from "../../../main/typescript/core/types";
import type { JsObjectSigner } from "@hyperledger-cacti/cactus-common";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();

const CERT = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----";
const KEY = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----";

const TLS_ENABLED: IGatewayTlsConfig = {
  enabled: true,
  cert: CERT,
  key: KEY,
  minVersion: "TLSv1.3",
};

const DRAFT_VERSIONS: DraftVersions[] = [
  { Core: "v13", Architecture: "v09", Crash: "v06" },
];

const localGateway: GatewayIdentity = {
  id: "local-gateway",
  name: "LocalGateway",
  version: DRAFT_VERSIONS,
  address: "https://localhost",
  gatewayServerPort: 3010,
  gatewayClientPort: 3011,
  gatewayOapiPort: 4010,
  connectedDLTs: [],
};

function counterparty(address: Address): GatewayIdentity {
  return {
    id: "remote-gateway",
    name: "RemoteGateway",
    version: DRAFT_VERSIONS,
    address,
    gatewayServerPort: 3110,
    gatewayClientPort: 3111,
    gatewayOapiPort: 4110,
    connectedDLTs: [],
  };
}

function orchestratorOptions(
  counterpartyIdentity: GatewayIdentity,
  tls?: IGatewayTlsConfig,
): IGatewayOrchestratorOptions {
  return {
    logLevel: "silent",
    localGateway,
    counterPartyGateways: [counterpartyIdentity],
    signer: {} as JsObjectSigner,
    enableCrashRecovery: false,
    monitorService,
    tls,
  };
}

describe("assertCounterpartyTransportSecurity", () => {
  it("rejects an http:// counterparty when TLS is enabled", () => {
    expect(() =>
      assertCounterpartyTransportSecurity(
        counterparty("http://remote.example.com"),
        localGateway.id,
        TLS_ENABLED,
      ),
    ).toThrow(SecureChannelRequiredError);
  });

  it("accepts an https:// counterparty when TLS is enabled", () => {
    expect(() =>
      assertCounterpartyTransportSecurity(
        counterparty("https://remote.example.com"),
        localGateway.id,
        TLS_ENABLED,
      ),
    ).not.toThrow();
  });

  it("does not enforce when TLS is disabled", () => {
    expect(() =>
      assertCounterpartyTransportSecurity(
        counterparty("http://remote.example.com"),
        localGateway.id,
        undefined,
      ),
    ).not.toThrow();
    expect(() =>
      assertCounterpartyTransportSecurity(
        counterparty("http://remote.example.com"),
        localGateway.id,
        { enabled: false },
      ),
    ).not.toThrow();
  });

  it("exempts the local gateway's loopback self-channel", () => {
    expect(() =>
      assertCounterpartyTransportSecurity(
        { ...localGateway, address: "http://localhost" },
        localGateway.id,
        TLS_ENABLED,
      ),
    ).not.toThrow();
  });

  it("rejects a counterparty with an unset address when TLS is enabled", () => {
    expect(() =>
      assertCounterpartyTransportSecurity(
        { ...counterparty("https://remote.example.com"), address: undefined },
        localGateway.id,
        TLS_ENABLED,
      ),
    ).toThrow(SecureChannelRequiredError);
  });
});

describe("GatewayOrchestrator — secure channel enforcement on startup", () => {
  it("warns and skips an http:// counterparty when TLS is enabled (no channel is opened)", () => {
    // TODO(security): until startup-time TLS verification exists, a violation
    // only logs a warning and the channel is skipped — the gateway still
    // starts, but no unencrypted channel is registered to the counterparty.
    const orchestrator = new GatewayOrchestrator(
      orchestratorOptions(
        counterparty("http://remote.example.com"),
        TLS_ENABLED,
      ),
    );
    expect(orchestrator.alreadyConnected("remote-gateway")).toBe(false);
  });

  it("constructs channels to an https:// counterparty when TLS is enabled", () => {
    const orchestrator = new GatewayOrchestrator(
      orchestratorOptions(
        counterparty("https://remote.example.com"),
        TLS_ENABLED,
      ),
    );
    expect(orchestrator.alreadyConnected("remote-gateway")).toBe(true);
  });

  it("constructs channels to an http:// counterparty when TLS is disabled (dev unchanged)", () => {
    const orchestrator = new GatewayOrchestrator(
      orchestratorOptions(counterparty("http://remote.example.com"), undefined),
    );
    expect(orchestrator.alreadyConnected("remote-gateway")).toBe(true);
  });
});
