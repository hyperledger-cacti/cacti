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
    options: IPluginKeychainOptions = { backend: new Map() }
  ): Promise<PluginKeychainMemory> {
    return new PluginKeychainMemory(options);
  }
}
