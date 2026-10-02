import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger-cacti/cactus-core-api";

import {
  IPluginLedgerConnectorCantonOptions,
  PluginLedgerConnectorCanton,
} from "./plugin-ledger-connector-canton";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorCanton,
  IPluginLedgerConnectorCantonOptions,
  IPluginFactoryOptions
> {
  public async create(
    pluginOptions: IPluginLedgerConnectorCantonOptions,
  ): Promise<PluginLedgerConnectorCanton> {
    return new PluginLedgerConnectorCanton(pluginOptions);
  }
}
