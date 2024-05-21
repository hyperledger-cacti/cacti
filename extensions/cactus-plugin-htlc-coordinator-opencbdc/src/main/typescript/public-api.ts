export * from "./generated/openapi/typescript-axios/index";
import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
export {
  IPluginHTLCCoordinatorOpenCBDCOptions,
  PluginHTLCCoordinatorOpenCBDC,
} from "./plugin-htlc-coordinator-opencbdc";

export { PluginFactoryHTLCCoordinatorOpenCBDC } from "./plugin-factory-htlc-coordinator-opencbdc";
import { PluginFactoryHTLCCoordinatorOpenCBDC } from "./plugin-factory-htlc-coordinator-opencbdc";

export * from "./generated/openapi/typescript-axios/index";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryHTLCCoordinatorOpenCBDC> {
  return new PluginFactoryHTLCCoordinatorOpenCBDC(pluginFactoryOptions);
}
