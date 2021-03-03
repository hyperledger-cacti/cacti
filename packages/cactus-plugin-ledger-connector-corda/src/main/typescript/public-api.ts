export {
  PluginLedgerConnectorCorda,
  IPluginLedgerConnectorCordaOptions,
} from "./plugin-ledger-connector-corda";

export * from "./generated/openapi/typescript-axios/index";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export {
  DeployContractJarsEndpoint,
  IDeployContractEndpointOptions,
} from "./web-services/deploy-contract-jars-endpoint";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
