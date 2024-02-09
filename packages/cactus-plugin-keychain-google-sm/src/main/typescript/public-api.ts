export * from "./generated/openapi/typescript-axios/index.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

import { PluginFactoryKeychain } from "./plugin-factory-keychain.js";
export { PluginFactoryKeychain } from "./plugin-factory-keychain.js";

export {
  IPluginKeychainGoogleSmOptions,
  PluginKeychainGoogleSm,
} from "./plugin-keychain-google-sm.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryKeychain> {
  return new PluginFactoryKeychain(pluginFactoryOptions);
}
