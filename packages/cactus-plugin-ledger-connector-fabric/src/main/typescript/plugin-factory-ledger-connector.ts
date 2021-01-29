import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
} from "./plugin-ledger-connector-fabric";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorFabric,
  IPluginLedgerConnectorFabricOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorFabricOptions,
  ): Promise<PluginLedgerConnectorFabric> {
    return new PluginLedgerConnectorFabric(pluginOptions);
  }
}
