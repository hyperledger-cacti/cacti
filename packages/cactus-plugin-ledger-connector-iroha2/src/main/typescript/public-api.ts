export {
  IPluginLedgerConnectorIroha2Options,
  PluginLedgerConnectorIroha2,
} from "./plugin-ledger-connector-iroha2";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export * from "./generated/openapi/typescript-axios/api";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}

export {
  Iroha2ApiClient,
  Iroha2ApiClientOptions,
} from "./api-client/iroha2-api-client";

export { signIrohaV2Transaction } from "./iroha-sign-utils";
