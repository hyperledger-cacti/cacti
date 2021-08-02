import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginCcTxVisualizationOptions,
  CcTxVisualization,
} from "./plugin-cc-tx-visualization";

export class PluginFactoryWebService extends PluginFactory<
  CcTxVisualization,
  IPluginCcTxVisualizationOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginCcTxVisualizationOptions,
  ): Promise<CcTxVisualization> {
    return new CcTxVisualization(pluginOptions);
  }
}
