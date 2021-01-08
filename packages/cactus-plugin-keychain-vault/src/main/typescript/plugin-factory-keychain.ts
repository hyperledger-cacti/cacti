import { v4 as uuidv4 } from "uuid";

import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginKeychainVaultOptions,
  PluginKeychainVault,
} from "./plugin-keychain-vault";

export class PluginFactoryKeychain extends PluginFactory<
  PluginKeychainVault,
  IPluginKeychainVaultOptions,
  IPluginFactoryOptions
> {
  async create(
    options: IPluginKeychainVaultOptions = {
      backend: new Map(),
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      logLevel: "TRACE",
    }
  ): Promise<PluginKeychainVault> {
    return new PluginKeychainVault(options);
  }
}
