import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorSawtoothOptions,
  PluginLedgerConnectorSawtooth,
} from "./plugin-ledger-connector-sawtooth.js";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorSawtooth,
  IPluginLedgerConnectorSawtoothOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorSawtoothOptions,
  ): Promise<PluginLedgerConnectorSawtooth> {
    return new PluginLedgerConnectorSawtooth(pluginOptions);
  }
}
