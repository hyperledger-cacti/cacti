import { v4 as uuidv4 } from "uuid";
import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";

import {
  IPluginKeychainAzureKvOptions,
  PluginKeychainAzureKv,
} from "./plugin-keychain-azure-kv";

export class PluginFactoryKeychain extends PluginFactory<
  PluginKeychainAzureKv,
  IPluginKeychainAzureKvOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginKeychainAzureKvOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      azureEndpoint: "",
      logLevel: "TRACE",
    },
  ): Promise<PluginKeychainAzureKv> {
    return new PluginKeychainAzureKv(pluginOptions);
  }
}
