import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginPersistenceFabricOptions,
  PluginPersistenceFabric,
} from "./plugin-fabric-persistence-block";

export class PluginFactoryPersistanceFabricBlocks extends PluginFactory<
  PluginPersistenceFabric,
  IPluginPersistenceFabricOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginPersistenceFabricOptions,
  ): Promise<PluginPersistenceFabric> {
    return new PluginPersistenceFabric(pluginOptions);
  }
}
