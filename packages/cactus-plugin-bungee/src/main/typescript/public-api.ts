import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryBUNGEE } from "./plugin-factory-bungee";

export { PluginBUNGEE, IPluginBUNGEEOptions } from "./plugin-bungee";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryBUNGEE> {
  return new PluginFactoryBUNGEE(pluginFactoryOptions);
}
