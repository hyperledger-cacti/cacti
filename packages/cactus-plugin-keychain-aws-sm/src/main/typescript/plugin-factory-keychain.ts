import { v4 as uuidv4 } from "uuid";
import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";

import {
  AwsCredentialType,
  IPluginKeychainAwsSmOptions,
  PluginKeychainAwsSm,
} from "./plugin-keychain-aws-sm";

export class PluginFactoryKeychain extends PluginFactory<
  PluginKeychainAwsSm,
  IPluginKeychainAwsSmOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginKeychainAwsSmOptions = {
      instanceId: uuidv4(),
      keychainId: uuidv4(),
      logLevel: "TRACE",
      awsProfile: "",
      awsRegion: "",
      awsEndpoint: "",
      awsCredentialType: AwsCredentialType.InMemory,
    },
  ): Promise<PluginKeychainAwsSm> {
    return new PluginKeychainAwsSm(pluginOptions);
  }
}
