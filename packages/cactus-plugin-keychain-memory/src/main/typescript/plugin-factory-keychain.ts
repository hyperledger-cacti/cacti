import { v4 as uuidv4 } from "uuid";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactory } from "@hyperledger/cactus-core-api";

import {
  IPluginKeychainMemoryOptions,
  PluginKeychainMemory,
} from "./plugin-keychain-memory";

export class PluginFactoryKeychain extends PluginFactory<
  PluginKeychainMemory,
  IPluginKeychainMemoryOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginKeychainMemoryOptions = {
      backend: new Map(),
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      logLevel: "TRACE",
    },
  ): Promise<PluginKeychainMemory> {
    return new PluginKeychainMemory(pluginOptions);
  }
}
