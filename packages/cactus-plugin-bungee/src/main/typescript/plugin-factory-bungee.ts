import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import { IPluginBUNGEEOptions, PluginBUNGEE } from "./plugin-bungee";
export class PluginFactoryBUNGEE extends PluginFactory<
  PluginBUNGEE,
  IPluginBUNGEEOptions,
  IPluginFactoryOptions
> {
  async create(pluginOptions: IPluginBUNGEEOptions): Promise<PluginBUNGEE> {
    return new PluginBUNGEE(pluginOptions);
  }
}
