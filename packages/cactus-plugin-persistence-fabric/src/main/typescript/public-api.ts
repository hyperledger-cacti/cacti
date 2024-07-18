import type { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryLedgerPersistence } from "./plugin-factory-persistence-fabric";

export { PluginFactoryLedgerPersistence } from "./plugin-factory-persistence-fabric";
export {
  PluginPersistenceFabric,
  IPluginPersistenceFabricOptions,
} from "./plugin-persistence-fabric";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryLedgerPersistence> {
  return new PluginFactoryLedgerPersistence(pluginFactoryOptions);
}
