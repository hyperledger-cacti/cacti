import type { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerPersistence } from "./plugin-factory-persistence-ethereum";

export { PluginFactoryLedgerPersistence } from "./plugin-factory-persistence-ethereum";
export {
  PluginPersistenceEthereum,
  IPluginPersistenceEthereumOptions,
} from "./plugin-persistence-ethereum";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerPersistence> {
  return new PluginFactoryLedgerPersistence(pluginFactoryOptions);
}
