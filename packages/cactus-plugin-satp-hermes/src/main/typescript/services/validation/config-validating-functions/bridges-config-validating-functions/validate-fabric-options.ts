import {
  ConnectionProfile,
  ConnectionProfileClient,
  DefaultEventHandlerStrategy,
  FabricSigningCredentialType,
  GatewayDiscoveryOptions,
  GatewayEventHandlerOptions,
  IPluginLedgerConnectorFabricOptions,
  IVaultConfig,
  IWebSocketConfig,
  SignPayloadCallback,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { isFabricSigningCredentialType } from "./validate-fabric-config";

interface ConfigJSON {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

export interface FabricOptionsJSON {
  instanceId: string;
  peerBinary: string;
  dockerBinary?: string;
  goBinary?: string;
  cliContainerGoPath?: string;
  cliContainerEnv: NodeJS.ProcessEnv;
  sshConfig: ConfigJSON;
  readonly sshDebugOn?: boolean;
  connectionProfile: ConnectionProfile;
  discoveryOptions?: GatewayDiscoveryOptions;
  eventHandlerOptions?: GatewayEventHandlerOptions;
  supportedIdentity?: FabricSigningCredentialType[];
  vaultConfig?: IVaultConfig;
  webSocketConfig?: IWebSocketConfig;
  signCallback?: SignPayloadCallback;
}

// Type guard for NodeJS.ProcessEnv
function isProcessEnv(obj: unknown): obj is NodeJS.ProcessEnv {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj).every(
      (key) =>
        typeof objRecord[key] === "string" ||
        typeof objRecord[key] === "undefined",
    ) &&
    (!("TZ" in obj) || typeof objRecord.TZ === "string")
  );
}

// Type guard for ConfigJSON
function isSSHConfig(obj: unknown): obj is ConfigJSON {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "host" in obj &&
    typeof objRecord.host === "string" &&
    "port" in obj &&
    typeof objRecord.port === "number" &&
    "username" in obj &&
    typeof objRecord.username === "string" &&
    "privateKey" in obj &&
    typeof objRecord.privateKey === "string"
  );
}

// Type guard for ConnectionProfileClient
function isConnectionProfileClient(
  obj: unknown,
): obj is ConnectionProfileClient {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    (!("organization" in obj) || typeof objRecord.organization === "object")
  );
}

// Type guard for ConnectionProfile
export function isConnectionProfile(obj: unknown): obj is ConnectionProfile {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "name" in obj &&
    typeof objRecord.name === "string" &&
    "version" in obj &&
    typeof objRecord.version === "string" &&
    "organizations" in obj &&
    typeof objRecord.organizations === "object" &&
    "peers" in obj &&
    typeof objRecord.peers === "object" &&
    (!("x-type" in obj) || typeof objRecord["x-type"] === "string") &&
    (!("description" in obj) || typeof objRecord.description === "string") &&
    (!("client" in obj) || isConnectionProfileClient(objRecord.client)) &&
    (!("channels" in obj) || typeof objRecord.channels === "object") &&
    (!("orderers" in obj) || typeof objRecord.orderers === "object") &&
    (!("certificateAuthorities" in obj) ||
      typeof objRecord.certificateAuthorities === "object")
  );
}

// Type guard for GatewayDiscoveryOptions
function isGatewayDiscoveryOptions(
  obj: unknown,
): obj is GatewayDiscoveryOptions {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    (!("asLocalhost" in obj) || typeof objRecord.asLocalhost === "boolean") &&
    (!("enabled" in obj) || typeof objRecord.enabled === "boolean")
  );
}

// Type guard for DefaultEventHandlerStrategy
function isDefaultEventHandlerStrategy(
  obj: unknown,
): obj is DefaultEventHandlerStrategy {
  return (
    obj !== null &&
    typeof obj === "string" &&
    (obj === DefaultEventHandlerStrategy.MspidScopeAllfortx ||
      obj === DefaultEventHandlerStrategy.MspidScopeAnyfortx ||
      obj === DefaultEventHandlerStrategy.NetworkScopeAllfortx ||
      obj === DefaultEventHandlerStrategy.NetworkScopeAnyfortx)
  );
}

// Type guard for GatewayEventHandlerOptions
function isGatewayEventHandlerOptions(
  obj: unknown,
): obj is GatewayEventHandlerOptions {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "strategy" in obj &&
    isDefaultEventHandlerStrategy(objRecord.strategy) &&
    (!("commitTimeout" in obj) ||
      typeof objRecord.commitTimeout === "number") &&
    (!("endorseTimeout" in obj) || typeof objRecord.endorseTimeout === "number")
  );
}

// Type guard for IVaultConfig
function isIVaultConfig(obj: unknown): obj is IVaultConfig {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    (!("endpoint" in obj) || typeof objRecord.endpoint === "string") &&
    (!("transitEngineMountPath" in obj) ||
      typeof objRecord.transitEngineMountPath === "string")
  );
}

// Type guard for IWebSocketConfig
function isIWebSocketConfig(obj: unknown): obj is IWebSocketConfig {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    (!("endpoint" in obj) || typeof objRecord.endpoint === "string") &&
    (!("pathPrefix" in obj) || typeof objRecord.pathPrefix === "string") &&
    (!("strictSSL" in obj) || typeof objRecord.strictSSL === "boolean")
  );
}

// Type guard for SignPayloadCallback
function isSignPayloadCallback(obj: unknown): obj is SignPayloadCallback {
  return (
    typeof obj === "function" &&
    // Check if the function accepts exactly two parameters:
    obj.length === 2 &&
    // Check if the function returns a promise
    (obj as (...args: unknown[]) => unknown)(Buffer.alloc(0), {}) instanceof
      Promise
  );
}

// Type guard for FabricOptionsJSON
export function isFabricOptionsJSON(obj: unknown): obj is FabricOptionsJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "peerBinary" in obj &&
    typeof objRecord.peerBinary === "string" &&
    (!("dockerBinary" in obj) || typeof objRecord.dockerBinary === "string") &&
    (!("goBinary" in obj) || typeof objRecord.goBinary === "string") &&
    (!("cliContainerGoPath" in obj) ||
      typeof objRecord.cliContainerGoPath === "string") &&
    "cliContainerEnv" in obj &&
    isProcessEnv(objRecord.cliContainerEnv) &&
    "sshConfig" in obj &&
    isSSHConfig(obj.sshConfig) &&
    (!("sshDebugOn" in obj) || typeof objRecord.sshDebugOn === "boolean") &&
    (!("discoveryOptions" in obj) ||
      isGatewayDiscoveryOptions(objRecord.discoveryOptions)) &&
    (!("eventHandlerOptions" in obj) ||
      isGatewayEventHandlerOptions(objRecord.eventHandlerOptions)) &&
    (!("supportedIdentity" in obj) ||
      isFabricSigningCredentialType(objRecord.supportedIdentity)) &&
    (!("vaultConfig" in obj) || isIVaultConfig(objRecord.vaultConfig)) &&
    (!("webSocketConfig" in obj) ||
      isIWebSocketConfig(objRecord.webSocketConfig)) &&
    (!("signCallback" in obj) || isSignPayloadCallback(objRecord.signCallback))
  );
}

// Function to create IPluginLedgerConnectorFabricOptions from FabricOptionsJSON
export function createFabricOptions(
  options: FabricOptionsJSON,
): Partial<IPluginLedgerConnectorFabricOptions> {
  if (!options) {
    throw new TypeError(
      "Invalid options in FabricConfig: " + JSON.stringify(options),
    );
  }

  const fabricOptions: Partial<IPluginLedgerConnectorFabricOptions> = {
    instanceId: options.instanceId,
    peerBinary: options.peerBinary,
    dockerBinary: options.dockerBinary,
    goBinary: options.goBinary,
    cliContainerGoPath: options.cliContainerGoPath,
    cliContainerEnv: options.cliContainerEnv,
    sshConfig: {
      host: options.sshConfig.host,
      port: options.sshConfig.port,
      privateKey: options.sshConfig.privateKey,
      username: options.sshConfig.username,
    },
    sshDebugOn: options.sshDebugOn,
    connectionProfile: options.connectionProfile,
    discoveryOptions: options.discoveryOptions,
    eventHandlerOptions: options.eventHandlerOptions,
    supportedIdentity: options.supportedIdentity,
    vaultConfig: options.vaultConfig,
    webSocketConfig: options.webSocketConfig,
    signCallback: options.signCallback,
  };

  return fabricOptions;
}
