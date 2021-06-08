export * from "./generated/openapi/typescript-axios/index";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

import { PluginFactoryHtlcEthBesuErc20 } from "./plugin-factory-htlc-eth-besu-erc20";
export {
  PluginHtlcEthBesuErc20,
  IPluginHtlcEthBesuErc20Options,
} from "./plugin-htlc-eth-besu-erc20";

export { PluginFactoryHtlcEthBesuErc20 } from "./plugin-factory-htlc-eth-besu-erc20";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryHtlcEthBesuErc20> {
  return new PluginFactoryHtlcEthBesuErc20(pluginFactoryOptions);
}
