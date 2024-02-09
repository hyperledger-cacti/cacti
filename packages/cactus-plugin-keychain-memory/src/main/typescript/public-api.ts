export * from "./generated/openapi/typescript-axios/index.js";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

export {
  PluginKeychainMemory,
  IPluginKeychainMemoryOptions,
} from "./plugin-keychain-memory.js";
export { PluginFactoryKeychain } from "./plugin-factory-keychain.js";

import { PluginFactoryKeychain } from "./plugin-factory-keychain.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryKeychain> {
  return new PluginFactoryKeychain(pluginFactoryOptions);
}
