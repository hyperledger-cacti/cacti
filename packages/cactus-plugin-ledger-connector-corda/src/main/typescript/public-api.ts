export {
  PluginLedgerConnectorCorda,
  IPluginLedgerConnectorCordaOptions,
  ICordaDeployContractOptions,
  ITransactionOptions,
} from "./plugin-ledger-connector-corda";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";
export { Contract as Web3EthContract } from "web3-eth-contract";

import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";
export async function createPluginFactory(
  options?: any
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector();
}
