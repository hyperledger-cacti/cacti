export * from "./generated/openapi/typescript-axios/index";

export {
  IPluginSatpGatewayConstructorOptions,
  PluginSatpGateway,
  SatpMessageType,
  IKeyPair,
} from "./gateway/plugin-satp-gateway";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryFabricSatpGateway } from "./gateway/plugin-factory-fabric-satp-gateway";
import { PluginFactoryBesuSatpGateway } from "./gateway/plugin-factory-besu-satp-gateway";

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

export { ServerGatewayHelper } from "./gateway/server/server-helper";
export { ClientGatewayHelper } from "./gateway/client/client-helper";
