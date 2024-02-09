import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorCDLOptions,
  PluginLedgerConnectorCDL,
} from "./plugin-ledger-connector-cdl.js";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorCDL,
  IPluginLedgerConnectorCDLOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorCDLOptions,
  ): Promise<PluginLedgerConnectorCDL> {
    return new PluginLedgerConnectorCDL(pluginOptions);
  }
}
