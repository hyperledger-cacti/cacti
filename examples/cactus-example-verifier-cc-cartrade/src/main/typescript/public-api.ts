export {
  IPluginBusinessLogicCartradeOptions,
  PluginBusinessLogicCartrade,
} from "./plugin-business-logic-cartrade";

export { PluginFactoryLedgerConnector } from "./plugin-factory-business-logic";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerConnector } from "./plugin-factory-business-logic";

export {
  BesuApiClient,
  BesuApiClientOptions,
} from "./api-client/besu-api-client";

export * from "./generated/openapi/typescript-axios/api";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerConnector> {
  return new PluginFactoryLedgerConnector(pluginFactoryOptions);
}
