export {
  E_KEYCHAIN_NOT_FOUND,
  IPluginLedgerConnectorChiaOptions,
  PluginLedgerConnectorChia,
} from "./plugin-ledger-connector-chia";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export {
  ChiaApiClient,
  ChiaApiClientOptions,
} from "./api-client/chia-api-client";

export * from "./generated/openapi/typescript-axios/api";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
