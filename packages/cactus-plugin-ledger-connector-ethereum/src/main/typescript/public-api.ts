export * from "./generated/openapi/typescript-axios/index.js";

export {
  PluginLedgerConnectorEthereum,
  IPluginLedgerConnectorEthereumOptions,
} from "./plugin-ledger-connector-ethereum.js";

export * from "./sign-utils.js";

export * from "./types/model-type-guards.js";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export {
  EthereumApiClient,
  EthereumApiClientOptions,
  EthereumRequestInputWeb3EthMethod,
  EthereumRequestInputWeb3EthContractMethod,
  EthereumRequestInputContract,
  EthereumRequestInputMethod,
  EthereumRequestInputArgs,
} from "./api-client/ethereum-api-client.js";

export * from "./generated/openapi/typescript-axios/api.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
