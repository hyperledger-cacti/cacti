export * from "./generated/openapi/typescript-axios/index.js";

export {
  PluginLedgerConnectorCDL,
  IPluginLedgerConnectorCDLOptions,
} from "./plugin-ledger-connector-cdl.js";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector.js";

export * from "./generated/openapi/typescript-axios/api.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
