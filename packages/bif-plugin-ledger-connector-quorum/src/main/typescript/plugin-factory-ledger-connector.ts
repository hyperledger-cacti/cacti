import { PluginFactory } from '@hyperledger-labs/bif-core-api';
import { IPluginLedgerConnectorQuorumOptions, PluginLedgerConnectorQuorum } from './plugin-ledger-connector-quorum';

export class PluginFactoryLedgerConnector extends PluginFactory<PluginLedgerConnectorQuorum, IPluginLedgerConnectorQuorumOptions> {

  async create(options: IPluginLedgerConnectorQuorumOptions): Promise<PluginLedgerConnectorQuorum> {
    return new PluginLedgerConnectorQuorum(options);
  }

}
