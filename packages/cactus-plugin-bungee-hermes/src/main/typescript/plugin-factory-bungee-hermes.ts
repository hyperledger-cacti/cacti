import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginBungeeHermesOptions,
  PluginBungeeHermes,
} from "./plugin-bungee-hermes";
export class PluginFactoryBungeeHermes extends PluginFactory<
  PluginBungeeHermes,
  IPluginBungeeHermesOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginBungeeHermesOptions,
  ): Promise<PluginBungeeHermes> {
    return new PluginBungeeHermes(pluginOptions);
  }
}
