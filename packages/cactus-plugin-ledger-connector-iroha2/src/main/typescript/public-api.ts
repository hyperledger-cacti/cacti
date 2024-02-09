export {
  IPluginLedgerConnectorIroha2Options,
  PluginLedgerConnectorIroha2,
} from "./plugin-ledger-connector-iroha2.js";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export * from "./generated/openapi/typescript-axios/api.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}

export {
  Iroha2ApiClient,
  Iroha2ApiClientOptions,
} from "./api-client/iroha2-api-client.js";

export { signIrohaV2Transaction } from "./iroha-sign-utils.js";
