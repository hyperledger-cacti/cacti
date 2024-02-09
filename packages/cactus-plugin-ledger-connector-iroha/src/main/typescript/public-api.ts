export {
  E_KEYCHAIN_NOT_FOUND,
  IPluginLedgerConnectorIrohaOptions,
  PluginLedgerConnectorIroha,
} from "./plugin-ledger-connector-iroha.js";

export { signIrohaTransaction } from "./iroha-sign-utils.js";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export {
  IrohaApiClient,
  IrohaApiClientOptions,
} from "./api-client/iroha-api-client.js";

export * from "./generated/openapi/typescript-axios/api.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
