export {
  PluginLedgerConnectorCorda,
  IPluginLedgerConnectorCordaOptions,
} from "./plugin-ledger-connector-corda.js";

export * from "./generated/openapi/typescript-axios/index.js";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export {
  DeployContractJarsEndpoint,
  IDeployContractEndpointOptions,
} from "./web-services/deploy-contract-jars-endpoint.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}

export {
  CordaApiClient,
  CordaApiClientOptions,
  watchBlocksV1Options,
} from "./api-client/corda-api-client.js";
