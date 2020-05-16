import { PluginFactory } from "@hyperledger/cactus-core-api";
import {
  IPluginKVStorageOptions,
  PluginKVStorageMemory,
} from "./plugin-kv-storage-memory";

export class PluginFactoryKVStorage extends PluginFactory<
  PluginKVStorageMemory,
  IPluginKVStorageOptions
> {
  async create(
    options: IPluginKVStorageOptions = { backend: new Map() }
  ): Promise<PluginKVStorageMemory> {
    return new PluginKVStorageMemory(options);
  }
}
