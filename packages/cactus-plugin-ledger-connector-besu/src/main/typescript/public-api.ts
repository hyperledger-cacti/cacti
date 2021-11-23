export {
  E_KEYCHAIN_NOT_FOUND,
  IPluginLedgerConnectorBesuOptions,
  PluginLedgerConnectorBesu,
} from "./plugin-ledger-connector-besu";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export {
  BesuApiClient,
  BesuApiClientOptions,
} from "./api-client/besu-api-client";

export * from "./generated/openapi/typescript-axios/api";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
