import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";

import {
  IPluginLedgerConnectorStubOptions,
  PluginLedgerConnectorStub,
} from "./plugin-ledger-connector-stub";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorStub,
  IPluginLedgerConnectorStubOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorStubOptions,
  ): Promise<PluginLedgerConnectorStub> {
    return new PluginLedgerConnectorStub(pluginOptions);
  }
}
