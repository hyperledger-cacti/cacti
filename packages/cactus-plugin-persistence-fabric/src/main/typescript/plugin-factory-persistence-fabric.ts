import {
  IPluginFactoryOptions,
  PluginFactory,
} from "@hyperledger/cactus-core-api";
import {
  IPluginPersistenceFabricOptions,
  PluginPersistenceFabric,
} from "./plugin-persistence-fabric";

export class PluginFactoryLedgerPersistence extends PluginFactory<
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
