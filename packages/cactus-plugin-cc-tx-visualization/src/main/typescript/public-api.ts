export {
  CcTxVisualization,
  IPluginCcTxVisualizationOptions,
  IWebAppOptions,
} from "./plugin-cc-tx-visualization";

export { IsVisualizable } from "./models/transaction-receipt";
export * from "./generated/openapi/typescript-axios/index";

export { PluginFactoryWebService } from "./plugin-factory-cc-tx-visualization";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryWebService } from "./plugin-factory-cc-tx-visualization";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryWebService> {
  return new PluginFactoryWebService(pluginFactoryOptions);
}
