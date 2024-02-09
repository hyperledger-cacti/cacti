export * from "./generated/openapi/typescript-axios/index.js";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
export {
  IPluginHTLCCoordinatorBesuOptions,
  PluginHTLCCoordinatorBesu,
} from "./plugin-htlc-coordinator-besu.js";

export { PluginFactoryHTLCCoordinatorBesu } from "./plugin-factory-htlc-coordinator-besu.js";
import { PluginFactoryHTLCCoordinatorBesu } from "./plugin-factory-htlc-coordinator-besu.js";

export * from "./generated/openapi/typescript-axios/index.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryHTLCCoordinatorBesu> {
  return new PluginFactoryHTLCCoordinatorBesu(pluginFactoryOptions);
}
