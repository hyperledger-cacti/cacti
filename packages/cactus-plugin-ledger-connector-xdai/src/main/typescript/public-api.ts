export {
  E_KEYCHAIN_NOT_FOUND,
  IPluginLedgerConnectorXdaiOptions,
  PluginLedgerConnectorXdai,
} from "./plugin-ledger-connector-xdai";
export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export * from "./generated/openapi/typescript-axios/index";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
