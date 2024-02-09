export * from "./generated/openapi/typescript-axios/index.js";

export {
  PluginLedgerConnectorQuorum,
  IPluginLedgerConnectorQuorumOptions,
} from "./plugin-ledger-connector-quorum.js";

export * from "./model-type-guards.js";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export {
  QuorumApiClient,
  QuorumApiClientOptions,
  QuorumRequestInputWeb3EthMethod,
  QuorumRequestInputWeb3EthContractMethod,
  QuorumRequestInputContract,
  QuorumRequestInputMethod,
  QuorumRequestInputArgs,
} from "./api-client/quorum-api-client.js";

export * from "./generated/openapi/typescript-axios/api.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
