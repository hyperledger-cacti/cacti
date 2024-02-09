export * from "./generated/openapi/typescript-axios/index.js";

export {
  PluginLedgerConnectorAries,
  IPluginLedgerConnectorAriesOptions,
} from "./plugin-ledger-connector-aries.js";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export {
  AriesApiClient,
  AriesApiClientOptions,
} from "./api-client/aries-api-client.js";

export * from "./generated/openapi/typescript-axios/api.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
