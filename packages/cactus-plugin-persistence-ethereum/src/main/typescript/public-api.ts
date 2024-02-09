import type { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerPersistence } from "./plugin-factory-persistence-ethereum.js";

export { PluginFactoryLedgerPersistence } from "./plugin-factory-persistence-ethereum.js";
export {
  PluginPersistenceEthereum,
  IPluginPersistenceEthereumOptions,
} from "./plugin-persistence-ethereum.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerPersistence> {
  return new PluginFactoryLedgerPersistence(pluginFactoryOptions);
}
