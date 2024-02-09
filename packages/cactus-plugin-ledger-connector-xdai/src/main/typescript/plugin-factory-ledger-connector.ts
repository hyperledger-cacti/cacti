import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorXdaiOptions,
  PluginLedgerConnectorXdai,
} from "./plugin-ledger-connector-xdai.js";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorXdai,
  IPluginLedgerConnectorXdaiOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorXdaiOptions,
  ): Promise<PluginLedgerConnectorXdai> {
    return new PluginLedgerConnectorXdai(pluginOptions);
  }
}
