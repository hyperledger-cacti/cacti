import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";

export {
  PluginLedgerConnectorSawtooth,
  IPluginLedgerConnectorSawtoothOptions,
} from "./plugin-ledger-connector-sawtooth";

import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export * from "./types/model-type-guards";
export * from "./generated/openapi/typescript-axios";
export {
  SawtoothApiClient,
  SawtoothApiClientOptions,
} from "./api-client/sawtooth-api-client";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
