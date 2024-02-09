export {
  E_KEYCHAIN_NOT_FOUND,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
} from "./plugin-ledger-connector-besu.js";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export {
  BesuApiClient,
  BesuApiClientOptions,
} from "./api-client/besu-api-client.js";

export * from "./generated/openapi/typescript-axios/api.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
