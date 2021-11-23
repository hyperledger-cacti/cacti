import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
} from "./plugin-ledger-connector-besu";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorBesu,
  IPluginLedgerConnectorBesuOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorBesuOptions,
  ): Promise<PluginLedgerConnectorBesu> {
    return new PluginLedgerConnectorBesu(pluginOptions);
  }
}
