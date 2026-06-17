import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorSolanaOptions,
  PluginLedgerConnectorSolana,
} from "./plugin-ledger-connector-solana";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorSolana,
  IPluginLedgerConnectorSolanaOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorSolanaOptions,
  ): Promise<PluginLedgerConnectorSolana> {
    return new PluginLedgerConnectorSolana(pluginOptions);
  }
}
