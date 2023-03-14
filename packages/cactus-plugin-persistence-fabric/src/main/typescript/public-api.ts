import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import * as OpenApiJson from "../json/openapi.json";
export { OpenApiJson };
import { PluginFactoryPersistanceFabric } from "./plugin-factory-persistence-fabric";
export { PluginFactoryPersistanceFabric } from "./plugin-factory-persistence-fabric";

export {
  PluginPersistenceFabric,
  IPluginPersistenceFabricOptions,
} from "./plugin-persistence-fabric";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryPersistanceFabric> {
  return new PluginFactoryPersistanceFabric(pluginFactoryOptions);
}
