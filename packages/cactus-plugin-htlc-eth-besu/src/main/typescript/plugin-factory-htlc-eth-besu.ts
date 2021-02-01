import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginHtlcEthBesuOptions,
  PluginHtlcEthBesu,
} from "./plugin-htlc-eth-besu";

export class PluginFactoryHtlcEthBesu extends PluginFactory<
  PluginHtlcEthBesu,
  IPluginHtlcEthBesuOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginHtlcEthBesuOptions,
  ): Promise<PluginHtlcEthBesu> {
    return new PluginHtlcEthBesu(pluginOptions);
  }
}
