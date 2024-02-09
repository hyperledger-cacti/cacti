import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginPersistenceEthereumOptions,
  PluginPersistenceEthereum,
} from "./plugin-persistence-ethereum.js";

export class PluginFactoryLedgerPersistence extends PluginFactory<
  PluginPersistenceEthereum,
  IPluginPersistenceEthereumOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginPersistenceEthereumOptions,
  ): Promise<PluginPersistenceEthereum> {
    return new PluginPersistenceEthereum(pluginOptions);
  }
}
