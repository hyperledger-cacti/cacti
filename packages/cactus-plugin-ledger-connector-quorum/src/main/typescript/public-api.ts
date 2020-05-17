export {
  PluginLedgerConnectorQuorum,
  IPluginLedgerConnectorQuorumOptions,
  IQuorumDeployContractOptions,
  ITransactionOptions,
} from "./plugin-ledger-connector-quorum";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";
export { Contract as Web3EthContract } from "web3-eth-contract";

import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";
export async function createPluginFactory(
  options?: any
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector();
}
