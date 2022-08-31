import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorIroha2Options,
  PluginLedgerConnectorIroha2,
} from "./plugin-ledger-connector-iroha2";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorIroha2,
  IPluginLedgerConnectorIroha2Options,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorIroha2Options,
  ): Promise<PluginLedgerConnectorIroha2> {
    return new PluginLedgerConnectorIroha2(pluginOptions);
  }
}
