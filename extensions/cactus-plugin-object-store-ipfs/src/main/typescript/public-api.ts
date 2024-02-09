export * from "./generated/openapi/typescript-axios/index.js";
export {
  Options,
  LikeIpfsHttpClientFile,
  LikeIpfsHttpClient,
} from "./kubo-rpc-client-types.js";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
export {
  PluginObjectStoreIpfs,
  IPluginObjectStoreIpfsOptions,
} from "./plugin-object-store-ipfs.js";
export { PluginFactoryObjectStore } from "./plugin-factory-object-store.js";

import { PluginFactoryObjectStore } from "./plugin-factory-object-store.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryObjectStore> {
  return new PluginFactoryObjectStore(pluginFactoryOptions);
}
