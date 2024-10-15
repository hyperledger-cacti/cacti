import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactory } from "@hyperledger/cactus-core-api";

import {
  IPluginCopmFabricOptions,
  PluginCopmFabric,
} from "./plugin-copm-fabric";

export class PluginFactoryCopmFabric extends PluginFactory<
  PluginCopmFabric,
  IPluginCopmFabricOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginCopmFabricOptions,
  ): Promise<PluginCopmFabric> {
    return new PluginCopmFabric(pluginOptions);
  }
}
