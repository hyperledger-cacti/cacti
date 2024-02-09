export * from "./generated/openapi/typescript-axios/index.js";

export {
  IPluginSatpGatewayConstructorOptions,
  PluginSatpGateway,
  SatpMessageType,
  IKeyPair,
} from "./gateway/plugin-satp-gateway.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryFabricSatpGateway } from "./gateway/plugin-factory-fabric-satp-gateway.js";
import { PluginFactoryBesuSatpGateway } from "./gateway/plugin-factory-besu-satp-gateway.js";

export async function createFabricPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryFabricSatpGateway> {
  return new PluginFactoryFabricSatpGateway(pluginFactoryOptions);
}

export async function createBesuPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryBesuSatpGateway> {
  return new PluginFactoryBesuSatpGateway(pluginFactoryOptions);
}

export { ServerGatewayHelper } from "./gateway/server/server-helper.js";
export { ClientGatewayHelper } from "./gateway/client/client-helper.js";
