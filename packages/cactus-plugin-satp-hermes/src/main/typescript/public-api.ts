// Gateway Client API
export * from "./generated/gateway-client/typescript-axios";

// TODO: Should we export the gateway backend
export { ClaimFormat } from "./generated/proto/cacti/satp/v02/common/message_pb";
export { IBesuLeafNeworkOptions } from "./cross-chain-mechanisms/bridge/leafs/besu-leaf";
export { SATPGateway, SATPGatewayConfig } from "./plugin-satp-hermes-gateway";
export { PluginFactorySATPGateway } from "./factory/plugin-factory-gateway-orchestrator";
export { INetworkOptions } from "./cross-chain-mechanisms/bridge/bridge-types";
export {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  DEFAULT_PORT_GATEWAY_OAPI,
} from "./core/constants";
export { GatewayIdentity } from "./core/types";

export {
  TargetOrganization,
  FabricConfigJSON,
} from "./services/validation/config-validating-functions/bridges-config-validating-functions/validate-fabric-config";
