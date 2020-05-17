export { PluginKeychainMemory } from "./plugin-keychain-memory";
export { PluginFactoryKeychain } from "./plugin-factory-keychain";

import { PluginFactoryKeychain } from "./plugin-factory-keychain";

export async function createPluginFactory(
  options?: any
): Promise<PluginFactoryKeychain> {
  return new PluginFactoryKeychain();
}
