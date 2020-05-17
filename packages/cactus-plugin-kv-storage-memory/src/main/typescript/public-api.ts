export { PluginKVStorageMemory } from "./plugin-kv-storage-memory";
export { PluginFactoryKVStorage } from "./plugin-factory-kv-storage";

import { PluginFactoryKVStorage } from "./plugin-factory-kv-storage";

export async function createPluginFactory(
  options?: any
): Promise<PluginFactoryKVStorage> {
  return new PluginFactoryKVStorage();
}
