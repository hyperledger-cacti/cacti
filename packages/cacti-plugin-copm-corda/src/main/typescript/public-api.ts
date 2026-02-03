export { PluginCopmCorda, IPluginCopmCordaOptions } from "./plugin-copm-corda";

import { IPluginFactoryOptions } from "@hyperledger-cacti/cactus-core-api";
import { PluginFactoryCopmCorda } from "./plugin-factory-copm-corda";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryCopmCorda> {
  return new PluginFactoryCopmCorda(pluginFactoryOptions);
}
