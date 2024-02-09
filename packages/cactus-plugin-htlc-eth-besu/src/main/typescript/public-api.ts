import * as HashTimeLockJson from "../solidity/contracts/HashTimeLock.json";
export { HashTimeLockJson };

export * from "./generated/openapi/typescript-axios/index.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

import { PluginFactoryHtlcEthBesu } from "./plugin-factory-htlc-eth-besu.js";
export {
  PluginHtlcEthBesu,
  IPluginHtlcEthBesuOptions,
} from "./plugin-htlc-eth-besu.js";
export { PluginFactoryHtlcEthBesu } from "./plugin-factory-htlc-eth-besu.js";
export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryHtlcEthBesu> {
  return new PluginFactoryHtlcEthBesu(pluginFactoryOptions);
}
