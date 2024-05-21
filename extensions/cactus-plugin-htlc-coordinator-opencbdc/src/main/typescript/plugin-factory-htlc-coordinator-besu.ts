import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";

import {
  IPluginHTLCCoordinatorOpenCBDCOptions,
  PluginHTLCCoordinatorOpenCBDC,
} from "./plugin-htlc-coordinator-opencbdc";

export class PluginFactoryHTLCCoordinatorOpenCBDC extends PluginFactory<
  PluginHTLCCoordinatorOpenCBDC,
  IPluginHTLCCoordinatorOpenCBDCOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginHTLCCoordinatorOpenCBDCOptions,
  ): Promise<PluginHTLCCoordinatorOpenCBDC> {
    return new PluginHTLCCoordinatorOpenCBDC(pluginOptions);
  }
}
