export {
  E_KEYCHAIN_NOT_FOUND,
  IPluginLedgerConnectorIrohaOptions,
  PluginLedgerConnectorIroha,
} from "./plugin-ledger-connector-iroha";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export {
  IrohaApiClient,
  IrohaApiClientOptions,
} from "./api-client/iroha-api-client";

export * from "./generated/openapi/typescript-axios/api";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
