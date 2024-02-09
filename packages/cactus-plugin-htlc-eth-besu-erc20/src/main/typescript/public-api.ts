export * from "./generated/openapi/typescript-axios/index.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

import { PluginFactoryHtlcEthBesuErc20 } from "./plugin-factory-htlc-eth-besu-erc20.js";
export {
  PluginHtlcEthBesuErc20,
  IPluginHtlcEthBesuErc20Options,
} from "./plugin-htlc-eth-besu-erc20.js";

export { PluginFactoryHtlcEthBesuErc20 } from "./plugin-factory-htlc-eth-besu-erc20.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryHtlcEthBesuErc20> {
  return new PluginFactoryHtlcEthBesuErc20(pluginFactoryOptions);
}
