// Gateway Client API
export * from "./generated/gateway-client/typescript-axios";

// TODO: Should we export the gateway backend
// Gateway Backend
/*
// Exporting from the common directory
export * from './generated/proto/cacti/satp/v02/common/health_connect';
export * from './generated/proto/cacti/satp/v02/common/health_pb';

// Re-export everything except CredentialProfile to avoid conflicts
export { STATUS, MessageType, SignatureAlgorithm, LockType, Error } from './generated/proto/cacti/satp/v02/common/message_pb';
export * from './generated/proto/cacti/satp/v02/common/session_connect';
export * from './generated/proto/cacti/satp/v02/common/session_pb';

// Exporting files in the v02 directory
export * from './generated/proto/cacti/satp/v02/crash_recovery_connect';
export * from './generated/proto/cacti/satp/v02/stage_0_connect';
export * from './generated/proto/cacti/satp/v02/stage_0_pb';
export * from './generated/proto/cacti/satp/v02/stage_1_connect';
export * from './generated/proto/cacti/satp/v02/stage_1_pb';
export * from './generated/proto/cacti/satp/v02/stage_2_connect';
export * from './generated/proto/cacti/satp/v02/stage_2_pb';
export * from './generated/proto/cacti/satp/v02/stage_3_connect';
export * from './generated/proto/cacti/satp/v02/stage_3_pb';

// Exporting from the view directory
export * from './generated/proto/cacti/satp/v02/view/bungee_pb';
*/

export { SATPGateway, SATPGatewayConfig } from "./plugin-satp-hermes-gateway";
export { PluginFactorySATPGateway } from "./factory/plugin-factory-gateway-orchestrator";
