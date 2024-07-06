import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import * as OpenApiJson from "../json/openapi.json";
export { OpenApiJson };
import { PluginFactoryPersistenceFabric } from "./plugin-factory-persistence-fabric";
export { PluginFactoryPersistenceFabric } from "./plugin-factory-persistence-fabric";

export {
  PluginPersistenceFabric,
  IPluginPersistenceFabricOptions,
} from "./plugin-persistence-fabric";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryPersistenceFabric> {
  return new PluginFactoryPersistenceFabric(pluginFactoryOptions);
}
