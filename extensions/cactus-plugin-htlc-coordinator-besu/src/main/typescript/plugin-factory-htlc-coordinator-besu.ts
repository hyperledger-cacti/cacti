import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";

import {
  IPluginHTLCCoordinatorBesuOptions,
  PluginHTLCCoordinatorBesu,
} from "./plugin-htlc-coordinator-besu";

export class PluginFactoryHTLCCoordinatorBesu extends PluginFactory<
  PluginHTLCCoordinatorBesu,
  IPluginHTLCCoordinatorBesuOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginHTLCCoordinatorBesuOptions,
  ): Promise<PluginHTLCCoordinatorBesu> {
    return new PluginHTLCCoordinatorBesu(pluginOptions);
  }
}
