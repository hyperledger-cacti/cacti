import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import * as OpenApiJson from "../json/openapi.json";
export { OpenApiJson };
import { PluginFactoryPersistanceFabricBlocks } from "./plugin-factory-fabric-persistence-block";
export { PluginFactoryPersistanceFabricBlocks } from "./plugin-factory-fabric-persistence-block";

export {
  PluginPersistenceFabric,
  IPluginPersistenceFabricOptions,
} from "./plugin-persistence-fabric";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryPersistanceFabricBlocks> {
  return new PluginFactoryPersistanceFabricBlocks(pluginFactoryOptions);
}