export * from "./generated/openapi/typescript-axios/index";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

export {
  PluginKeychainMemory,
  IPluginKeychainMemoryOptions,
} from "./plugin-keychain-memory";
export { PluginFactoryKeychain } from "./plugin-factory-keychain";

import { PluginFactoryKeychain } from "./plugin-factory-keychain";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryKeychain> {
  return new PluginFactoryKeychain(pluginFactoryOptions);
}

export { IKeychainMemoryCrpcSvcOpenApiOptions } from "./crpc-services/keychain-memory-crpc-svc-openapi";
export { KeychainMemoryCrpcSvcOpenApi } from "./crpc-services/keychain-memory-crpc-svc-openapi";

export { DefaultService } from "./generated/crpc/services/default_service_connect";

export { DeleteKeychainEntryRequestV1PB } from "./generated/crpc/models/delete_keychain_entry_request_v1_pb_pb";
export { DeleteKeychainEntryResponseV1PB } from "./generated/crpc/models/delete_keychain_entry_response_v1_pb_pb";

export { GetKeychainEntryRequestV1PB } from "./generated/crpc/models/get_keychain_entry_request_v1_pb_pb";
export { GetKeychainEntryResponseV1PB } from "./generated/crpc/models/get_keychain_entry_response_v1_pb_pb";

export { HasKeychainEntryRequestV1PB } from "./generated/crpc/models/has_keychain_entry_request_v1_pb_pb";
export { HasKeychainEntryResponseV1PB } from "./generated/crpc/models/has_keychain_entry_response_v1_pb_pb";

export { SetKeychainEntryRequestV1PB } from "./generated/crpc/models/set_keychain_entry_request_v1_pb_pb";
export { SetKeychainEntryResponseV1PB } from "./generated/crpc/models/set_keychain_entry_response_v1_pb_pb";

export { DeleteKeychainEntryV1Request } from "./generated/crpc/services/default_service_pb";
export { GetKeychainEntryV1Request } from "./generated/crpc/services/default_service_pb";
export { GetPrometheusMetricsV1Response } from "./generated/crpc/services/default_service_pb";
export { HasKeychainEntryV1Request } from "./generated/crpc/services/default_service_pb";
export { SetKeychainEntryV1Request } from "./generated/crpc/services/default_service_pb";
