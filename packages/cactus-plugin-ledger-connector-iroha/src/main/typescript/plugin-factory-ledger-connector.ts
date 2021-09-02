import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorIrohaOptions,
  PluginLedgerConnectorIroha,
} from "./plugin-ledger-connector-iroha";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorIroha,
  IPluginLedgerConnectorIrohaOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorIrohaOptions,
  ): Promise<PluginLedgerConnectorIroha> {
    return new PluginLedgerConnectorIroha(pluginOptions);
  }
}
