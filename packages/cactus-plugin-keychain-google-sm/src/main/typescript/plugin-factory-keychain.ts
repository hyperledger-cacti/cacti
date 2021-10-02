import { v4 as uuidv4 } from "uuid";
import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";

import {
  IPluginKeychainGoogleSmOptions,
  PluginKeychainGoogleSm,
} from "./plugin-keychain-google-sm";

export class PluginFactoryKeychain extends PluginFactory<
  PluginKeychainGoogleSm,
  IPluginKeychainGoogleSmOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginKeychainGoogleSmOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      logLevel: "TRACE",
    },
  ): Promise<PluginKeychainGoogleSm> {
    return new PluginKeychainGoogleSm(pluginOptions);
  }
}
