import { Checks } from "@hyperledger/cactus-common";
import {
  IPluginFactoryOptions,
  IPluginKeychain,
  PluginFactory,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  Configuration,
  DefaultApi,
} from "./generated/openapi/typescript-axios";

import {
  IPluginKeychainVaultOptions,
  PluginKeychainVault,
} from "./plugin-keychain-vault";

import { PluginKeychainVaultRemoteAdapter } from "./plugin-keychain-vault-remote-adapter";

export class PluginFactoryKeychain extends PluginFactory<
  IPluginKeychain,
  IPluginKeychainVaultOptions,
  IPluginFactoryOptions
> {
  async create(options: any): Promise<IPluginKeychain> {
    const fnTag = "PluginFactoryKeychain#create()";

    const { pluginImportType } = this.options;
    Checks.truthy(options, `${fnTag}:options`);

    switch (pluginImportType) {
      case PluginImportType.Local: {
        return new PluginKeychainVault(options);
      }
      case PluginImportType.Remote: {
        const { remoteConfig } = options;
        Checks.truthy(remoteConfig, `${fnTag}:options.remoteConfig`);
        Checks.truthy(remoteConfig.basePath, `${fnTag}:remoteConfig.basePath`);
        const configuration: Configuration = options.remoteConfig;
        const backend = new DefaultApi(configuration);
        const optionsDecorated = { ...options, backend };
        return new PluginKeychainVaultRemoteAdapter(optionsDecorated);
      }
      default: {
        throw new Error(`${fnTag} No PluginImportType: ${pluginImportType}`);
      }
    }
  }
}
