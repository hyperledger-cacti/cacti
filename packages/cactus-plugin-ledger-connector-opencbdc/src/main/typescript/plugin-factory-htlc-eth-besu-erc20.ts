import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginHtlcEthBesuErc20Options,
  PluginHtlcEthBesuErc20,
} from "./plugin-htlc-eth-besu-erc20";

export class PluginFactoryHtlcEthBesuErc20 extends PluginFactory<
  PluginHtlcEthBesuErc20,
  IPluginHtlcEthBesuErc20Options,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginHtlcEthBesuErc20Options,
  ): Promise<PluginHtlcEthBesuErc20> {
    return new PluginHtlcEthBesuErc20(pluginOptions);
  }
}
