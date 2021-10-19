export * from "./generated/openapi/typescript-axios/index";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
export {
  IPluginHTLCCoordinatorBesuOptions,
  PluginHTLCCoordinatorBesu,
} from "./plugin-htlc-coordinator-besu";

export { PluginFactoryHTLCCoordinatorBesu } from "./plugin-factory-htlc-coordinator-besu";
import { PluginFactoryHTLCCoordinatorBesu } from "./plugin-factory-htlc-coordinator-besu";

export * from "./generated/openapi/typescript-axios/index";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryHTLCCoordinatorBesu> {
  return new PluginFactoryHTLCCoordinatorBesu(pluginFactoryOptions);
}
