import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

export {
  PluginLedgerConnectorSawtooth,
  IPluginLedgerConnectorSawtoothOptions,
} from "./plugin-ledger-connector-sawtooth.js";

import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export * from "./types/model-type-guards.js";
export * from "./generated/openapi/typescript-axios/index.js";
export {
  SawtoothApiClient,
  SawtoothApiClientOptions,
} from "./api-client/sawtooth-api-client.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
