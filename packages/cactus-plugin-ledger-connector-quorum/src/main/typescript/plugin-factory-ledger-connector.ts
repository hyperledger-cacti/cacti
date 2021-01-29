import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginLedgerConnectorQuorumOptions,
  PluginLedgerConnectorQuorum,
} from "./plugin-ledger-connector-quorum";

export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorQuorum,
  IPluginLedgerConnectorQuorumOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginLedgerConnectorQuorumOptions,
  ): Promise<PluginLedgerConnectorQuorum> {
    return new PluginLedgerConnectorQuorum(pluginOptions);
  }
}
