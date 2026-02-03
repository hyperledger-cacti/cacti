import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger-cacti/cactus-core-api";
import {
  IPluginConsortiumStaticOptions,
  PluginConsortiumStatic,
} from "./plugin-consortium-static";

export class PluginFactoryWebService extends PluginFactory<
  PluginConsortiumStatic,
  IPluginConsortiumStaticOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginConsortiumStaticOptions,
  ): Promise<PluginConsortiumStatic> {
    return new PluginConsortiumStatic(pluginOptions);
  }
}
