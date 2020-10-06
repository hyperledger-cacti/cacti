import { PluginFactory } from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorFabricOptions,
  PluginLedgerConnectorFabric,
} from "./plugin-ledger-connector-fabric";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorFabric,
  IPluginLedgerConnectorFabricOptions
> {
  async create(
    options: IPluginLedgerConnectorFabricOptions
  ): Promise<PluginLedgerConnectorFabric> {
    return new PluginLedgerConnectorFabric(options);
  }
}
