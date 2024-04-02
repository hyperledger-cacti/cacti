export * from "./generated/openapi/typescript-axios";

export {
  PluginLedgerConnectorEthereum,
  IPluginLedgerConnectorEthereumOptions,
  RunTransactionV1Exchange,
} from "./plugin-ledger-connector-ethereum";

export * from "./sign-utils";

export * from "./types/model-type-guards";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export {
  EthereumApiClient,
  EthereumApiClientOptions,
  EthereumRequestInputWeb3EthMethod,
  EthereumRequestInputWeb3EthContractMethod,
  EthereumRequestInputContract,
  EthereumRequestInputMethod,
  EthereumRequestInputArgs,
} from "./api-client/ethereum-api-client";

export * from "./generated/openapi/typescript-axios/api";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
