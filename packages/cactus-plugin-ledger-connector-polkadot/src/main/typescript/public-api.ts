export * from "./generated/openapi/typescript-axios/index";

export {
  PluginLedgerConnectorPolkadot,
  IPluginLedgerConnectorPolkadotOptions,
  RunTransactionRequest,
  DeployContractInkBytecodeRequest,
  ReadStorageRequest,
  WriteStorageRequest,
} from "./plugin-ledger-connector-polkadot";
export { PluginFactoryLedgerConnectorPolkadot } from "./plugin-factory-ledger-connector-polkadot";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnectorPolkadot } from "./plugin-factory-ledger-connector-polkadot";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnectorPolkadot> {
  return new PluginFactoryLedgerConnectorPolkadot(pluginFactoryOptions);
}
