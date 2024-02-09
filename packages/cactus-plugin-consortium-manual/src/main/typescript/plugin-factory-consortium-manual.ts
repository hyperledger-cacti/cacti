import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginConsortiumManualOptions,
  PluginConsortiumManual,
} from "./plugin-consortium-manual.js";

export class PluginFactoryWebService extends PluginFactory<
  PluginConsortiumManual,
  IPluginConsortiumManualOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginConsortiumManualOptions,
  ): Promise<PluginConsortiumManual> {
    return new PluginConsortiumManual(pluginOptions);
  }
}
