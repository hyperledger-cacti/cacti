import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorChiaOptions,
  PluginLedgerConnectorChia,
} from "./plugin-ledger-connector-chia";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorChia,
  IPluginLedgerConnectorChiaOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorChiaOptions,
  ): Promise<PluginLedgerConnectorChia> {
    return new PluginLedgerConnectorChia(pluginOptions);
  }
}
