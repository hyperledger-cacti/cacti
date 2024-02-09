import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorEthereumOptions,
  PluginLedgerConnectorEthereum,
} from "./plugin-ledger-connector-ethereum.js";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorEthereum,
  IPluginLedgerConnectorEthereumOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorEthereumOptions,
  ): Promise<PluginLedgerConnectorEthereum> {
    return new PluginLedgerConnectorEthereum(pluginOptions);
  }
}
