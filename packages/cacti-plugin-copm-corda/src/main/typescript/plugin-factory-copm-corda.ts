import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger-cacti/cactus-core-api";

import { IPluginCopmCordaOptions, PluginCopmCorda } from "./plugin-copm-corda";

export class PluginFactoryCopmCorda extends PluginFactory<
  PluginCopmCorda,
  IPluginCopmCordaOptions,
  IPluginFactoryOptions
> {
  async create(options: IPluginCopmCordaOptions): Promise<PluginCopmCorda> {
    return new PluginCopmCorda(options);
  }
}
