import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";

import {
  IPluginLedgerConnectorPolkadotOptions,
  PluginLedgerConnectorPolkadot,
} from "./plugin-ledger-connector-polkadot";

export class PluginFactoryLedgerConnectorPolkadot extends PluginFactory<
  PluginLedgerConnectorPolkadot,
  IPluginLedgerConnectorPolkadotOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorPolkadotOptions,
  ): Promise<PluginLedgerConnectorPolkadot> {
    return new PluginLedgerConnectorPolkadot(pluginOptions);
  }
}
