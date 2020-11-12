import { v4 as uuidv4 } from "uuid";

import { PluginFactory } from "@hyperledger/cactus-core-api";
import {
  IPluginKeychainOptions,
  PluginKeychainMemory,
} from "./plugin-keychain-memory";

export class PluginFactoryKeychain extends PluginFactory<
  PluginKeychainMemory,
  IPluginKeychainOptions
> {
  async create(
    options: IPluginKeychainOptions = {
      backend: new Map(),
      instanceId: uuidv4(),
    }
  ): Promise<PluginKeychainMemory> {
    return new PluginKeychainMemory(options);
  }
}
