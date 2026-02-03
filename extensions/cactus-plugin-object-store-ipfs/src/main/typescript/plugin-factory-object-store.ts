import { IPluginFactoryOptions } from "@hyperledger-cacti/cactus-core-api";
import { PluginFactory } from "@hyperledger-cacti/cactus-core-api";

import {
  IPluginObjectStoreIpfsOptions,
  PluginObjectStoreIpfs,
} from "./plugin-object-store-ipfs";

export class PluginFactoryObjectStore extends PluginFactory<
  PluginObjectStoreIpfs,
  IPluginObjectStoreIpfsOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginObjectStoreIpfsOptions,
  ): Promise<PluginObjectStoreIpfs> {
    return new PluginObjectStoreIpfs(pluginOptions);
  }
}
