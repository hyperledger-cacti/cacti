import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import * as OpenApiJson from "../json/openapi.json";
export { OpenApiJson };
import { PluginFactoryPersistanceFabric } from "./plugin-factory-persistence-fabric.js";
export { PluginFactoryPersistanceFabric } from "./plugin-factory-persistence-fabric.js";

export {
  PluginPersistenceFabric,
  IPluginPersistenceFabricOptions,
} from "./plugin-persistence-fabric.js";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryPersistanceFabric> {
  return new PluginFactoryPersistanceFabric(pluginFactoryOptions);
}
