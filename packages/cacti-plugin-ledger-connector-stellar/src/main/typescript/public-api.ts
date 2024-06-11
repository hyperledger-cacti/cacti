export {
  E_KEYCHAIN_NOT_FOUND,
  IPluginLedgerConnectorStellarOptions,
  PluginLedgerConnectorStellar,
} from "./plugin-ledger-connector-stellar";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export {
  StellarApiClient,
  StellarApiClientOptions,
} from "./api-client/stellar-api-client";

export * from "./generated/openapi/typescript-axios/api";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
