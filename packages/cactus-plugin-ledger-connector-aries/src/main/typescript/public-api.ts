export * from "./generated/openapi/typescript-axios";

export {
  PluginLedgerConnectorAries,
  IPluginLedgerConnectorAriesOptions,
} from "./plugin-ledger-connector-aries";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export {
  AriesApiClient,
  AriesApiClientOptions,
} from "./api-client/aries-api-client";

export * from "./generated/openapi/typescript-axios/api";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
