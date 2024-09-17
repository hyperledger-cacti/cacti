import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryCopmFabric } from "./plugin-factory-copm-fabric";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryCopmFabric> {
  return new PluginFactoryCopmFabric(pluginFactoryOptions);
}
export { PluginCopmFabric } from "./plugin-copm-fabric";
export { FabricConfiguration } from "./lib/fabric-configuration";
export { FabricTransactionContextFactory } from "./lib/fabric-context-factory";
export { FabricContractContext } from "./lib/fabric-types";
