import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorAriesOptions,
  PluginLedgerConnectorAries,
} from "./plugin-ledger-connector-aries";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorAries,
  IPluginLedgerConnectorAriesOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorAriesOptions,
  ): Promise<PluginLedgerConnectorAries> {
    return new PluginLedgerConnectorAries(pluginOptions);
  }
}
