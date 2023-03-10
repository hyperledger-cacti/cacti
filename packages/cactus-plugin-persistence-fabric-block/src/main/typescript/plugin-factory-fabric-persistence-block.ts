import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginPersistenceFabricBlockOptions,
  PluginPersistenceFabricBlock,
} from "./plugin-fabric-persistence-block";

export class PluginFactoryPersistanceFabricBlocks extends PluginFactory<
  PluginPersistenceFabricBlock,
  IPluginPersistenceFabricBlockOptions,
  IPluginFactoryOptions
> {
  async create(
    pluginOptions: IPluginPersistenceFabricBlockOptions,
  ): Promise<PluginPersistenceFabricBlock> {
    return new PluginPersistenceFabricBlock(pluginOptions);
  }
}
