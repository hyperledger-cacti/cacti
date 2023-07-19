//export * from "./generated/openapi/index";
export * from "../typescript/generated/openapi/typescript-axios/index";
export {
  PluginLedgerConnectorTcsHuawei,
  IPluginLedgerConnectorTcsHuaweiOptions,
} from "./plugin-ledger-connector-tcs-huawei";

export { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-ledger-connector";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
