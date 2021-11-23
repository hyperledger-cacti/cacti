import * as HashTimeLockJson from "../solidity/contracts/HashTimeLock.json";
export { HashTimeLockJson };

export * from "./generated/openapi/typescript-axios/index";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

import { PluginFactoryHtlcEthBesu } from "./plugin-factory-htlc-eth-besu";
export {
  PluginHtlcEthBesu,
  IPluginHtlcEthBesuOptions,
} from "./plugin-htlc-eth-besu";
export { PluginFactoryHtlcEthBesu } from "./plugin-factory-htlc-eth-besu";
export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryHtlcEthBesu> {
  return new PluginFactoryHtlcEthBesu(pluginFactoryOptions);
}
