import { Checks } from "@hyperledger/cactus-common";
import {
  IPluginFactoryOptions,
  IPluginKeychain,
  PluginFactory,
  PluginImportType,
} from "@hyperledger/cactus-core-api";

import {
  IPluginKeychainAwsSmOptions,
  PluginKeychainAwsSm,
} from "./plugin-keychain-aws-sm";

export class PluginFactoryKeychain extends PluginFactory<
  IPluginKeychain,
  IPluginKeychainAwsSmOptions,
  IPluginFactoryOptions
> {
  async create(options: any): Promise<IPluginKeychain> {
    const fnTag = "PluginFactoryKeychain#create()";

    const { pluginImportType } = this.options;
    Checks.truthy(options, `${fnTag}:options`);

    if (pluginImportType === PluginImportType.Local) {
      return new PluginKeychainAwsSm(options);
    } else {
      throw new Error(`${fnTag} No PluginImportType: ${pluginImportType}`);
    }
  }
}
