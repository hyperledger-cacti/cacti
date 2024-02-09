export {
  E_KEYCHAIN_NOT_FOUND,
  IPluginLedgerConnectorXdaiOptions,
  PluginLedgerConnectorXdai,
} from "./plugin-ledger-connector-xdai.js";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export * from "./generated/openapi/typescript-axios/index.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
