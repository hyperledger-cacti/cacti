import { Checks } from "@hyperledger/cactus-common";
import {
  IPluginFactoryOptions,
  IPluginKeychain,
  PluginFactory,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  IPluginKeychainAzureKvOptions,
  PluginKeychainAzureKv,
} from "./plugin-keychain-azure-kv";

export class PluginFactoryKeychain extends PluginFactory<
  IPluginKeychain,
  IPluginKeychainAzureKvOptions,
  IPluginFactoryOptions
> {
  async create(options: any): Promise<IPluginKeychain> {
    const fnTag = "PluginFactoryKeychain#create()";

    const { pluginImportType } = this.options;
    Checks.truthy(options, `${fnTag}:options`);
    if (pluginImportType === PluginImportType.Local) {
      return new PluginKeychainAzureKv(options);
    } else {
      throw new Error(`${fnTag} No PluginImportType: ${pluginImportType}`);
    }
  }
}
