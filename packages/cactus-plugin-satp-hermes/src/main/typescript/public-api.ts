export * from "./generated/openapi/typescript-axios/index";

export {
  IPluginSatpGatewayConstructorOptions,
  PluginSATPGateway,
  SatpMessageType,
  IKeyPair,
} from "./plugin-satp-gateway";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryFabricSATPGateway } from "./factory/plugin-factory-fabric-satp-gateway";
import { PluginFactoryBesuSATPGateway } from "./factory/plugin-factory-besu-satp-gateway";
import { fileURLToPath } from "url";

export async function createFabricPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryFabricSATPGateway> {
  return new PluginFactoryFabricSATPGateway(pluginFactoryOptions);
}

export async function createBesuPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryBesuSATPGateway> {
  return new PluginFactoryBesuSATPGateway(pluginFactoryOptions);
}

export { ServerGatewayHelper } from "./core/server-helper";
export { ClientGatewayHelper } from "./core/client-helper";
// TODO! export new gateway
