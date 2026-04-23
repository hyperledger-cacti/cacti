import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger-cacti/cactus-core-api";
import {
  IPluginLedgerConnectorStellarOptions,
  PluginLedgerConnectorStellar,
} from "./plugin-ledger-connector-stellar";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorStellar,
  IPluginLedgerConnectorStellarOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorStellarOptions,
  ): Promise<PluginLedgerConnectorStellar> {
    return new PluginLedgerConnectorStellar(pluginOptions);
  }
}
