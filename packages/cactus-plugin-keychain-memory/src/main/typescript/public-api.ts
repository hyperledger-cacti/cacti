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
